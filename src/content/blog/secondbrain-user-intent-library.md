---
title: "SecondBrain: AI를 위한 사용자 의도 라이브러리"
description: "선호·검증 기준·위험 기준·작업 맥락·응답 전략을 어떤 schema로 기록하고, 현재 요청과 충돌할 때 어떤 우선순위로 적용할지 정리합니다."
pubDate: 2026-06-29T18:20:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/secondbrain-library-map.png"
---

사용자 의도 라이브러리는 “사용자는 어떤 사람인가”를 요약하는 성격표가 아니다. 다음 작업에서 반복해서 필요한 기준을 **조건, 행동, 예외, 근거, 갱신 신호**와 함께 찾을 수 있게 만든 작은 reference collection이다.

분류만 해서는 충분하지 않다. `짧은 답변 선호`와 `설계 검토에는 근거가 필요함`이 함께 있을 때 무엇을 적용할지 정할 precedence가 필요하다. 현재 요청이 과거 default와 충돌할 때도 같은 문제가 생긴다.

이 글은 다섯 종류의 record schema와 적용 순서를 정의한다. 실제 개인 memory나 특정 제품 구현을 설명하지 않으며, 예시는 모두 합성 기준이다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-library-map.png" alt="사용자 의도 라이브러리 중심에 선호, 검증 기준, 위험 기준, 작업 맥락, 응답 전략이 연결된 구조" />
	<figcaption>SecondBrain은 사용자를 복제하는 구조가 아니라, AI가 참고할 판단 기준을 연결한 라이브러리다.</figcaption>
</figure>

## 모든 record가 공유하는 최소 schema

종류가 달라도 다음 필드는 공통으로 둔다.

```json
{
  "id": "verification:fresh-state-proof",
  "kind": "verification",
  "condition": ["claim_current_state"],
  "action": "Read the current source before reporting the state.",
  "scope": ["status_check", "completion_report"],
  "exceptions": ["No source is accessible; report the gap instead."],
  "evidenceClass": "explicit_and_repeated",
  "verifiedAt": "2026-07-21",
  "invalidatedBy": ["source_contract_changes", "criterion_superseded"]
}
```

핵심은 `action`만 저장하지 않는 것이다. `condition`과 `scope`가 없으면 모든 작업에 적용되고, `exceptions`가 없으면 현재 요청을 덮으며, `verifiedAt`과 `invalidatedBy`가 없으면 stale 여부를 판단하기 어렵다.

`evidenceClass`도 원문을 저장하라는 뜻이 아니다. 명시 요청인지, 반복 관찰인지, 아직 추정인지처럼 근거의 성격만 남긴다. 실제 대화나 개인 맥락 없이도 review 강도를 결정할 수 있어야 한다. `invalidatedBy`에는 source contract 변경이나 기준의 대체처럼 record 자체를 다시 검증해야 하는 사건만 둔다. 한 작업의 현재 요청 충돌은 lifecycle 무효화 사건이 아니라 application 판단이다.

## 다섯 종류는 서로 다른 질문에 답한다

| kind | 답하는 질문 | 합성 예 | 빠지면 생기는 오류 |
|---|---|---|---|
| `preference` | 어떤 표현·형식을 기본으로 선호하는가 | 단순 상태 확인은 결과를 먼저 말한다 | 모든 선호를 전역 성격으로 일반화 |
| `verification` | 어떤 주장을 하려면 어떤 proof가 필요한가 | 현재 상태는 방금 읽은 source로 증명한다 | memory 속 과거 상태를 현재 사실로 보고 |
| `risk` | 어떤 조건에서 멈추거나 권한을 다시 확인하는가 | 외부 공개 대상이 불명확하면 중단한다 | 되돌리기 어려운 행동을 default로 실행 |
| `work_context` | 어느 작업 종류와 표면에 기준이 적용되는가 | public artifact에는 generated output도 포함한다 | 다른 task의 규칙을 잘못 회수 |
| `response_strategy` | 요청 유형에 따라 어떤 진행 방식을 쓰는가 | 조사 요청은 결과·원인 후 다음 행동을 분리한다 | 관찰 요청을 수정 실행으로 확대 |

이 다섯 종류는 독립적인 상자가 아니다. 하나의 task brief가 `work_context`로 범위를 좁히고, `risk`로 중단 조건을 정하고, `verification`으로 proof를 만들고, `response_strategy`로 보고 순서를 정할 수 있다.

그렇다고 같은 문장을 여러 kind에 복제하지 않는다. 예를 들어 “public artifact 전체를 검사한다”는 `work_context` record 하나를 두고, 어떤 검사를 수행할지는 별도 `verification` record에서 참조한다. 중복 copy가 늘면 한쪽만 갱신돼 충돌하기 쉽다.

## 선호는 조건 없는 사용자 라벨이 아니다

다음 문장은 저장하기 쉽지만 적용하기 어렵다.

```text
사용자는 짧은 답변을 좋아한다.
사용자는 매우 신중하다.
사용자는 자동화를 선호한다.
```

각 문장은 상황에 따라 맞거나 틀릴 수 있고, 실제 행동도 정하지 못한다. 더 나은 record는 조건과 예외를 가진다.

```json
{
  "kind": "preference",
  "condition": ["simple_status_question"],
  "action": "Lead with the result in one short paragraph.",
  "scope": ["response_format"],
  "exceptions": ["The current request asks for analysis or detailed evidence."]
}
```

이 record는 사용자의 성격을 정의하지 않는다. 단순 상태 질문에서 쓸 수 있는 default 하나를 제공한다. 분석 요청이 오면 exception이 활성화되고, 현재 요청이 형식을 직접 지정하면 그 요청을 따른다.

## 검증 기준과 응답 전략을 섞지 않는다

“근거를 확인하고 자세히 답한다”는 한 문장에는 두 역할이 섞여 있다.

- 검증 기준: 현재 상태를 주장하기 전에 실제 source를 확인한다.
- 응답 전략: 확인한 사실과 미확인 gap을 구분해서 보고한다.

첫 번째는 답변 길이와 무관하다. 한 줄 답변도 fresh proof가 필요할 수 있다. 두 번째는 어떤 proof를 실행할지 결정하지 않는다. 두 역할을 분리하면 “짧게 답하라”는 현재 요청이 와도 검증을 생략하지 않고 표현만 줄일 수 있다.

## precedence는 한 줄 순위보다 두 층으로 본다

모든 신호를 같은 목록에 놓으면 현재 요청과 안전 경계의 역할이 섞인다. 먼저 **authority와 safety 경계**를 확인하고, 그 안에서 **현재 task에 적용할 default**를 고른다.

### 1층: 넘지 말아야 할 경계

```text
현재 허용된 scope와 명시적 금지
→ 적용되는 안전·권한 규칙
→ 되돌리기 어려운 행동의 승인 조건
```

현재 요청이 “이 파일만 수정”이라고 하면 library의 광범위한 자동화 default가 범위를 넓힐 수 없다. 반대로 current request가 과거 preference와 다르다는 이유만으로 개인정보나 credential 안전 경계를 약화할 수도 없다.

### 2층: 경계 안에서 적용할 신호

```text
1. 현재 요청의 명시적 형식·목표
2. 현재 task와 source에서 확인한 사실
3. scope가 정확히 맞고 fresh한 library record
4. 더 넓은 지속 default
5. 근거 없는 추정
```

아래 신호가 위 신호와 충돌하면 아래 것을 적용하지 않는다. 예를 들어 library에 “완료 후 발행”이 있어도 현재 요청이 “초안만”이면 발행하지 않는다. library에 “도구 A 사용”이 방금 갱신됐어도 실제 구성 파일이 도구 B를 지정하면 현재 source를 따른다.

## 충돌은 병합하지 말고 이유와 함께 제외한다

두 record가 충돌한다고 절충 문장을 만들면 scope가 흐려진다. 다음 순서로 한쪽을 제외한다.

1. 현재 요청이 어느 record의 조건을 활성화하는지 본다.
2. 두 record의 `scope`와 `exceptions`를 비교한다.
3. `verifiedAt`보다 무효화 사건이 발생했는지 확인한다.
4. 실제 파일·공식 source·최신 검증이 어느 쪽을 지지하는지 확인한다.
5. 선택하지 않은 record에는 application disposition과 `notAppliedReason`을 남긴다.

```json
{
  "recordId": "preference:short-status",
  "lifecycleState": "promoted",
  "applicationDisposition": {
    "applied": false,
    "notAppliedReason": "current_request_requires_detailed_comparison"
  }
}
```

이 기록은 library 항목을 삭제하거나 `held`·`reverify`로 바꾸지 않는다. 다른 task에서는 여전히 맞을 수 있기 때문이다. record는 `promoted`로 유지하고, 현재 적용 여부만 별도 축에 남긴다. 반대로 current source가 record의 근거를 실제로 반박하면 그때는 lifecycle을 `reverify`로 바꾸고 재확인 결과에 따라 `promoted`로 복귀시키거나 reason과 함께 `held`로 보낸다.

## library가 자동 결정기가 되지 않게 하는 세 질문

retrieval된 record를 행동으로 바꾸기 전에 세 가지를 확인한다.

```text
이 record의 condition이 현재 요청에서 실제로 성립하는가?
현재 source가 record의 사실 가정을 지지하는가?
이 행동이 현재 허용된 scope와 안전 경계 안에 있는가?
```

하나라도 아니면 자동 적용하지 않는다. library는 가능한 기준을 회수하는 장치이지, 권한을 만들거나 현재 사실을 증명하는 장치가 아니다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-runtime-flow.png" alt="요청 수신, 관련 기준 회수, 근거 확인, 응답 전략 결정, 검증 결과 분리의 흐름" />
	<figcaption>SecondBrain은 답을 바로 내는 장치가 아니라, 작업 전에 기준과 검증 경로를 정리하는 장치에 가깝다.</figcaption>
</figure>

## 이 시리즈에서 질문별로 읽는 순서

사용자 의도 라이브러리는 시리즈의 분류 hub다. 세부 질문은 다음 글로 분리했다.

- 무엇을 저장·일반화·만료·비저장으로 보낼지는 [AI 작업 기억의 저장 경계](/blog/blog/ai-work-memory-save-boundary/)에서 다룬다.
- 후보가 어떤 상태를 거쳐 승격·보류·재검증되는지는 [SecondBrain 기억 상태 머신](/blog/blog/secondbrain-growth-loop/)에서 다룬다.
- 한 후보를 어떤 evidence와 reason으로 판정하는지는 [Promotion Review Queue](/blog/blog/secondbrain-promotion-review-queue/)에서 다룬다.
- 현재 작업에 필요한 record만 brief로 바꾸는 과정은 [Pre-work Memory Brief](/blog/blog/pre-work-memory-brief/)에서 다룬다.
- relation을 이용한 retrieval과 stale edge gate는 [SecondBrain Graph 비교](/blog/blog/secondbrain-graph-memory-network/)에서 다룬다.
- TTL, 무효화 사건, current source의 반박은 [stale context 점검](/blog/blog/stale-ai-context-check/)에서 다룬다.
- memory가 행동을 바꿨는지 측정하는 방법은 [AI memory 영향 측정](/blog/blog/ai-memory-impact-measurement/)에서 다룬다.
- 짧은 요청이 여러 작업 계약과 양립할 때의 판단은 [AI 작업 범위의 모호성](/blog/blog/why-ai-keeps-guessing-user-intent/)에서 다룬다.

이렇게 나누면 library 글이 저장, 승격, retrieval, stale, 측정을 얕게 반복하지 않고 schema와 precedence에 집중할 수 있다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-not-a-diary.png" alt="SecondBrain이 대화 저장소, 감시 장치, 자동 조종 장치가 아니라 판단 기준 라이브러리라는 대조 다이어그램" />
	<figcaption>사용자 의도 라이브러리는 원문 일기나 성격표, 자동 조종 장치가 아니다.</figcaption>
</figure>

## 결론

사용자 의도 라이브러리는 선호, 검증 기준, 위험 기준, 작업 맥락, 응답 전략을 조건부 record로 보관한다. 각 record에는 행동뿐 아니라 scope, exception, evidence class, 갱신·무효화 신호가 필요하다.

적용할 때는 현재 허용 범위와 안전 경계를 먼저 지키고, 현재 명시 요청과 실제 source를 scoped memory보다 우선한다. 충돌한 record를 섞어 평균내지 않고 적용하지 않은 이유를 남긴다.

이 구조의 목적은 AI가 사용자를 더 정교하게 묘사하게 하는 것이 아니다. 현재 task에서 덜 추측하고, 어떤 기준을 왜 적용했는지 사람이 다시 확인할 수 있게 하는 것이다.

## 확인 범위와 한계

- schema, precedence, 예시는 공개 설명용 합성 설계다.
- 특정 memory 제품의 실제 retrieval 방식이나 모델 내부 intent inference를 설명하지 않는다.
- library record가 작업 정확도나 생산성을 높이는지는 이 글에서 측정하지 않았다.
- 원문 대화, 개인 식별 정보, 실제 내부 context는 포함하지 않았다.
