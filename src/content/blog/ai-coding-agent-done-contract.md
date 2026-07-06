---
title: "AI 코딩 에이전트에게 일을 맡길 때 ‘완료’는 무엇이어야 하나"
description: "AI 코딩 에이전트가 코드를 만들고 PR을 열었다는 사실과 사람이 넘겨받아도 되는 완료 상태를 구분하는 기준을 정리합니다."
pubDate: 2026-07-06T11:33:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/coding-agent-done-contract.png"
---

AI 코딩 에이전트에게 일을 맡기면 결과가 생각보다 빨리 나온다. 파일이 바뀌고, 커밋이 생기고, PR이 열리고, 때로는 테스트 결과까지 붙는다. 그래서 쉽게 "끝났다"고 느끼게 된다.

하지만 나는 이제 그 순간을 완료라고 부르지 않으려고 한다. AI가 만든 결과물이 있다는 것과, 사람이 책임지고 넘겨받아도 되는 상태는 다르다. 전자는 산출물이고, 후자는 완료다.

이 차이를 흐리면 문제가 생긴다. 초안 UI를 만들었는데 실제 동작은 없을 수 있다. 테스트 이름은 보이지만 실패한 테스트를 고치지 않았을 수 있다. 보안 스캔을 했다고 말하지만 어떤 범위를 봤는지 모를 수 있다. PR이 열렸지만 요구사항의 핵심은 빠졌을 수도 있다.

그래서 AI 코딩 에이전트에게 일을 맡길 때는 "무엇을 만들어라"만큼이나 "무엇이 확인되면 완료로 볼 것인가"를 먼저 정해야 한다.

<figure>
	<img src="/blog/blog-images/coding-agent-done-contract.svg" alt="AI 코딩 에이전트의 완료를 변경, 검증, 사람 검토, 인수인계 가능 상태로 나누어 보는 개념도" />
	<figcaption>이 그림은 실제 도구 화면이나 특정 프로젝트 구조가 아니라, AI 코딩 에이전트의 완료 판단 기준을 단순화한 개념도다.</figcaption>
</figure>

## 먼저 확인한 것

이 글은 특정 회사나 프로젝트의 내부 사례가 아니라, 공개 문서와 개인적인 운영 기준을 바탕으로 정리했다. 확인일은 2026년 7월 6일이다. 아래 캡처는 각 문헌의 본문 일부를 보여주는 근거 이미지이며, 캡처된 문장 밖의 제품 동작 전체를 증명하지는 않는다.

GitHub는 Copilot coding agent를 소개하면서, 이 에이전트가 GitHub Actions 기반 환경에서 일하고 pull request를 제출한다고 설명한다.

> [GitHub Blog](https://github.blog/news-insights/product-news/github-copilot-meet-the-new-coding-agent/): "submits its work as a pull request."

같은 글에서는 agent가 완료되면 사람에게 review를 요청하고, 기존 branch protection 같은 정책도 계속 적용된다고 설명한다. 내가 여기서 얻은 기준은 단순하다. 에이전트가 PR을 만들 수 있다는 말은 사람이 검토할 지점이 생긴다는 뜻이지, 검토가 사라진다는 뜻은 아니다.

<figure>
	<img src="/blog/blog-images/official-docs/coding-agent-done-contract/github-copilot-agent-pr.png" alt="GitHub Blog에서 Copilot coding agent가 GitHub Actions에서 실행되고 pull request로 작업을 제출한다고 설명한 영역 캡처" />
	<figcaption>GitHub Blog 캡처, 확인일 2026-07-06. Copilot coding agent가 pull request를 만든다는 설명을 보여주며, PR이 자동으로 완료 상태라는 뜻은 아니다.</figcaption>
</figure>

OpenAI Cookbook의 agent improvement loop 예시는 traces, feedback, evals, evidence를 연결해 다음 harness 변경을 제안하는 흐름을 설명한다.

> [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop): "use the resulting evidence"

여기서 중요한 단어는 evidence다. 에이전트가 무언가를 했다는 기록만으로는 부족하고, 그 결과를 다시 실행하거나 판단할 수 있는 증거로 바꿔야 한다.

<figure>
	<img src="/blog/blog-images/official-docs/coding-agent-done-contract/openai-agent-improvement-evidence.png" alt="OpenAI Cookbook에서 traces, feedback, evals, evidence를 연결해 agent improvement loop를 설명한 영역 캡처" />
	<figcaption>OpenAI Cookbook 캡처, 확인일 2026-07-06. evidence를 다음 harness 변경에 연결한다는 설명을 보여주며, 이 글의 완료 기준이 OpenAI의 공식 절차라는 뜻은 아니다.</figcaption>
</figure>

Anthropic의 agent 글도 비슷한 경계를 준다. 에이전트가 가치를 내는 조건으로 clear success criteria, feedback loops, human oversight를 함께 언급한다.

> [Anthropic](https://www.anthropic.com/engineering/building-effective-agents): "clear success criteria, enable feedback loops"

나는 이 세 출처를 이렇게 해석한다. AI 코딩 에이전트의 방향은 점점 더 자율적인 실행으로 가고 있지만, 완료 기준은 오히려 더 명확해야 한다. 작업을 맡기는 순간 사람이 덜 보는 것이 아니라, 무엇을 봐야 하는지 더 분명히 정해야 한다.

<figure>
	<img src="/blog/blog-images/official-docs/coding-agent-done-contract/anthropic-agent-success-criteria.png" alt="Anthropic 글에서 clear success criteria, feedback loops, human oversight를 언급한 영역 캡처" />
	<figcaption>Anthropic 글 캡처, 확인일 2026-07-06. agent가 가치 있는 작업 조건으로 성공 기준, 피드백 루프, 사람의 감독을 언급한 영역이며, 모든 agent 작업에 같은 운영 절차가 필요하다는 증거는 아니다.</figcaption>
</figure>

## PR이 열렸다고 완료는 아니다

PR은 좋은 중간 산출물이다. 변경 내용을 한곳에 모으고, diff를 보여주고, CI를 붙이고, 리뷰를 시작할 수 있게 해준다. 하지만 PR이 열렸다는 사실은 완료의 증거가 아니라 검토 가능한 단위가 생겼다는 뜻에 가깝다.

AI가 PR을 열었을 때 내가 먼저 보는 것은 "그럴듯한가"가 아니다.

```text
요구사항의 핵심이 diff에 실제로 들어갔는가
테스트나 빌드가 이번 변경을 의미 있게 건드리는가
실패한 검증이 숨겨져 있지 않은가
사람이 리뷰할 수 있도록 의도와 한계가 설명되어 있는가
되돌리거나 이어서 고칠 수 있는 단위인가
```

이 질문에 답할 수 없으면 아직 완료가 아니다. 아무리 PR 설명이 깔끔해도, 핵심 동작을 확인할 증거가 없으면 완료라고 부르기 어렵다.

## 완료를 세 단계로 나누면 덜 속는다

AI 작업에서 가장 헷갈리는 지점은 "무언가 생긴 상태"와 "쓸 수 있는 상태"가 비슷해 보인다는 점이다. 그래서 나는 완료를 세 단계로 나눠서 본다.

첫 번째는 산출물 완료다. 파일이 생성됐고, 코드가 바뀌었고, 문서가 작성된 상태다. 이 단계는 눈에 잘 보인다. 그래서 AI도 자신 있게 완료라고 말하기 쉽다.

두 번째는 검증 완료다. 빌드, 테스트, 타입 체크, 링크 확인, 보안 스캔, smoke check처럼 작업 성격에 맞는 확인이 통과한 상태다. 여기서부터는 말보다 실행 결과가 중요하다.

세 번째는 인수인계 완료다. 다음 사람이 무엇이 바뀌었는지, 어떤 검증을 했는지, 무엇은 확인하지 못했는지 알 수 있는 상태다. 이 단계가 빠지면 당장은 문제가 없어 보여도 나중에 추적 비용이 커진다.

내 기준에서 완료는 세 번째까지 와야 한다. 산출물만 있으면 "작성됨"이고, 검증까지 있으면 "확인됨"이고, 인수인계까지 가능하면 그때 "완료"에 가까워진다.

## 완료 계약은 작업 전에 정한다

AI에게 일을 맡긴 뒤에 완료 기준을 붙이면 기준이 약해진다. 이미 나온 결과에 맞춰 "이 정도면 됐나?"라고 판단하게 되기 때문이다.

그래서 작업 전에 짧은 완료 계약을 만든다. 형식은 복잡할 필요가 없다.

```text
목표:
이번 작업에서 실제로 바뀌어야 하는 것

제외:
이번 작업에서 하지 않을 것

검증:
완료 전에 반드시 실행하거나 확인할 것

사람 검토:
자동 검증으로 판단할 수 없어서 사람이 봐야 하는 것

한계:
이번 작업에서 확인하지 못하면 최종 보고에 남길 것
```

이 계약이 있으면 AI도 사람도 같은 기준으로 결과를 본다. 특히 제외 기준이 중요하다. 제외 기준이 없으면 AI는 선의로 범위를 넓히기 쉽고, 사람은 나중에 "이것도 된 줄 알았다"고 오해하기 쉽다.

## 표면마다 완료 증거가 다르다

모든 작업에 같은 검증을 붙일 수는 없다. 작은 문서 수정과 사용자-facing UI 변경, backend API 변경, data migration은 완료 증거가 다르다.

문서나 블로그 글이라면 frontmatter, 이미지 존재 여부, build, 링크, 공개 안전 검색이 중요하다. UI 변경이라면 screenshot, responsive 확인, 접근 경로, console error 여부를 봐야 한다. backend 변경이라면 unit test뿐 아니라 API response, error path, log, schema 영향도까지 봐야 할 수 있다. data migration이나 운영 변경이라면 rollback, backup, dry-run, 영향 범위가 없으면 완료라고 말하기 어렵다.

중요한 것은 검증을 많이 붙이는 것이 아니다. 변경한 표면에 맞는 증거를 붙이는 것이다. AI가 코드를 많이 바꿨다고 해서 모든 검증이 좋아지는 것은 아니다. 오히려 검증 없이 변경이 커지면 위험만 커진다.

## AI self-review는 독립 검토가 아니다

최근 AI 코딩 도구들은 self-review, security scanning, session logs 같은 기능을 점점 더 붙이고 있다. GitHub도 Copilot coding agent의 최근 업데이트에서 built-in security scanning과 self-review를 언급한다.

> [GitHub Blog](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/): "self-review, built-in security scanning"

이런 기능은 분명 도움이 된다. 특히 secret scanning이나 dependency vulnerability check처럼 반복 가능한 검사는 사람이 놓칠 수 있는 부분을 줄여준다.

<figure>
	<img src="/blog/blog-images/official-docs/coding-agent-done-contract/github-copilot-agent-self-review.png" alt="GitHub Blog에서 Copilot coding agent의 self-review와 built-in security scanning을 언급한 영역 캡처" />
	<figcaption>GitHub Blog 캡처, 확인일 2026-07-06. self-review와 built-in security scanning이 언급된 영역이며, 이 기능들이 독립적인 사람 검토를 대체한다는 뜻은 아니다.</figcaption>
</figure>

하지만 self-review는 독립 검토가 아니다. 같은 목표와 같은 맥락에서 만든 결과를 다시 보는 것이기 때문에, 애초에 놓친 요구사항이나 잘못 잡은 성공 기준을 그대로 통과시킬 수 있다. security scanning도 모든 보안 문제를 증명하는 장치가 아니다. 알려진 패턴과 설정된 범위 안에서 위험 신호를 잡는 장치에 가깝다.

그래서 나는 AI self-review를 "검토 완료"가 아니라 "사람 검토 전에 추가로 받은 신호"로 본다. 이 신호는 좋지만, 마지막 판단을 대체하지는 않는다.

## 내가 쓰는 완료 보고 형식

AI가 작업을 마쳤다고 할 때, 나는 보통 이런 형식의 보고를 기대한다.

```text
변경:
어떤 파일이나 기능이 바뀌었는가

검증:
어떤 명령, 테스트, 화면, 로그, 링크를 확인했는가

결과:
각 검증이 통과했는가, 실패했다면 무엇을 고쳤는가

미확인:
시간, 권한, 환경, 범위 때문에 확인하지 못한 것은 무엇인가

리뷰 포인트:
사람이 특히 봐야 하는 판단 지점은 무엇인가
```

이 형식의 장점은 완료를 과장하기 어렵다는 점이다. 검증하지 못한 것이 있으면 미확인에 남겨야 한다. 사람 검토가 필요한 부분도 숨길 수 없다. AI가 만든 결과를 사람이 이어받을 수 있는 기록으로 바꾸는 데 도움이 된다.

## 좋은 완료 기준은 AI를 느리게 만드는 것이 아니다

완료 기준을 촘촘하게 잡으면 AI 사용이 느려질 것처럼 보인다. 실제로 아주 작은 작업에서는 그렇게 느껴질 수 있다.

하지만 중간 크기 이상의 작업에서는 반대인 경우가 많다. 완료 기준이 없으면 AI는 빠르게 만들고, 사람은 늦게 의심한다. 기준이 있으면 AI는 조금 천천히 만들지만, 사람은 훨씬 빨리 판단한다.

특히 여러 번 이어지는 작업에서는 완료 기준이 다음 작업의 시작점이 된다. 무엇을 확인했고 무엇을 확인하지 않았는지 남아 있으면, 다음 에이전트나 다음 세션이 같은 확인을 반복하지 않아도 된다. 반대로 "완료"라는 말만 남아 있으면 다음 사람은 처음부터 다시 의심해야 한다.

## 내가 남긴 기준

AI 코딩 에이전트에게 일을 맡길 때 완료는 "결과물이 생겼다"가 아니다. 사람이 검토하고, 위험을 판단하고, 필요하면 이어서 고칠 수 있는 상태여야 한다.

그래서 나는 완료를 네 가지로 본다.

```text
변경이 실제로 존재한다.
변경한 표면에 맞는 검증 증거가 있다.
자동 검증으로 판단할 수 없는 부분을 사람이 봤거나 볼 수 있게 남겼다.
확인하지 못한 한계가 숨겨져 있지 않다.
```

AI가 더 많은 일을 하게 될수록 완료 기준은 더 중요해진다. 에이전트가 PR을 열고, 테스트를 돌리고, security scan을 붙이는 시대에도 마지막 질문은 그대로 남는다.

이 결과를 사람이 책임지고 넘겨받아도 되는가.

그 질문에 답할 증거가 있을 때만 완료라고 부르는 편이 낫다.

## 확인 기준

- GitHub Blog: [GitHub Copilot: Meet the new coding agent](https://github.blog/news-insights/product-news/github-copilot-meet-the-new-coding-agent/), [What’s new with GitHub Copilot coding agent](https://github.blog/ai-and-ml/github-copilot/whats-new-with-github-copilot-coding-agent/)
- OpenAI Cookbook: [Build an Agent Improvement Loop with Traces, Evals, and Codex](https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop)
- Anthropic: [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- 확인일: 2026-07-06
- 이 글은 특정 도구의 완전한 보안·품질 보증 절차가 아니라, AI 코딩 에이전트 결과를 사람이 넘겨받기 위한 개인 운영 기준이다.
