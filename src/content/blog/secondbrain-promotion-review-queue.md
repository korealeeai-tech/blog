---
title: "Memory 후보 한 건을 Promotion Review Queue에서 판정하는 법"
description: "근거·범위·민감성·갱신 가능성을 확인해 후보를 추천하고, 작업별 적용 판단과 외부에서 인증·인가된 최종 승인 record를 분리합니다."
pubDate: 2026-07-02T16:20:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/secondbrain-promotion-review-queue.png"
---

Promotion Review Queue의 핵심 단위는 queue 전체가 아니라 **후보 한 건의 판정 기록**이다. 어떤 근거로 범위를 정했고, 무엇 때문에 보류하거나 기각했는지 남지 않으면 queue는 승인 버튼이 달린 목록에 그친다.

이 글에서는 여섯 개의 합성 후보를 같은 규칙으로 심사한다. 결과는 `promote`, `hold`, `reject` 세 recommendation으로 나뉜다. 이 recommendation은 사람이 현재 요청과 후보 원문을 확인한 최종 결정이 아니라, 명시적 gate를 빠짐없이 적용했는지 보여주는 deterministic triage다.

<figure>
	<img src="/blog/blog-images/secondbrain/promotion-review-queue.svg" alt="기억 후보를 심사 기준으로 확인한 뒤 승격 또는 보류하는 Promotion Review Queue 개념도" />
	<figcaption>이 그림은 실제 review queue 화면이 아니라, 한 후보를 승격하기 전에 확인할 기준을 보여주는 공개용 개념도다.</figcaption>
</figure>

## 유용한 context라는 설명은 심사 결과가 아니다

2026-07-01에 캡처한 OpenAI Codex memories 문서는 memory의 역할을 다음처럼 설명했다.

> [2026-07-01 당시 OpenAI Codex memories 문서](https://developers.openai.com/codex/memories): "useful context"

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-memories-context.png" alt="2026년 7월 1일 OpenAI Codex memories 문서에서 유용한 context를 설명한 영역 캡처" />
	<figcaption>2026-07-01에 만든 역사적 캡처다. 2026-07-21에는 링크가 새 memories 문서로 이동하고 문구와 적용 대상이 달라졌다. 모든 후보가 유용하거나 안전하다는 근거로 사용하지 않는다.</figcaption>
</figure>

Claude Code memory 문서도 memory를 강제 설정과 구분한다.

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "not enforced configuration"

<figure>
	<img src="/blog/blog-images/official-docs/claude-memory-context-not-enforced.png" alt="Claude Code memory 공식문서에서 memory가 context이지 enforced configuration이 아니라고 설명한 영역 캡처" />
	<figcaption>Claude Code memory 문서 캡처, 캡처일 2026-07-01. memory가 참고 문맥이라는 근거이며, 기억 후보가 자동으로 안전하거나 항상 적용된다는 뜻은 아니다.</figcaption>
</figure>

두 자료는 memory가 context 계층이라는 경계만 제공한다. 어떤 후보가 좋은 context인지, 누가 승인해야 하는지, 현재 요청과 충돌하면 어떻게 해야 하는지는 이 글의 review contract로 별도 정의한다.

## 후보 schema에 판단 근거를 넣는다

합성 fixture의 각 후보는 다음 필드를 가진다.

| 필드 | review 질문 | 값의 역할 |
|---|---|---|
| `evidence` | 명시 요청인가, 반복 관찰인가, 검증됐는가 | 근거 없는 인상을 보류한다. |
| `scope` | 어떤 task에 적용하고 무엇을 제외하는가 | 넓은 사용자 성격 문장을 막는다. |
| `sensitivity` | 개인·비밀·재식별 단서가 있는가 | 해당 저장소 밖으로 기각한다. |
| `changeability` | 얼마나 쉽게 바뀌는가 | 높으면 무효화 사건이 필요하다. |
| `actionValue` | 미래 작업 행동을 실제로 바꾸는가 | 아니면 저장 이유가 없어 기각한다. |
| `currentRequestConflict` | 현재 명시 요청과 충돌하는가 | global recommendation과 별도로 현재 작업의 미적용 이유를 남긴다. |
| `scopeReviewComplete` | 사람이 scope와 예외의 사전 검토를 끝냈는가 | 없으면 recommendation을 `hold`한다. 최종 승격 승인은 아니다. |
| `autoScore` | 자동화가 계산한 우선순위 신호 | 정렬·검토 보조일 뿐 gate를 우회하지 못한다. |

`autoScore`가 마지막에 있는 이유가 중요하다. 점수는 다른 필드의 누락을 메우지 않는다. 0.99여도 scope 사전 검토가 끝나지 않았으면 결과는 `hold`다. 반대로 현재 요청 충돌은 후보의 global 품질을 바꾸지 않는다. 후보는 `promote` recommendation을 받을 수 있지만 그 작업에는 적용되지 않는다.

## 판정 순서는 reject gate부터 시작한다

이 예제의 규칙은 점수 합산이 아니라 순서가 있는 gate다.

```text
1. personal·secret·identifying → reject
2. actionValue가 false → reject
3. 검증 근거·좁은 scope 확인
4. changeability가 high면 invalidation event 확인
5. scope pre-review 완료 확인
6. 모두 통과할 때만 promote recommendation
7. current request conflict로 현재 작업의 application disposition 계산
8. 신뢰된 외부 경계가 사람 identity·provenance·권한을 확인한 승인 record를 만든 뒤, 별도 상태 머신이 필수 field shape를 확인하고 promoted 전이
```

`reject`와 `hold`도 구분한다. 비밀이나 행동 가치 없는 후보는 이 memory store에 들어올 이유가 없어 기각한다. 근거 추가, scope 수정, 설정 변경 확인, 사람 검토로 상태가 달라질 수 있는 후보는 보류한다.

이 구분은 “나중에 볼 것” 목록이 영구 쓰레기통이 되는 일을 줄인다. 보류 이유를 해소할 수 없다면 다음 review에서 명시적으로 기각할 수 있다.

## 공개 fixture와 reviewer를 실행한다

합성 후보는 [memory-review-sample.json](/blog/blog-examples/memory-review-sample.json), reviewer는 [review-memory-candidates.mjs](/blog/blog-examples/review-memory-candidates.mjs)에 있다. 일반 모드는 임의의 유효한 비어 있지 않은 후보 배열을 받는다. 아래 `--self-test`만 공개 sample의 id와 예상 개수를 추가로 검사한다.

```bash
node public/blog-examples/review-memory-candidates.mjs --self-test public/blog-examples/memory-review-sample.json
```

Node.js 22 실행 결과를 요약하면 다음과 같다.

| candidate id | auto score | recommendation | 현재 작업 application disposition | 결정 이유 |
|---|---:|---|---|---|
| `status-check-summary` | 0.91 | `promote` | 미적용: `final_human_approval_required` | recommendation gate 통과, 최종 승격 승인 대기 |
| `high-score-scope-unreviewed` | 0.99 | `hold` | 미적용: recommendation 미완료 | scope 사전 검토 미완료 |
| `changing-renderer-default` | 0.87 | `hold` | 미적용: recommendation 미완료 | 변동성은 높은데 무효화 사건 없음 |
| `current-request-conflict` | 0.96 | `promote` | 미적용: `current_request_conflict` | global gate는 통과했지만 현재 요청에는 적용 불가 |
| `raw-access-credential` | 0.95 | `reject` | 미적용: recommendation 미완료 | secret은 이 저장소 밖의 정보 |
| `decorative-preference` | 0.42 | `reject` | 미적용: recommendation 미완료 | 미래 행동을 바꾸지 않음 |

마지막 summary line은 다음과 같다.

```json
{"mode":"sample_self_test","summary":{"promote":2,"hold":2,"reject":2},"warning":"Automation only recommends; promotion requires an externally authenticated and authorized human approval record. The separate state-machine fixture validates record shape only, and current-task application is evaluated independently."}
```

스크립트는 두 모드 모두 필수 필드와 `autoScore` 범위를 검사한다. `--self-test`에서는 결과 개수, high-score scope 미검토 후보, secret 후보, current-conflict 후보의 recommendation과 `applicationDisposition`을 assertion으로 추가 확인한다. 일반 모드는 sample id나 개수를 가정하지 않으므로 다른 유효한 후보 목록에도 그대로 쓸 수 있다.

## 높은 자동 점수가 승격에 실패하는 사례

`high-score-scope-unreviewed`는 0.99로 여섯 후보 중 점수가 가장 높다. 근거도 두 개이고 민감 정보도 없으며 변동성도 낮다. 그래도 `scopeReviewComplete: false`라서 결과는 `hold`다.

이 후보의 문장은 “모든 planning request를 승인 checkpoint 없이 시작한다”다. 문장 자체가 행동을 바꾸기 때문에 자동화가 유용하다고 평가할 수 있다. 그러나 `모든`이라는 범위가 적절한지, 되돌리기 어려운 행동까지 포함하는지, 현재 사용자 의도와 맞는지는 점수만으로 알 수 없다.

점수가 높다는 것은 review 우선순위를 올릴 수 있다는 뜻이지, 더 넓은 권한을 준다는 뜻이 아니다. 이 negative case를 빼면 자동화가 “승격 권고 시스템”에서 “자동 승인 시스템”으로 미끄러지기 쉽다.

## 최근 후보도 근거가 부족하면 보류한다

후보가 방금 생성됐다는 사실은 freshness만 말한다. `scope`, `evidence`, `invalidationEvents`가 충분하다는 뜻은 아니다.

`changing-renderer-default`는 검증된 명시 요청 한 건과 반복 관찰 한 건이 있다고 가정하지만, 설정이 자주 바뀌는 후보에 어떤 사건이 생기면 무효화할지가 없다. 이 상태로 승격하면 다음 설정 변경 뒤에도 과거 renderer를 기본값으로 적용할 수 있다. 그래서 scope 사전 검토가 끝났어도 `hold`다.

반대로 오래됐다는 이유만으로 자동 기각하지도 않는다. 변하지 않은 안전 기준은 현재 근거로 다시 확인한 뒤 유지할 수 있다. 그 수명 판정은 [stale context 점검](/blog/blog/stale-ai-context-check/)의 역할이다.

## 현재 요청 충돌은 recommendation이 아니라 적용을 멈춘다

`current-request-conflict`는 근거, scope, 무효화 사건, scope 사전 검토를 모두 갖고 있고 점수도 0.96이다. global 기준으로는 `promote` recommendation이지만, 현재 요청이 발행을 금지하므로 `applicationDisposition.applied`는 `false`, `notAppliedReason`은 `current_request_conflict`다.

이 판정은 후보 자체가 나쁘다는 뜻이 아니다. 현재 task에 적용할 수 없다는 뜻이다. lifecycle 품질과 runtime 적용 가능성을 같은 값으로 표현하면, 한 작업의 일시적 충돌이 유효한 global 기억을 `held`로 오염시킨다. 두 축을 분리하면 현재 요청을 우선하면서도 다른 작업에서 쓸 수 있는 기준은 유지할 수 있다.

## queue가 담당하지 않는 경계

이 글은 한 후보를 판정하는 과정에 집중한다. 후보를 애초에 저장해도 되는지의 개인정보·비밀 gate는 [memory 저장 경계](/blog/blog/ai-work-memory-save-boundary/)에서 다룬다. `candidate`, `review`, `promoted`, `held`, `reverify` 전체 전이는 [기억 상태 머신](/blog/blog/secondbrain-growth-loop/)의 책임이다.

따라서 이 reviewer의 `promote`를 실제 저장소 변경 명령으로 연결하지 않았다. 출력은 recommendation, reason, 현재 작업 `applicationDisposition`이다. 실제 `review → promoted` 전이는 별도 상태 머신에서 검증된 근거와 정의된 scope에 더해 `actorType: "human"`, `actor`, `decision: "approve"`, `timestamp`를 가진 승인 record shape를 확인한다.

다만 state-machine fixture는 그 field만 검사한다. 호출자가 `actorType: "human"`을 거짓으로 넣었는지 판별하거나 실제 사람 identity와 provenance를 인증할 수 없다. production에서는 신뢰된 외부 승인 경계가 actor를 인증하고 승인 권한을 확인한 뒤 record를 전달해야 한다.

## 결론

Promotion Review Queue의 품질은 몇 건을 통과시켰는지가 아니라, 각 후보의 판정 이유가 재검토 가능한지로 본다. 민감성·행동 가치 reject gate를 먼저 적용하고, 근거·scope·갱신 가능성·scope 사전 검토를 확인하면 자동 점수가 다른 결정을 덮기 어렵다. 현재 요청의 적용 판단과 최종 사람 승인을 별도 단계로 분리해야 recommendation이 실제 권한처럼 오해되지 않는다.

합성 fixture에서는 2건 승격 권고, 2건 보류, 2건 기각이 나왔다. 특히 0.99 후보는 scope 사전 검토 부재로 보류됐고, current-conflict 후보는 승격 권고와 현재 작업 미적용을 동시에 기록했다. 이 결과가 보여주는 것은 memory 품질이 아니라, 자동화의 권한을 recommendation으로 제한한 review rule의 동작이다.

## 확인 범위와 한계

- 합성 JSON과 reviewer는 Node.js v22.12.0에서 일반 모드와 `--self-test`를 모두 실행했고, sample self-test에서 `promote: 2`, `hold: 2`, `reject: 2`를 확인했다.
- fixture에는 실제 대화, 개인, 조직, 제품, 업무 데이터가 없다.
- 자동 점수 계산 모델은 구현하지 않았다. `autoScore`는 gate 우회 실패를 보여주기 위한 합성 입력이다.
- state-machine fixture는 승인 record의 필수 field shape만 확인한다. 실제 사람 identity, provenance, authorization은 외부 승인 경계의 책임이다.
- OpenAI Codex memories 캡처는 2026-07-01 당시 화면이며, 2026-07-21 redirect 이후 현재 문구를 완전히 증명하지 않는다.
