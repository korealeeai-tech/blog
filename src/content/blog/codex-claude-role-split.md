---
title: "Codex와 Claude를 같이 쓸 때 역할을 나누는 법"
description: "AI 코딩 에이전트 두 개를 동시에 쓸 때 구현, 검토, 의사결정 역할을 어떻게 분리하면 좋은지 정리합니다."
pubDate: 2026-07-01T10:10:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/agent-role-split.png"
---

AI 코딩 에이전트를 하나만 쓸 때는 고민이 단순하다. 요청을 주고, 결과를 보고, 부족한 부분을 다시 시키면 된다. 그런데 Codex와 Claude처럼 성격이 다른 도구를 같이 쓰기 시작하면 문제가 달라진다.

둘 다에게 같은 일을 시키면 잠깐은 든든해 보인다. 하지만 실제로는 중복 작업이 늘고, 서로 비슷한 결론을 내리면 사람이 검토를 덜 하게 된다. 반대로 서로 다른 말을 하면 어느 쪽이 맞는지 판단하는 시간이 다시 필요하다.

그래서 나는 AI 에이전트를 같이 쓸 때 "누가 더 똑똑한가"보다 "각자 어떤 실패를 줄일 것인가"를 먼저 정하는 편이 낫다고 본다.

이 글은 2026-07-01 기준으로 OpenAI Codex 공식 문서와 Claude Code 공식 문서를 확인한 뒤, 공개 가능한 일반 경험으로 정리한 운영 방식이다. 도구의 세부 기능은 계속 바뀔 수 있으므로, 여기서는 특정 버전의 기능 비교보다 역할 분리 원칙에 초점을 맞춘다.

<figure>
	<img src="/blog/blog-images/agent-role-split.svg" alt="Codex 구현 라인, Claude 검토 라인, 사람 의사결정 게이트를 분리한 개념도" />
	<figcaption>이 그림은 실제 제품 내부 구조가 아니라 역할 분리를 설명하기 위한 개념도다.</figcaption>
</figure>

## 먼저 확인한 것

Codex 쪽에서는 `AGENTS.md`, skills, hooks, memories 같은 사용자화 장치를 확인했다. 공식 문서 기준으로 `AGENTS.md`는 전역 지침과 프로젝트 지침을 계층적으로 읽어 작업 문맥으로 넣는 방식이고, skills는 반복 워크플로우를 묶는 장치다. memories는 유용한 문맥을 다음 작업에 가져오는 보조 계층으로 설명된다.

Claude Code 쪽에서는 `CLAUDE.md`, auto memory, hooks, subagents 문서를 확인했다. Claude Code 문서는 `CLAUDE.md`와 auto memory를 세션 시작 시 문맥으로 넣지만, 이것을 강제 설정으로 보지는 말라고 설명한다. 어떤 행동을 반드시 막아야 한다면 hook 같은 별도 장치를 써야 한다는 점도 중요하다.

공식 문서 원문을 짧게 보면 경계가 더 분명해진다.

> [OpenAI Codex AGENTS.md 문서](https://developers.openai.com/codex/guides/agents-md): "Codex reads `AGENTS.md` files before doing any work."

나는 이 문장을 `AGENTS.md`가 작업 전 기본 문맥을 잡는 장치라는 뜻으로 읽었다. 다만 이 문장만으로 `AGENTS.md`가 모든 행동을 강제로 막는다고 해석하면 과하다.

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-agents-md-reads.png" alt="OpenAI Codex AGENTS.md 공식문서에서 Codex가 작업 전 AGENTS.md 파일을 읽는다고 설명한 영역 캡처" />
	<figcaption>OpenAI Codex AGENTS.md 문서 캡처, 확인일 2026-07-01. 작업 전 지침 로드 근거를 보여주지만, 지침이 모든 행동을 강제한다는 증거는 아니다.</figcaption>
</figure>

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "Claude treats them as context, not enforced configuration."

그래서 Claude 쪽의 `CLAUDE.md`나 auto memory도 같은 선에서 보았다. 작업 전 참고 문맥으로는 유용하지만, 위험한 행동을 반드시 막아야 할 때는 별도 hook이나 사람의 승인 게이트가 필요하다는 판단이다.

<figure>
	<img src="/blog/blog-images/official-docs/claude-memory-context-not-enforced.png" alt="Claude Code memory 공식문서에서 memory가 context이지 enforced configuration이 아니라고 설명한 영역 캡처" />
	<figcaption>Claude Code memory 문서 캡처, 확인일 2026-07-01. `CLAUDE.md`와 auto memory의 성격을 보여주지만, 모든 상황에서 어떤 지시가 지켜진다는 보장은 아니다.</figcaption>
</figure>

> [Claude Code subagents 문서](https://code.claude.com/docs/en/sub-agents): "Each subagent runs in its own context window"

이 문장은 역할 분리를 생각할 때 중요했다. 같은 대화 안에서 모든 일을 섞기보다, 독립 검토나 조사처럼 별도 문맥이 도움이 되는 일을 분리할 수 있다는 근거로 보았다. 단, 이 글은 특정 도구가 항상 더 낫다는 비교가 아니라 역할 배분 원칙을 정리한 글이다.

<figure>
	<img src="/blog/blog-images/official-docs/claude-subagents-own-context.png" alt="Claude Code subagents 공식문서에서 각 subagent가 자체 context window에서 실행된다고 설명한 영역 캡처" />
	<figcaption>Claude Code subagents 문서 캡처, 확인일 2026-07-01. 별도 문맥에서 작업할 수 있다는 근거이며, 이 글의 역할 분리 방식 자체를 공식 권장안으로 증명하는 이미지는 아니다.</figcaption>
</figure>

내가 여기서 가져간 결론은 단순하다. 두 도구 모두 "AI에게 규칙을 읽힌다"는 흐름은 있지만, 규칙을 읽었다고 해서 결과가 자동으로 안전해지는 것은 아니다. 역할을 나누고, 검증 기준을 따로 둬야 한다.

## 같은 일을 두 번 시키면 검증이 되지 않는다

처음에는 두 에이전트에게 같은 문제를 던져보고 답을 비교하는 방식이 좋아 보였다. 하지만 이 방식은 생각보다 자주 애매해진다.

예를 들어 둘 다 비슷한 해결책을 제안하면, 사람은 "둘 다 그렇게 말했으니 맞겠지"라고 느끼기 쉽다. 하지만 둘이 같은 전제를 잘못 잡았을 수도 있다. 반대로 서로 다른 해결책을 내면, 비교 자체가 새로운 작업이 된다. 그때 기준이 없으면 결국 더 그럴듯한 문장을 고르게 된다.

그래서 나는 같은 문제를 두 번 푸는 방식보다 역할을 다르게 주는 방식이 낫다고 생각한다.

한 에이전트는 실행을 맡긴다. 파일을 읽고, 변경하고, 빌드하고, 작은 검증을 돌린다. 다른 에이전트는 실행 결과를 그대로 따라 하지 않고, 전제와 누락을 본다. 이 접근은 완벽하지 않지만, 적어도 "두 명이 같은 방향으로 착각하는 상황"을 줄이는 데 도움이 된다.

## 구현 담당과 검토 담당을 분리한다

내 기준에서 Codex는 작업을 끝까지 끌고 가는 구현 담당에 가깝다. 로컬 파일을 읽고, 수정하고, 테스트하고, 최종 상태를 보고하는 흐름에 잘 맞는다. 특히 repo 안의 규칙, 빌드 명령, 공개 repo 안전 체크처럼 결과물과 검증이 연결된 작업에서는 한 흐름으로 밀고 가는 것이 효율적이다.

Claude는 별도 관점의 검토 담당으로 둘 때 유용하다. 초안 계획의 약한 가정, 놓친 대안, 너무 빠른 결론, 글의 설득력 같은 것을 독립적으로 보게 한다. 물론 Claude가 항상 맞는다는 뜻은 아니다. 검토 결과도 근거를 확인해야 한다.

중요한 것은 구현 담당에게 "네가 만든 결과를 네가 객관적으로 검토해"라고만 맡기지 않는 것이다. AI는 자신이 방금 만든 구조를 자연스럽게 옹호할 수 있다. 사람이 보기에도 그럴듯한 설명을 붙일 수 있다. 그래서 검토 담당에게는 구현 담당의 결론을 다시 만드는 일이 아니라, 반례와 누락을 찾는 일을 준다.

내가 자주 쓰는 분리는 이런 식이다.

- 구현 담당: 실제 변경, 빌드, 테스트, diff 정리
- 검토 담당: 전제 확인, 빠진 위험, 다른 선택지, 과장된 설명 찾기
- 사람: 범위 결정, 위험 수용, 최종 발행 또는 중단

이렇게 나누면 에이전트가 많아져도 책임이 흐려지지 않는다.

## 사람의 결정 게이트를 남긴다

두 AI가 모두 괜찮다고 말해도 사람이 봐야 하는 지점이 있다. 특히 public repo, 외부 발행, 비용 발생, 계정 연결, 데이터 노출 가능성이 있는 작업은 AI의 판단만으로 끝내면 안 된다.

AI가 잘하는 것은 후보를 만들고, 반복 작업을 줄이고, 명시된 기준에 맞춰 확인하는 일이다. 사람이 해야 하는 것은 그 기준이 맞는지, 이번 작업에서 감수할 위험이 무엇인지, 공개해도 되는 내용인지 결정하는 일이다.

이 차이를 흐리면 AI 협업은 빠르지만 위험한 흐름이 된다. 반대로 사람의 결정 게이트를 분명히 두면, AI는 훨씬 공격적으로 일을 진행해도 된다. 어디서 멈춰야 하는지 알고 있기 때문이다.

## 좋은 역할 분리 프롬프트

두 에이전트를 쓸 때 프롬프트도 다르게 줘야 한다. 같은 문장을 복사해서 넣으면 결과도 비슷해진다.

구현 담당에게는 이런 식이 낫다.

```text
요청 범위 안에서 필요한 파일을 확인하고 수정해줘.
수정 후 가장 좁은 검증을 실행하고, 실패하면 원인을 정리해줘.
공개되면 안 되는 정보는 파일명, 이미지, build output까지 검사해줘.
```

검토 담당에게는 이렇게 묻는다.

```text
이 계획에서 약한 가정, 빠진 검증, 공개하면 위험한 표현을 찾아줘.
구현을 다시 하지 말고, 반례와 중단 조건을 우선해서 봐줘.
확인한 것과 추정한 것을 분리해서 말해줘.
```

두 프롬프트의 목적이 다르다. 하나는 일을 끝내는 쪽이고, 다른 하나는 멈춰야 할 이유를 찾는 쪽이다.

## 너무 많은 에이전트가 항상 좋은 것은 아니다

에이전트를 늘리면 병렬성이 생긴다. 하지만 동시에 비용, 문맥 정리, 결과 병합 부담도 늘어난다. 특히 작은 글 하나, 단순한 버그 하나, 짧은 문서 수정 하나에 여러 에이전트를 붙이면 오히려 판단 시간이 길어진다.

나는 보통 다음 조건 중 하나가 있을 때만 역할 분리를 적극적으로 쓴다.

- 공개 발행처럼 되돌리기 어려운 작업
- 설계 선택지가 여러 개인 작업
- 검증 범위가 넓은 작업
- 한 에이전트가 만든 결론을 독립적으로 의심해야 하는 작업
- 긴 문맥 때문에 메인 대화가 쉽게 흐려지는 작업

작업이 작으면 한 에이전트와 사람 검토만으로 충분하다.

## 내가 남긴 기준

Codex와 Claude를 같이 쓴다는 것은 두 답변 중 더 마음에 드는 것을 고르는 일이 아니다. 구현, 검토, 결정의 역할을 분리하는 일에 가깝다.

Codex가 실제 파일 변경과 검증을 맡고, Claude가 전제와 반례를 보며, 사람이 공개 여부와 위험 수용을 결정한다. 이 구조는 도구 이름이 바뀌어도 유지할 수 있다.

물론 이 방식도 만능은 아니다. 두 도구가 모두 같은 공개 문서나 같은 사용자의 설명에 의존하면 같은 빈틈을 놓칠 수 있다. 그래서 마지막에는 항상 실제 파일, 실제 빌드, 공식 문서, 공개 안전 검사를 다시 봐야 한다.

내가 얻은 가장 현실적인 결론은 이것이다. AI를 여러 개 쓰는 것보다, 각 AI에게 서로 다른 책임을 주는 것이 더 중요하다.

## 확인 기준

- OpenAI Codex 문서: [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [Agent Skills](https://developers.openai.com/codex/skills), [Hooks](https://developers.openai.com/codex/hooks), [Memories](https://developers.openai.com/codex/memories)
- Claude Code 문서: [Overview](https://code.claude.com/docs/en/overview), [How Claude remembers your project](https://code.claude.com/docs/en/memory), [Hooks reference](https://code.claude.com/docs/en/hooks), [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- 확인일: 2026-07-01
