---
title: "SecondBrain 기억 상태 머신: 후보에서 기준이 되기까지"
description: "memory candidate의 lifecycle과 작업별 application disposition을 분리하고, 승인 record shape·stale 재검증·요청 우선순위를 실행 예제로 설명합니다."
pubDate: 2026-07-02T16:10:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/secondbrain-growth-loop.png"
---

새 피드백을 수집하자마자 다음 작업의 기준으로 사용하면 `후보`와 `승격된 기억`의 차이가 사라진다. 반대로 검토가 끝난 뒤 아무 상태도 바꾸지 않으면, 오래된 기억이 계속 현재 기준처럼 남는다.

이 문제를 다루는 단위는 저장량이 아니라 **상태 전이**다. 후보는 검토를 거쳐야 승격되고, 근거가 부족하면 보류된다. 승격 뒤 실제 source가 오래되거나 무효화되면 `reverify`로 내려간다. 반면 현재 요청과의 충돌은 기억 자체를 무효화하지 않는다. lifecycle은 `promoted`로 유지하고, 그 작업의 application disposition만 `applied: false`로 기록한다.

아래 흐름과 실행 예제는 공개 설명용 합성 모델이다. 실제 memory 시스템의 내부 구현이나 자동 품질 측정 결과가 아니다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-growth-loop.svg" alt="SecondBrain이 후보 수집, 검토, 승격, 보류, 다음 작업 재검증을 거쳐 성장하는 개념도" />
	<figcaption>이 그림은 실제 queue나 schedule 화면이 아니라, 기억 상태 전이를 설명하기 위한 공개용 개념도다.</figcaption>
</figure>

## context를 가져오는 것과 기준으로 승격하는 것은 다르다

2026-07-01에 캡처한 OpenAI Codex memories 문서는 이전 작업의 context를 다음 작업으로 가져오는 기능을 다음처럼 설명했다.

> [2026-07-01 당시 OpenAI Codex memories 문서](https://developers.openai.com/codex/memories): "useful context"

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-memories-context.png" alt="2026년 7월 1일 OpenAI Codex memories 문서에서 유용한 context를 설명한 영역 캡처" />
	<figcaption>2026-07-01에 만든 역사적 캡처다. 2026-07-21에는 링크가 새 memories 문서로 이동하고 문구와 적용 대상이 달라졌다. 이 캡처는 현재 제품 계약 전체가 아니라, 당시 useful context라고 설명한 범위만 보여준다.</figcaption>
</figure>

Claude Code memory 문서는 memory를 강제 설정과 구분한다.

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "context, not enforced configuration"

<figure>
	<img src="/blog/blog-images/official-docs/claude-memory-context-not-enforced.png" alt="Claude Code memory 공식문서에서 memory가 context이지 enforced configuration이 아니라고 설명한 영역 캡처" />
	<figcaption>Claude Code memory 문서 캡처, 캡처일 2026-07-01. memory가 참고 문맥이라는 근거이며, 승격된 기억이 모든 상황에서 자동으로 강제된다는 뜻은 아니다.</figcaption>
</figure>

공식 기능이 context를 이어줄 수 있다는 설명만으로 어떤 후보가 안전한 기준이 되는지는 알 수 없다. 그 판단을 추적 가능하게 만드는 것이 아래 상태 머신의 역할이다.

## 다섯 상태의 책임을 겹치지 않는다

| 상태 | 의미 | 허용되는 다음 행동 |
|---|---|---|
| `candidate` | 작업 중 발견했지만 아직 사실·범위가 검토되지 않은 문장 | `submit_for_review` |
| `review` | 근거, 범위, 민감성, 갱신 가능성을 사람이 확인하는 중 | `approve` 또는 `hold` |
| `promoted` | 적용 범위와 예외가 고정되어 retrieval 후보가 된 기준 | source stale·무효화 신호가 오면 `reverify`; 현재 요청 충돌이면 상태를 유지하고 그 작업에서만 미적용 |
| `held` | 근거 부족, 범위 불명확, 승인 대기 등으로 적용할 수 없음 | 새 근거를 붙여 `review`로 복귀 |
| `reverify` | 과거에는 승격됐지만 현재 적용 전에 다시 확인해야 함 | 현재 근거로 `promoted` 복귀 또는 `held` |

전이만 적으면 다음과 같다.

```text
candidate --submit_for_review--> review
review    --approve-----------> promoted
review    --hold--------------> held
held      --add_evidence------> review
promoted  --stale_signal------> reverify
reverify  --reconfirm---------> promoted
reverify  --hold--------------> held
```

`candidate → promoted` 직접 전이는 없다. 최신 후보라는 이유도, 자동 점수가 높다는 이유도 review를 건너뛸 수 없다. `current_request_conflict`도 이 표의 event가 아니다. 그것은 특정 작업에서 적용할지를 나타내는 별도 축이다.

## 전이보다 먼저 지켜야 할 불변조건

상태 이름만 있어서는 안전하지 않다. 전이가 허용되려면 최소 네 조건이 항상 유지돼야 한다.

1. `approve`에는 검증된 근거, 좁게 정의된 scope, `actorType: "human"`, `actor`, `decision: "approve"`, `timestamp`를 가진 승인 record가 모두 필요하다. 이 fixture는 그 record가 신뢰된 외부 승인 경계에서 왔다고 가정한다.
2. `promoted`는 “항상 적용”이 아니라 “현재 작업에서 꺼내 볼 수 있음”을 뜻한다.
3. source stale·무효화 신호만 lifecycle을 `reverify`로 바꾼다. 현재 요청 충돌은 lifecycle을 바꾸지 않고 `applicationDisposition`에 `applied: false`와 이유를 남긴다.
4. 초기 상태는 별도 `initial` record로 남기고, 성공한 모든 전이는 `{from,event,to,reason}` 형태로 history에 남긴다. 불법 전이는 가짜 history를 만들지 않고 실패 reason을 반환한다.

개인정보나 비밀을 어떤 저장 경로로 보낼지는 이 상태 머신 앞단의 문제다. 그 내용은 [memory 저장 경계](/blog/blog/ai-work-memory-save-boundary/)에서 다룬다. `review` 상태의 한 후보를 실제로 어떻게 판정하는지는 [Promotion Review Queue](/blog/blog/secondbrain-promotion-review-queue/)로 분리한다.

## 실행 가능한 최소 상태 머신

동작을 확인할 수 있도록 외부 dependency가 없는 [memory-growth-state-machine.mjs](/blog/blog-examples/memory-growth-state-machine.mjs)를 만들었다.

```bash
node public/blog-examples/memory-growth-state-machine.mjs
```

Node.js 22에서 실행하면 여섯 시나리오와 한계 note가 JSON Lines로 나온다. 아래 네 줄은 승인 record shape와 작업별 미적용이 서로 다른 축이고, fixture가 실제 사람 신원을 인증하지 않는다는 경계를 보여준다.

```json
{"scenario":"normal_promotion","ok":true,"initial":{"state":"candidate","reason":"candidate_created"},"final_state":"promoted","approval":{"actorType":"human","actor":"synthetic-reviewer","decision":"approve","timestamp":"2026-07-21T09:00:00Z"},"history":[{"from":"candidate","event":"submit_for_review","to":"review","reason":"candidate submitted for review"},{"from":"review","event":"approve","to":"promoted","reason":"verified evidence and scope passed review"}]}
{"scenario":"automation_actor_type","ok":false,"initial":{"state":"candidate","reason":"candidate_created"},"final_state":"review","history":[{"from":"candidate","event":"submit_for_review","to":"review","reason":"candidate submitted for review"}],"reason":"promotion requires an approval record with actorType=human, actor, decision=approve, and timestamp"}
{"scenario":"current_request_conflict","ok":true,"initial":{"state":"candidate","reason":"candidate_created"},"final_state":"promoted","approval":{"actorType":"human","actor":"synthetic-reviewer","decision":"approve","timestamp":"2026-07-21T09:00:00Z"},"applicationDisposition":{"applied":false,"notAppliedReason":"current_request_conflict"},"history":[{"from":"candidate","event":"submit_for_review","to":"review","reason":"candidate submitted for review"},{"from":"review","event":"approve","to":"promoted","reason":"verified evidence and scope passed review"}]}
{"note":"Synthetic transitions and approval-record shape checks only; this fixture assumes a trusted external approval boundary and does not authenticate human identity, provenance, or authorization."}
```

스크립트 안의 assertion은 초기 상태가 transition history 밖의 `initial` record로 남는지, 모든 history entry가 `from`, `event`, `to`, `reason`을 갖는지, 이전 `to`와 다음 `from`이 이어지는지 확인한다. 불법 전이, 승인 record 누락, `actorType: "automation"`인 record가 shape gate에서 상태를 바꾸지 않고 거부되는지도 검증한다.

## 정상 승격: 근거와 scope가 함께 있어야 한다

`normal_promotion`은 `candidate → review → promoted`만 통과한다. `approve` event에는 `evidenceVerified: true`, `scopeDefined: true`뿐 아니라 `actorType: "human"`, `actor`, `decision: "approve"`, 유효한 `timestamp`가 있는 승인 record가 필요하다. 하나라도 빠지거나 literal `actorType`이 `automation`이면 상태는 `review`에 머물고 오류 이유를 반환한다.

여기서 통과했다는 것은 record field shape가 맞는다는 뜻뿐이다. 호출자가 `actorType: "human"`을 거짓으로 넣어도 이 deterministic fixture는 알아낼 수 없다. 실제 구현은 상태 머신에 record를 전달하기 전에 신뢰된 외부 승인 경계에서 actor identity와 provenance를 인증하고, 해당 actor의 승인 권한을 검증해야 한다.

여기서 “근거가 최신이다”는 승격의 충분조건이 아니다. 최근 한 번 관찰한 문장도 적용 범위가 불분명하면 다음 작업 전체로 일반화할 수 없다. 최신성은 근거의 한 속성일 뿐, scope 검토를 대체하지 않는다.

## 불법 전이 거부: 자동 확신을 상태로 막는다

`illegal_transition`은 검토 전 후보에 바로 `approve`를 보낸다. 결과는 `ok: false`이고 상태는 `candidate` 그대로다.

이 실패는 예외가 아니라 설계 목표다. 호출자가 “점수가 충분하니 바로 승격하자”고 해도 상태 머신이 허용하지 않는다. 승격을 빠르게 만드는 것보다 review를 우회하지 못하게 하는 편이 중요하다.

## stale 재검증: 오래됐다는 이유만으로 삭제하지 않는다

`stale_reverification`은 이미 승격된 기준에 source stale 신호를 넣는다. 항목은 삭제되지 않고 `reverify`로 이동한다. 현재 근거를 다시 확인해야만 `promoted`로 돌아온다. 근거가 실제로 반박됐거나 더는 유효하지 않으면 명시적 reason과 함께 `held`로 보낸다.

이 흐름은 “오래되면 모두 폐기”와 다르다. 변하지 않은 안전 원칙은 오래돼도 다시 확인한 뒤 유지할 수 있다. 반대로 방금 승격했어도 구성 변경 사건이 발생했다면 즉시 재검증해야 한다.

## 현재 요청 충돌: 승격된 기억도 적용하지 않는다

`current_request_conflict`에서는 과거에 승격된 `default-publish-action`이 현재 요청과 충돌한다고 가정한다. 이 기억의 근거와 scope는 여전히 유효하므로 lifecycle은 `promoted`에 머문다. 대신 별도 `applicationDisposition`에 `applied: false`, `notAppliedReason: "current_request_conflict"`가 남는다. 이 평가 때문에 transition history가 추가되지 않는 것도 assertion으로 확인한다.

이 반례가 없으면 `promoted`를 “신뢰할 수 있으니 적용”으로 오해하기 쉽다. 승격은 후보 자체의 품질을 검토했다는 뜻일 뿐이다. 지금 요청의 명시적 금지나 좁은 범위를 이길 권한은 주지 않는다.

## 이 예제가 증명하지 않는 것

이 스크립트는 deterministic transition table을 실행한다. 실제 모델이 후보를 얼마나 잘 추출하는지, review가 정확한지, memory가 작업 성능을 높이는지는 측정하지 않는다. 승인 record의 실제 actor가 사람인지, record가 변조되지 않았는지, actor가 승인 권한을 가졌는지도 인증하지 않는다. 시나리오가 통과한다는 것은 코드가 명시한 상태·record shape·적용 계약을 지켰다는 뜻뿐이다.

실제 시스템에 적용하려면 상태 저장의 원자성, 동시 review 충돌, history 보존, reviewer 권한, recovery 정책을 별도로 설계해야 한다. 이 예제는 그 구현을 가장한 것이 아니라, 상태와 불변조건을 대화 가능한 크기로 줄인 fixture다.

## 결론

candidate가 기준이 되는 과정에는 적어도 `review`, `promoted` 또는 `held`, 그리고 `reverify`가 필요하다. 이 구분 덕분에 근거 없는 최신 후보와 필수 field가 없는 승인 record를 거부하고, 실제 stale 신호가 온 기억만 재검증할 수 있다. 현재 요청 충돌은 lifecycle을 오염시키지 않으면서 그 작업의 적용만 멈춘다.

안전한 성장 루프는 많이 승격하는 루프가 아니다. 불법 전이를 거부하고, 왜 보류됐는지 남기며, 과거의 승격을 현재 작업에서 다시 시험할 수 있는 루프다.

## 확인 범위와 한계

- 예제는 Node.js v22.12.0에서 정상 승격, 불법 전이·승인 record 누락·literal automation actor type 거부, stale 재검증, 현재 요청 충돌의 작업별 미적용을 실행했다.
- 승인 record는 신뢰된 외부 경계에서 인증·인가됐다고 가정한다. fixture 자체는 실제 사람 identity, provenance, authorization을 검증하지 않는다.
- OpenAI Codex memories 캡처는 2026-07-01 당시 화면이며, 2026-07-21 redirect 이후 현재 문구의 완전한 증거가 아니다.
- Claude Code 문서 캡처 생성일은 2026-07-01이다.
- 실제 memory 품질, 모델 행동, 자동 승격 정확도는 측정하지 않았다.
