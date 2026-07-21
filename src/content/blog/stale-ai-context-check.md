---
title: "AI memory가 stale인지 판정하는 법: TTL과 무효화 사건"
description: "TTL과 event invalidation으로 lifecycle stale을 판정하고, 현재 요청 충돌은 작업별 application disposition으로 분리하는 방법을 설명합니다."
pubDate: 2026-07-06T01:50:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/diagrams/stale-ai-context-check.svg"
---

memory가 오래됐다는 사실과 현재 판단에 쓸 수 없다는 사실은 같지 않다. 몇 달 전의 “credential을 기록하지 않는다”는 원칙은 여전히 유효할 수 있다. 반대로 10분 전에 통과한 build 결과도 그 뒤 source가 바뀌었다면 이미 stale하다.

따라서 stale 판정에는 두 종류의 시계가 필요하다. 일정 시간이 지나면 다시 보게 하는 **TTL**과, 상태를 바꾼 사건이 생기면 즉시 무효화하는 **event invalidation**이다. 둘이 memory와 현재 source의 충돌을 해결하는 방식은 다르다.

이 글의 사례는 모두 공개 설명용 합성 기록이다. 특정 memory 제품이나 실제 작업 상태를 설명하지 않는다.

<figure>
	<img src="/blog/blog-images/stale-ai-context-check.svg" alt="오래된 기억을 현재 요청, 실제 파일, 최신 검증과 대조한 뒤 stale 여부를 판정하는 흐름" />
	<figcaption>이 그림은 실제 memory 시스템 구조가 아니라, 기억을 현재 source와 대조하는 개념도다.</figcaption>
</figure>

## stale lifecycle과 현재 작업 미적용은 다르다

memory record를 확인할 때는 두 축을 나눈다. 첫 번째는 record 자체의 근거가 아직 유효한지 보는 lifecycle 축이다.

```text
state: 기록 뒤 실제 source를 바꾼 사건이 없었는가?
proof: 기록이 요구하는 최신 검증이 아직 유효한가?
truth: 현재 source가 기록의 사실 가정을 지지하는가?
```

이 축에서 TTL이 만료됐거나 source 무효화·반박이 확인되면 `promoted → reverify`로 이동한다. 재확인에 성공하면 `promoted`, 근거가 실제로 깨졌다면 명시적 reason과 함께 `held`로 간다. canonical lifecycle state는 `candidate`, `review`, `promoted`, `held`, `reverify` 다섯 개뿐이다.

두 번째는 그 record를 이번 task에 적용할 수 있는지 보는 application 축이다.

```text
scope: 같은 종류의 task와 대상에 관한 기록인가?
authority: 현재 요청의 명시 범위와 충돌하지 않는가?
```

scope mismatch나 현재 요청 충돌은 record 자체를 stale로 만들지 않는다. 유효한 record라면 lifecycle은 `promoted`로 두고 `applicationDisposition.applied: false`와 `notAppliedReason`만 남긴다. 다른 task에서는 다시 쓸 수 있기 때문이다.

## TTL은 시간을 기준으로 재확인 시점을 만든다

TTL은 `verifiedAt + duration`이 지나면 record를 재확인 대상으로 바꾼다.

```json
{
  "id": "preference:default-renderer",
  "verifiedAt": "2026-07-01T09:00:00Z",
  "ttlDays": 30
}
```

장점은 단순함이다. 외부 정책, 가격, 도구 버전처럼 언젠가 바뀔 가능성이 높은 정보를 일정 주기로 다시 보게 할 수 있다. 어떤 변경 사건을 모두 알 수 없을 때도 최소한의 상한을 둔다.

약점도 분명하다.

- TTL 안에서 상태가 바뀌면 만료일까지 잘못된 기록을 쓸 수 있다.
- 안정적인 원칙에 짧은 TTL을 붙이면 의미 없는 재검토가 반복된다.
- `30일`이라는 숫자만으로 실제 변화 가능성을 설명할 수 없다.

TTL은 “이때까지 참”이라는 보증이 아니라 “늦어도 이때 다시 확인”이라는 예약에 가깝다.

## event invalidation은 상태 변화가 일어난 순간 작동한다

event invalidation은 record가 의존하는 전제가 바뀌는 사건을 적는다.

```json
{
  "id": "verification:last-build-result",
  "verifiedAt": "2026-07-21T08:00:00Z",
  "invalidatedBy": [
    "source_file_changed",
    "build_config_changed",
    "runtime_version_changed"
  ]
}
```

이 record는 10분밖에 지나지 않았어도 source file이 바뀌면 stale하다. 반대로 사건이 없고 source가 같다면 짧은 시간 동안은 같은 검증 결과를 참고할 수 있다.

event 방식의 약점은 감지 범위다. `dependency_lock_changed`를 목록에서 빠뜨렸거나 event 수집 자체가 멈추면, 실제 변화가 있어도 record가 current로 남는다. event 목록이 완전하다는 가정을 해서는 안 된다.

## TTL과 event를 경쟁시키지 않는다

두 방식은 서로 대체재가 아니라 다른 실패를 막는다.

| 조건 | TTL | event invalidation | 판정 |
|---|---|---|---|
| TTL 이내, 변경 사건 없음 | 통과 | 통과 | 다른 source gate까지 확인 |
| TTL 이내, 변경 사건 발생 | 통과 | 실패 | 즉시 stale |
| TTL 만료, 변경 사건 없음 | 실패 | 통과 | 재검증 필요 |
| TTL 없음, 안정 원칙, source 무효화 없음 | 해당 없음 | 통과 | 나이만으로 폐기하지 않음 |
| TTL 이내, event 감지 누락 의심 | 통과 | 불확실 | 실제 source를 직접 확인 |

보수적인 결합은 `TTL 만료 OR invalidation event 발생`이면 재검증하는 것이다. 둘 다 통과해도 실제 source가 memory와 충돌하면 source가 이긴다.

## current request와 source proof는 역할이 다르다

“무엇을 해야 하는가”와 “현재 무엇이 사실인가”를 같은 precedence 표에 넣으면 혼란스럽다.

### 행동과 범위의 authority

```text
1. 현재 요청의 명시적 목표·금지·범위
2. 현재 작업에 적용되는 안전·권한 규칙
3. scope가 맞는 memory default
4. 넓은 과거 선호나 추정
```

현재 요청이 “수정하지 말고 상태만 알려 달라”고 하면 과거의 자동 수정 default는 적용하지 않는다. 다만 현재 요청도 기존에 허용되지 않은 위험 행동의 권한을 자동으로 만들지는 않는다.

### 현재 상태의 evidence

```text
1. 실제 파일·현재 runtime·공식 source
2. 같은 scope에서 방금 실행한 최신 검증
3. 최신 검증이 참조한 generated output
4. memory에 남은 과거 상태와 요약
```

현재 파일이 memory와 다르면 파일을 따른다. 최신 검증도 source 변경 뒤에는 무효다. memory는 무엇을 확인할지 알려줄 수 있지만 현재 사실의 source proof가 되지 않는다.

## 충돌을 발견했을 때의 판정 순서

memory와 현재 신호가 다르면 다음 여섯 단계로 처리한다.

1. **충돌 종류를 분류한다.** 현재 요청의 행동 범위인지, 현재 상태의 사실인지, 안전·권한 규칙인지 나눈다.
2. **application scope를 비교한다.** 같은 task·대상이 아니면 이번 판단에서 제외하되 lifecycle은 바꾸지 않는다.
3. **현재 요청을 다시 읽는다.** 명시 목표와 금지사항이 과거 default보다 우선하며, 충돌하면 task별 미적용 이유를 남긴다.
4. **실제 source를 확인한다.** 파일, runtime, 공식 문서가 record의 근거를 무효화하거나 반박하면 lifecycle을 `reverify`로 바꾼다.
5. **검증을 새로 실행한다.** source가 바뀌었거나 기존 proof 범위가 다르면 이전 결과를 재사용하지 않는다.
6. **두 축의 상태와 이유를 남긴다.** lifecycle은 다섯 canonical state 중 하나로, `refuted` 같은 판정은 `evidenceStatus`로, 현재 task 적용 여부는 `applicationDisposition`으로 기록한다.

```json
{
  "memoryId": "verification:last-build-result",
  "lifecycleState": "reverify",
  "evidenceStatus": "stale",
  "reason": "source_file_changed_after_verification",
  "applicationDisposition": {
    "applied": false,
    "notAppliedReason": "record_requires_reverification"
  }
}
```

단순히 최신 timestamp를 가진 항목을 선택하지 않는다. timestamp가 최근이어도 근거가 틀렸거나 scope가 다르면 사용할 수 없다.

## 네 반례로 age heuristic을 깨본다

| memory | 나이 | 현재 신호 | 판정 |
|---|---:|---|---|
| 외부 공개 전에 대상과 권한을 확인한다는 안전 원칙 | 300일 | 규칙 변경 없음, 현재 요청과 충돌 없음 | 나이만으로 stale 아님 |
| 마지막 build가 통과했다는 기록 | 10분 | 그 뒤 source file 변경 | stale, build 재실행 |
| 단순 상태 질문은 짧게 답한다는 선호 | 1일 | 현재 요청이 상세 비교를 명시 | lifecycle은 `promoted`, 이번 task에서만 미적용 |
| renderer가 `a`라는 상태 메모 | 5분 | 실제 config는 `b` | lifecycle `reverify`, evidence status `refuted`; 재승격 불가면 `held` |

첫 사례는 “오래되면 모두 버린다”를 반박한다. 안정 원칙은 TTL보다 무효화 사건과 현재 규칙을 보는 편이 낫다. 세 번째는 current request가 application을 멈출 뿐 유효한 memory를 전역 `held`로 만들지 않음을 보여준다. 네 번째는 “가장 최근 memory가 이긴다”를 반박한다. 잘못 기록된 최신 문장은 실제 source 앞에서 우선권이 없다. 이때 `refuted`는 lifecycle state가 아니라 evidence status다. 실제 반박을 확인하면 먼저 `reverify`로 보내고, 재확인으로 복구할 수 없을 때 reason을 남겨 `held`로 전이한다.

## 최신 검증도 범위를 벗어나면 proof가 아니다

`build passed`라는 기록에 timestamp만 있으면 재사용 범위가 너무 넓다. 최소한 검증 대상, 입력 revision, 명령, exit code를 함께 봐야 한다.

```json
{
  "command": "npm run build",
  "inputRevision": "synthetic-r42",
  "scope": ["source", "generated_pages"],
  "exitCode": 0,
  "verifiedAt": "2026-07-21T08:00:00Z"
}
```

그 뒤 source가 `synthetic-r43`으로 바뀌었다면 같은 명령을 실행했어도 이전 proof는 현재 revision을 증명하지 않는다. fresh proof는 단순히 방금 실행한 결과가 아니라 **현재 주장과 같은 입력·scope를 검증한 결과**다.

## 저장과 승격 문제로 되돌아가지 않는다

이 글은 이미 존재하는 memory가 현재 판단에 stale한지를 다룬다. 애초에 무엇을 저장할지는 [memory 저장 경계](/blog/blog/ai-work-memory-save-boundary/)의 문제이고, 후보를 어떤 근거로 승격할지는 [Promotion Review Queue](/blog/blog/secondbrain-promotion-review-queue/)의 문제다.

현재 요청 conflict는 후보를 `held`로 보내지 않는다. 유효한 `promoted` record는 유지하고 현재 task의 application disposition만 미적용으로 기록한다. 실제 source stale·무효화가 생긴 record를 `reverify`하고 필요하면 `held`로 보내는 방법은 [SecondBrain 기억 상태 머신](/blog/blog/secondbrain-growth-loop/)에서 이어진다.

## 결론

stale context는 오래된 기록만의 문제가 아니다. 최근 기록도 source 변경 사건이나 잘못된 근거 때문에 `reverify`가 필요할 수 있다. 반대로 오래된 안전 원칙도 무효화 사건이 없고 현재 규칙과 맞으면 유지할 수 있다. 현재 요청 충돌과 scope mismatch도 이번 판단의 적용을 멈추지만, 그것만으로 record의 lifecycle을 stale이나 `held`로 만들지는 않는다.

TTL은 늦어도 다시 볼 시점을 정하고, event invalidation은 전제가 바뀐 순간 기록을 멈춘다. 둘을 통과한 뒤에도 행동 범위는 current request로, 현재 사실은 실제 파일과 같은 source로, 완료 주장은 같은 scope의 최신 검증으로 확인한다.

memory를 잘 쓰는 기준은 가장 최근 항목을 고르는 것이 아니다. 충돌의 종류를 구분하고, 더 직접적인 source로 판정하며, 적용하지 않은 이유까지 남기는 것이다.

## 확인 범위와 한계

- TTL, event, record 예시는 공개 설명용 합성 데이터다.
- 실제 event collector의 누락률이나 memory retrieval 정확도는 측정하지 않았다.
- filesystem timestamp만으로 source 변화의 의미를 판단하는 방식은 권장하지 않는다. 실제 revision과 scope 확인이 필요하다.
- 이 글은 memory 저장 여부나 자동 승격 점수를 다루지 않는다.
