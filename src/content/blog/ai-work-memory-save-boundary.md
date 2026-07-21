---
title: "AI 작업 기억을 만들 때 저장해야 할 것과 저장하면 안 되는 것"
description: "개인정보, 비밀, 변동성, 행동 가치의 네 축으로 memory 후보를 저장·일반화·만료 포함 저장·비저장 중 어디로 보낼지 판단합니다."
pubDate: 2026-07-01T11:10:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/secondbrain-memory-save-boundary.png"
---

AI 작업 기억의 저장 경계는 `저장한다`와 `버린다`의 이분법으로는 부족하다. 원문을 버리고 행동 기준만 일반화할 수 있는 후보가 있고, 지금은 유용하지만 곧 바뀔 가능성이 있어 만료 조건을 붙여야 하는 후보도 있다.

그래서 질문을 네 가지로 나눴다. **이 후보에는 개인정보가 있는가, 비밀이 있는가, 얼마나 빨리 바뀌는가, 다음 작업의 행동을 실제로 바꾸는가?** 이 네 축을 통과한 결과를 `저장`, `일반화 후 저장`, `만료 포함 저장`, `비저장` 중 하나로 보낸다.

이 글의 사례는 모두 공개 설명용 합성 사례다. 실제 대화, 계정, 업무 기록, 내부 경로를 변형한 것이 아니다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-memory-save-boundary.svg" alt="AI 작업 기억에서 저장할 것, 조심해서 저장할 것, 저장하지 않을 것을 나눈 개념도" />
	<figcaption>이 그림은 실제 memory 저장 구조가 아니라, 안전한 작업 기억을 만들기 위한 저장 경계 개념도다.</figcaption>
</figure>

## memory는 규칙의 유일한 원본이 아니다

2026-07-01에 캡처한 OpenAI Codex memories 문서는 이전 작업의 유용한 context를 다음 작업으로 가져오는 기능을 다음처럼 설명했다.

> [2026-07-01 당시 OpenAI Codex memories 문서](https://developers.openai.com/codex/memories): "Memories let Codex carry useful context"

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-memories-context.png" alt="2026년 7월 1일 OpenAI Codex memories 문서에서 Codex가 유용한 context를 다음 작업으로 가져올 수 있다고 설명한 영역 캡처" />
	<figcaption>2026-07-01에 만든 역사적 캡처다. 2026-07-21 재확인 시 링크는 새 memories 문서로 이동하고 문구와 적용 대상이 달라졌다. 따라서 현재 제품 문구의 완전한 증거로 사용하지 않고, memory가 보조 context라는 당시 설명만 보여준다.</figcaption>
</figure>

Claude Code 문서도 memory를 강제 설정과 구분한다.

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "Claude treats them as context, not enforced configuration."

<figure>
	<img src="/blog/blog-images/official-docs/claude-memory-context-not-enforced.png" alt="Claude Code memory 공식문서에서 memory가 context이지 enforced configuration이 아니라고 설명한 영역 캡처" />
	<figcaption>Claude Code memory 문서 캡처, 확인일 2026-07-01. memory의 성격을 보여주지만, 저장된 기준이 모든 상황에서 자동으로 지켜진다는 보장은 아니다.</figcaption>
</figure>

두 자료에서 가져올 수 있는 안전한 결론은 좁다. memory는 다음 작업에 가져올 context일 수 있지만, 필수 규칙의 유일한 원본이나 현재 사실의 증거로 다루면 안 된다. 따라서 저장할 문장은 “반드시 믿을 사실”보다 “어떤 상황에서 어떤 행동을 할지 다시 확인할 기준”에 가까워야 한다.

## 네 축은 같은 무게로 보지 않는다

네 질문을 단순 합산하면 안 된다. 개인정보와 비밀은 먼저 통과해야 하는 거부 gate이고, 행동 가치는 저장 이유가 있는지를 묻는 gate다. 변동성은 앞의 gate를 통과한 후보를 얼마나 오래 믿을지 결정한다.

| 축 | 묻는 질문 | 판정에 미치는 영향 |
|---|---|---|
| 개인정보 | 특정 사람을 알아보거나 다시 연결할 단서가 있는가 | 원문 저장을 중단한다. 일반화해도 재식별 가능하면 비저장이다. |
| 비밀 | credential, private content, 접근 정보가 있는가 | 유용성이나 자동 점수와 무관하게 비저장이다. |
| 행동 가치 | 다음 작업의 선택, 검증, 중단 조건을 바꾸는가 | 바꾸지 못하면 민감하지 않아도 저장하지 않는다. |
| 변동성 | 시간 경과나 어떤 사건 뒤에 틀릴 수 있는가 | 낮으면 일반 저장, 높으면 만료 시점과 무효화 사건을 붙인다. |

판정 순서는 다음과 같다.

```text
1. 개인정보·비밀 거부 gate
2. 행동 가치 gate
3. 원문 없이 의미가 유지되는지 확인
4. 변동성에 따라 일반 저장 또는 만료 포함 저장
```

`일반화`는 1번을 우회하는 익명화 기법이 아니다. 원문의 구체성이 필요하지 않고, 변환된 기준만으로 출처를 재구성할 수 없으며, 그 기준이 실제 행동을 바꿀 때만 선택할 수 있다.

## 합성 후보 여섯 개를 분류해 본다

아래 inbox는 메커니즘을 설명하기 위해 만든 합성 데이터다.

| 후보 | 네 축에서 본 핵심 | 경로 | 남기는 형태 |
|---|---|---|---|
| 단순 상태 질문에는 결과와 현재 증거를 먼저 보여 달라는 반복 기준 | 민감 정보 없음, 변동성 낮음, 행동 가치 높음 | 저장 | 적용 범위가 `status_check`인 행동 기준 |
| 현재 선택한 이미지 renderer를 기본값으로 쓰라는 기준 | 민감 정보 없음, 변동성 높음, 행동 가치 높음 | 만료 포함 저장 | `verifiedAt`, `expiresAt`, 변경 사건을 함께 기록 |
| 긴 피드백 문단 속 “검증한 것과 미검증을 분리”라는 요구 | 원문에는 불필요한 상황 묘사, 핵심은 일반화 가능 | 일반화 후 저장 | 원문은 버리고 검증 보고 기준만 저장 |
| 재사용을 위해 raw access credential을 남기자는 제안 | 비밀, 행동 가치는 있어 보임 | 비저장 | 어떤 형태로도 memory에 남기지 않음 |
| 한 번 언급된 장식 색상 | 민감하지 않음, 행동 가치 없음 | 비저장 | 저장하지 않음 |
| contact identifier 일부를 가린 문자열 | 개인정보, 단순 마스킹은 재연결 가능 | 비저장 | “익명화했으니 안전하다”로 간주하지 않음 |

네 번째와 다섯 번째 후보가 중요한 반례다. 비밀은 유용해 보여도 저장할 수 없고, 민감하지 않은 정보도 행동 가치가 없으면 저장할 이유가 없다. 저장량을 늘리는 목표를 세우면 두 경계를 모두 놓치기 쉽다.

## 일반화는 원문을 보존하는 일이 아니다

일반화 가능한 후보는 출처의 구체적인 사건을 버리고 재사용 가능한 조건만 남긴다.

```json
{
  "statement": "완료 보고에서 실행한 검증과 미실행 검증을 분리한다.",
  "scope": ["implementation", "publication"],
  "evidenceClass": "explicit_and_repeated",
  "exceptions": ["현재 요청이 더 좁은 보고 형식을 명시함"]
}
```

여기에는 누가 언제 어떤 사건에서 이 요구를 했는지 들어 있지 않다. 그렇다고 모든 민감한 원문을 이런 식으로 바꿀 수 있는 것은 아니다. 원문의 비밀 값이나 개인 식별 관계가 기준의 의미에 필요하다면 변환을 시도하지 않고 비저장으로 끝낸다.

## 변동성이 높으면 시간을 넘어서 사건도 기록한다

`30일 뒤 만료` 같은 TTL만으로는 부족할 때가 있다. 도구 설정은 30일이 지나기 전에도 사용자가 바꾸거나 구성 파일이 바뀌면 바로 낡는다.

```json
{
  "statement": "이미지 export에는 renderer-a를 기본으로 사용한다.",
  "scope": ["image_export"],
  "verifiedAt": "2026-07-21",
  "expiresAt": "2026-08-20",
  "invalidatedBy": ["renderer_default_replaced", "config_changes_renderer"],
  "applicationExceptions": [
    {
      "trigger": "current_request_changes_renderer",
      "applicationDisposition": {
        "applied": false,
        "notAppliedReason": "current_request_changes_renderer"
      }
    }
  ]
}
```

이 항목은 만료일까지 무조건 유효하다는 뜻이 아니다. `renderer_default_replaced`나 `config_changes_renderer`처럼 global default나 실제 source가 바뀌는 `invalidatedBy` 사건이 먼저 발생하면 lifecycle을 `reverify`로 옮기고 현재 근거를 다시 확인해야 한다.

반면 한 task의 현재 요청이 다른 renderer를 명시하는 `current_request_changes_renderer`는 record 자체의 무효화 사건이 아니다. lifecycle을 `reverify`나 `held`로 바꾸지 않고, 그 task의 `applicationDisposition`만 `applied: false`로 남긴다. TTL과 실제 source 사건 기반 무효화의 자세한 충돌 순서는 [stale context를 판정하는 글](/blog/blog/stale-ai-context-check/)에서 다룬다.

## 저장 경계가 결정하지 않는 것

이 글의 판정은 후보가 memory 저장소에 들어갈 자격만 다룬다. 저장 가능한 후보의 evidence와 scope를 사전 검토하고 deterministic `promote`·`hold`·`reject` recommendation을 만드는 책임은 [Promotion Review Queue](/blog/blog/secondbrain-promotion-review-queue/)에 있다. 그 recommendation과 별도로 기록된 최종 승인 record를 받아 `review → promoted`를 실행하고, 이후 재검증 lifecycle을 관리하는 책임은 [SecondBrain 기억 상태 머신](/blog/blog/secondbrain-growth-loop/)에 있다.

저장됐다는 사실도 현재 요청에 적용해도 된다는 뜻이 아니다. runtime에서는 현재 요청과 실제 근거가 우선한다. 저장 단계가 retrieval과 적용까지 미리 결정하려고 하면, 안전한 후보도 잘못된 상황에서 사용될 수 있다.

## 결론

memory 후보는 개인정보·비밀·행동 가치 gate를 먼저 통과해야 한다. 통과하지 못하면 유용해 보여도 저장하지 않는다. 통과한 후보만 원문 보존이 필요한지, 안전한 행동 기준으로 일반화할 수 있는지, 변동성 때문에 만료와 무효화 사건이 필요한지 판단한다.

이 기준에서 `민감하지 않음`은 저장의 충분조건이 아니다. 행동을 바꾸지 않는 정보는 남기지 않는다. `민감함`도 단순 익명화의 허가가 아니다. 다시 연결될 가능성이나 비밀의 의미가 남으면 memory 밖에 둔다.

좋은 저장 경계는 더 많은 기억을 만드는 장치가 아니라, 다음 작업에 필요한 기준만 가장 좁고 갱신 가능한 형태로 남기는 필터다.

## 확인 범위와 한계

- OpenAI Codex memories 캡처는 2026-07-01 당시 페이지의 역사적 화면이며, 2026-07-21 현재 redirect 이후 문구를 증명하지 않는다.
- Claude Code 공식 문서 캡처 확인일은 2026-07-01이다.
- 네 축과 분류표는 공식 제품의 memory 정책이 아니라 공개 가능한 합성 사례에 적용한 운영 판단이다.
- 이 글은 후보 승격 workflow, Graph retrieval, runtime memory 품질을 측정하지 않았다.
