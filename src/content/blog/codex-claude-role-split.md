---
title: "AI 에이전트 둘을 같이 쓸 때 역할을 고르는 법"
description: "두 에이전트를 중복 풀이, 구현자·비판적 검토자, 독립 조사 lane 중 어디에 배치할지 작업 조건과 역할 계약으로 판단합니다."
pubDate: 2026-07-01T10:10:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/agent-role-split.png"
---

AI 에이전트를 둘 쓸 수 있다고 해서 곧바로 두 배의 검증이 생기지는 않는다. 같은 prompt와 같은 자료를 받은 두 에이전트는 같은 전제를 놓칠 수 있다. 서로 다른 답을 내도 어느 쪽을 선택할 기준이 없다면 통합 작업만 늘어난다.

이 글의 질문은 제품별 고정 배역이 아니다. **어떤 조건에서 같은 문제를 중복 풀이하고, 구현자와 비판적 검토자로 나누고, 독립 조사 lane으로 분리할 것인가.** 도구 이름보다 독립성, 공유 전제, 통합 비용, 실패 비용을 먼저 본다.

<figure>
	<img src="/blog/blog-images/agent-role-split.svg" alt="두 AI 에이전트를 중복 풀이, 구현과 비판적 검토, 독립 조사 lane으로 배치하고 사람이 통합하는 개념도" />
	<figcaption>이 그림은 특정 제품의 내부 구조나 우열이 아니라 두 에이전트의 작업 관계를 설명하는 개념도다.</figcaption>
</figure>

## 공식 문서는 역할 우열을 정해주지 않는다

OpenAI Codex 문서는 `AGENTS.md`가 작업 전 지침을 제공하는 공식 표면임을 설명한다.

> [OpenAI Codex AGENTS.md 문서](https://developers.openai.com/codex/guides/agents-md): "Codex reads `AGENTS.md` files before doing any work."

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-agents-md-reads.png" alt="OpenAI Codex AGENTS.md 공식문서에서 Codex가 작업 전 AGENTS.md 파일을 읽는다고 설명한 영역 캡처" />
	<figcaption>OpenAI Codex AGENTS.md 문서 캡처, 확인일 2026-07-01. 작업 전 지침을 줄 수 있다는 근거이며, 특정 역할에서 다른 제품보다 낫다는 증거는 아니다.</figcaption>
</figure>

Claude Code memory 문서는 memory와 instruction을 강제 설정이 아니라 context로 구분한다.

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "Claude treats them as context, not enforced configuration."

<figure>
	<img src="/blog/blog-images/official-docs/claude-memory-context-not-enforced.png" alt="Claude Code memory 공식문서에서 memory가 context이지 enforced configuration이 아니라고 설명한 영역 캡처" />
	<figcaption>Claude Code memory 문서 캡처, 확인일 2026-07-01. 지침의 성격을 보여주지만 어떤 역할 분리가 더 정확한지는 말하지 않는다.</figcaption>
</figure>

Claude Code subagents 문서는 별도 context window에서 subagent를 실행할 수 있다고 설명한다.

> [Claude Code subagents 문서](https://code.claude.com/docs/en/sub-agents): "Each subagent runs in its own context window"

<figure>
	<img src="/blog/blog-images/official-docs/claude-subagents-own-context.png" alt="Claude Code subagents 공식문서에서 각 subagent가 자체 context window에서 실행된다고 설명한 영역 캡처" />
	<figcaption>Claude Code subagents 문서 캡처, 확인일 2026-07-01. 별도 문맥의 작업 단위를 만들 수 있다는 기능 근거이며, 두 에이전트를 쓰면 품질이 오른다는 증거는 아니다.</figcaption>
</figure>

이 자료로 확인할 수 있는 것은 지침을 제공하고 작업 문맥을 분리할 수 있다는 기능 범위까지다. “한 제품은 구현, 다른 제품은 검토에 적합하다”거나 두 제품의 상대적 품질이 어떻다는 결론은 이 공식 문서들이 증명하지 않는다.

## 먼저 네 가지 조건을 판정한다

두 에이전트가 필요한지 판단할 때 다음 네 축을 본다.

| 조건 | 낮을 때 | 높을 때 |
|---|---|---|
| 독립성 | 같은 파일·상태·결정을 공유해야 함 | 서로의 중간 결과 없이도 의미 있는 산출 가능 |
| 공유 전제 | 서로 다른 자료와 검증 경로를 쓸 수 있음 | 같은 요구 해석이나 source에 함께 의존 |
| 통합 비용 | 결과를 나란히 비교하거나 단순 결합 가능 | 충돌 해결과 재검증이 별도 작업이 됨 |
| 실패 비용 | 틀려도 즉시 되돌리고 자동 검증 가능 | 공개·보안·호환성 손실처럼 놓치기 어려움 |

독립성이 높다는 말은 단지 파일이 다르다는 뜻이 아니다. 한 lane이 지연되거나 반대 결론을 내도 다른 lane의 산출물이 여전히 쓸모 있어야 한다. 공유 전제가 높으면 context를 분리해도 같은 오해가 복제될 수 있다.

## 세 운영 형태와 한 에이전트 선택

네 조건을 조합하면 선택지가 선명해진다.

| 운영 형태 | 맞는 조건 | 얻는 것 | 주요 비용 |
|---|---|---|---|
| 같은 문제 중복 풀이 | 해답을 같은 rubric으로 비교할 수 있고, 독립 입력을 줄 수 있으며, 실패 비용이 큼 | 서로 다른 해결 경로와 불일치 신호 | 두 결과를 판정하고 버릴 비용 |
| 구현자 + 비판적 검토자 | 하나의 변경 산출물이 필요하고 실패 비용이 크며, 검토자가 diff와 증거를 독립적으로 볼 수 있음 | 실행 책임과 반례 탐색 분리 | 검토자가 구현자의 전제를 그대로 물려받을 위험 |
| 독립 조사 lane | 질문을 source·surface별로 분해할 수 있고 통합 계약이 명확함 | 조사 시간을 겹쳐 쓰지 않고 서로 다른 근거 수집 | 경계 누락과 상반된 결론 통합 |
| 한 에이전트 | 작업이 작고 자동 검증이 강하며 통합 비용이 결과 가치보다 큼 | 가장 낮은 조정 비용 | 독립적인 반례 탐색이 없음 |

중복 풀이는 두 답이 같으면 참이라는 투표가 아니다. 동일 rubric에서 서로 다른 근거 경로가 같은 결론에 도달했는지 보는 방식이다. 독립 조사 lane은 같은 질문을 두 번 풀지 않는다. 예를 들어 한 lane은 API specification, 다른 lane은 저장소의 실제 호출부를 조사하고 정해진 항목으로 결과를 넘긴다.

## 합성 변경 요청에 세 방식을 적용해 본다

가상의 Markdown renderer가 외부 링크를 새 탭으로 열 때 `rel="noopener noreferrer"`를 붙이도록 바꾼다고 하자. `/guide/start`, `#section` 같은 내부 링크에는 이 정책을 적용하지 않고 기존 href와 attribute를 보존해야 한다. 수정 범위는 renderer와 focused test로 제한한다.

어떤 문서와 source를 읽어 이 contract를 확인할지는 [Doc-first evidence routing](/blog/blog/doc-first-ai-coding/)의 질문이다. 이 사례는 task contract와 evidence route가 이미 정해졌다고 가정하고, 두 에이전트에게 어떤 책임을 줄지만 판단한다.

이 작업을 네 축으로 보면 다음과 같다.

- 독립성: 두 구현이 같은 link-rendering 분기와 같은 fixture를 바꾸므로 낮다.
- 공유 전제: 외부·내부 링크 구분과 보존해야 할 attribute contract를 함께 이해해야 하므로 높다.
- 통합 비용: 두 patch를 합치면 같은 renderer 충돌뿐 아니라 escaping과 attribute 순서 차이를 다시 판정해야 하므로 높다.
- 실패 비용: 외부 링크에서 정책을 빠뜨리거나 내부 링크까지 바꾸면 공개 안전 경계나 navigation을 손상할 수 있어 무시하기 어렵다.

두 에이전트에게 전체 구현을 각각 시키면 외부 링크 판별 방식을 두 개 볼 수 있다는 이점은 있다. 하지만 같은 renderer와 fixture를 두 번 수정한 뒤 하나를 버리거나 병합해야 한다. link classification과 attribute 출력을 독립 조사 lane으로 나누면 각 결과는 나와도 최종 HTML contract의 책임이 두 lane 사이에 걸린다.

따라서 이 조건에서는 구현자와 비판적 검토자 분리가 더 맞다. 구현자는 외부 `https://example.net` 링크에 정책을 적용하고 내부 path, fragment, `mailto:` fixture가 그대로 남는 focused test와 patch를 만든다. 검토자는 새 구현을 다시 쓰지 않고, link 분류의 누락과 내부 링크 회귀, test가 실제 attribute를 판정하는지 diff와 실행 결과에서 찾는다.

다만 요청이 “후보 sanitization library 두 개의 primary documentation과 migration risk를 비교하라”로 바뀌면 독립 조사 lane이 유리해진다. 각 lane이 다른 후보의 지원 범위, escaping 기본값, migration 제약을 같은 항목으로 넘길 수 있기 때문이다. 반대로 이미 지원되는 `rel` 동작의 expected fixture 한 줄만 고치는 deterministic 작업이라면 한 에이전트가 더 낫다.

## 역할 이름보다 input·forbidden·output을 고정한다

“구현 담당”, “검토 담당”이라는 이름만 주면 두 에이전트가 다시 같은 일을 할 수 있다. 역할을 재현하려면 계약이 필요하다.

| 역할 | Input | Forbidden | Output |
|---|---|---|---|
| 구현자 | 요구사항, 허용 파일, 기존 pattern, 성공·제외 기준, 실행할 test | 범위 밖 refactor, 검증 생략, 확인하지 않은 완료 주장 | patch, 명령과 exit 결과, 미확인 항목 |
| 비판적 검토자 | 원 요구사항, baseline, 최종 diff, test output, 알려진 한계 | 파일 수정, 구현자의 설명만 근거로 승인, 취향 차이를 결함으로 과장 | 근거 위치가 있는 누락·반례·위험, 심각도, 통과 또는 중단 권고 |
| 조사 lane | 한 개의 독립 질문, 허용 source, 공통 비교 항목, 마감 조건 | 다른 lane 질문까지 확장, 2차 자료만으로 제품 사실 단정 | 확인 사실, 해석, 반례, 미검증 gap, 통합 가능한 정해진 형식 |

비판적 검토자에게 구현자의 긴 사고 과정을 모두 줄 필요도 없다. 원 요구사항과 실제 diff, 실행 증거를 먼저 주면 결과 설명에 끌려갈 가능성을 줄일 수 있다. 반대로 repo 규칙이나 성공 기준까지 숨기면 검토자가 엉뚱한 기준으로 결함을 만들 수 있다. 독립성은 정보가 적다는 뜻이 아니라 **결론을 미리 정해 주지 않는 것**에 가깝다.

## 두 에이전트가 오히려 나빠지는 반례

작은 작업에서는 두 번째 에이전트의 prompt 작성, context 전달, 결과 통합이 수정 자체보다 오래 걸릴 수 있다. 같은 공식 문장과 같은 잘못된 fixture만 본다면 에이전트 수가 늘어도 근거 독립성은 늘지 않는다. 자동 test가 명확하게 실패를 잡는 변환 작업에서는 두 번째 자연어 검토보다 test 하나가 더 직접적일 수도 있다.

합의 비용도 제한 조건이다. 두 답이 다를 때 사람이 판정할 전문 지식이나 실행 환경이 없다면, 에이전트를 추가한 것이 불확실성을 해소하지 않고 두 개의 그럴듯한 주장으로 늘릴 수 있다. 이때는 새 에이전트보다 검증 가능한 최소 사례나 primary source를 먼저 확보해야 한다.

또한 구현자·검토자 구조는 검토의 독립성을 자동으로 보장하지 않는다. 검토자가 같은 prompt의 표현, 같은 결론 요약, 같은 실패한 test에 의존하면 역할 이름만 다르다. 반례를 찾는 source와 판정 기준을 별도로 주지 못한다면 한 에이전트와 강한 자동 검증이 더 정직한 선택이다.

## 결론과 한계

두 에이전트의 역할은 제품 이름으로 고정할 일이 아니다. 같은 문제를 독립 근거로 비교할 수 있으면 중복 풀이, 하나의 산출물에 별도 반례 탐색이 필요하면 구현자·비판적 검토자, 질문을 실제로 분리할 수 있으면 독립 조사 lane을 선택한다. 통합 비용이 더 크면 한 에이전트로 돌아간다.

이 글의 decision matrix와 Markdown renderer 사례는 운영 결정을 설명하는 합성 도구다. 두 모델을 같은 task에서 반복 실행해 정확도, token, latency, 비용을 측정하지 않았다. 제품 기능과 모델 동작도 바뀔 수 있다. 실제 팀에서는 중요한 실패 유형을 먼저 정하고, 두 에이전트가 그 유형을 한 에이전트보다 더 자주 찾는지 대표 task로 확인해야 한다.

[AI 코딩 에이전트의 완료 계약](/blog/blog/ai-coding-agent-done-contract/)은 최종 산출물을 사람이 넘겨받을 증거를 다룬다. 이 글의 역할 계약은 그 이전에 누가 어떤 입력을 받고 무엇을 산출할지 정하는 데까지만 책임진다.

## 확인 기준

- OpenAI Codex 문서: [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- Claude Code 문서: [How Claude remembers your project](https://code.claude.com/docs/en/memory), [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- 공식 문서와 기존 캡처 확인일: 2026-07-01
- 공식 문서는 각 제품 기능의 존재 범위만 뒷받침하며, 이 글은 제품·모델의 역할 우열을 주장하지 않는다.
