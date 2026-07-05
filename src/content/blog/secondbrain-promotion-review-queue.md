---
title: "좋은 기억과 나쁜 기억을 가르는 Promotion Review Queue"
description: "AI memory 후보를 바로 믿지 않고 근거, 적용 범위, 민감성, 현재 요청과의 충돌 가능성으로 심사하는 Promotion Review Queue 개념을 정리합니다."
pubDate: 2026-07-02T16:20:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/secondbrain-promotion-review-queue.png"
---

AI memory를 만들 때 가장 어려운 질문은 "무엇을 기억할까"가 아니다. 더 어려운 질문은 "무엇을 기억으로 승격하지 않을까"다.

처음에는 모든 피드백이 중요해 보인다. 사용자가 어떤 표현을 좋아했는지, 어떤 검증을 요구했는지, 어떤 실수를 지적했는지 전부 다음 작업에 도움이 될 것처럼 느껴진다. 하지만 그대로 저장하면 memory는 빠르게 무거워지고, 때로는 위험해진다.

좋은 기억은 다음 작업을 돕는다. 나쁜 기억은 현재 요청을 덮고, 오래된 추측을 사실처럼 만들고, 민감한 맥락을 다시 노출한다. 그래서 나는 memory 후보를 바로 공식 기억으로 올리지 않고 Promotion Review Queue 같은 심사 단계를 둬야 한다고 본다.

이 글은 공개 가능한 개념으로만 설명한다. 실제 개인 기록, 내부 review queue, 원문 로그, 업무 화면, 계정, 제품 정보는 다루지 않는다. OpenAI Codex와 Claude Code 공식 문서를 참고하되, 실제 내부 심사 자료가 아니라 공개 가능한 심사 기준만 다룬다.

<figure>
	<img src="/blog/blog-images/secondbrain/promotion-review-queue.svg" alt="기억 후보를 심사 기준으로 확인한 뒤 승격 또는 보류하는 Promotion Review Queue 개념도" />
	<figcaption>이 그림은 실제 review queue 화면이 아니라, memory 후보를 승격하기 전에 확인할 기준을 보여주는 공개용 개념도다.</figcaption>
</figure>

## 먼저 확인한 것

OpenAI Codex memories 문서는 memory를 이전 작업의 유용한 context를 다음 작업으로 가져오는 장치로 설명한다.

> [OpenAI Codex memories 문서](https://developers.openai.com/codex/memories): "useful context"

여기서 나는 "유용한"이라는 조건을 중요하게 본다. 모든 후보가 유용한 context는 아니다. 어떤 후보는 다음 작업에서 오히려 오해를 만든다.

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-memories-context.png" alt="OpenAI Codex memories 공식문서에서 Codex가 유용한 context를 다음 작업으로 가져올 수 있다고 설명한 영역 캡처" />
	<figcaption>OpenAI Codex memories 문서 캡처, 캡처일 2026-07-01, 링크 재확인 2026-07-02. memory가 유용한 문맥을 이어줄 수 있다는 근거이며, 모든 후보를 memory로 승격해야 한다는 뜻은 아니다.</figcaption>
</figure>

Claude Code memory 문서도 memory를 강제 설정이 아니라 context로 구분한다.

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "not enforced configuration"

이 문장은 Promotion Review Queue의 이유를 잘 보여준다. memory가 강제 설정이 아니라면, 더더욱 좋은 context와 나쁜 context를 가려야 한다.

<figure>
	<img src="/blog/blog-images/official-docs/claude-memory-context-not-enforced.png" alt="Claude Code memory 공식문서에서 memory가 context이지 enforced configuration이 아니라고 설명한 영역 캡처" />
	<figcaption>Claude Code memory 문서 캡처, 캡처일 2026-07-01, 링크 재확인 2026-07-02. memory가 참고 문맥이라는 근거이며, 기억 후보가 자동으로 안전하거나 항상 적용된다는 뜻은 아니다.</figcaption>
</figure>

## 좋은 기억은 행동을 바꾼다

좋은 기억은 사용자를 설명하는 문장이 아니라, 다음 작업의 행동을 바꾸는 문장이다.

예를 들어 이런 문장은 약하다.

```text
사용자는 꼼꼼하다.
```

틀린 말은 아닐 수 있지만, 작업에 바로 쓰기 어렵다. 꼼꼼하다는 말은 너무 넓다. 어떤 작업에서는 긴 분석을 뜻할 수 있고, 어떤 작업에서는 짧더라도 검증 결과를 분리하라는 뜻일 수 있다.

좋은 기억은 이렇게 바뀐다.

```text
완료 보고에는 수정한 파일, 실행한 검증, 검증하지 못한 항목을 분리한다.
```

이 문장은 다음 작업에서 AI의 행동을 바꾼다. 사람이 결과를 보고 지켜졌는지도 확인할 수 있다.

Promotion Review Queue의 첫 번째 질문은 그래서 단순하다.

```text
이 후보는 다음 작업에서 실제 행동을 바꾸는가?
```

행동을 바꾸지 못하면 기억이 아니라 인상이다. 인상은 저장할수록 AI를 더 주관적으로 만들 수 있다.

## 나쁜 기억은 사용자를 고정한다

나쁜 기억은 대체로 사용자를 고정적으로 단정한다.

```text
사용자는 항상 긴 답변을 원한다.
사용자는 빠른 결론보다 깊은 분석을 더 좋아한다.
사용자는 이 도구를 기본으로 쓴다.
```

이런 문장은 어느 순간에는 맞았을 수 있다. 하지만 "항상"이라는 말이 붙는 순간 위험해진다. 현재 요청이 "짧게 답해줘"라면 과거의 긴 답변 선호는 뒤로 가야 한다. 도구도 바뀔 수 있고, 작업 성격도 달라질 수 있다.

좋은 기억은 예외를 품는다.

```text
분석 요청에서는 근거와 한계를 분리해 설명한다.
단, 사용자가 짧게 요청하면 짧게 답한다.
```

이렇게 적으면 memory가 현재 요청을 덮을 가능성이 줄어든다.

Promotion Review Queue의 두 번째 질문은 이것이다.

```text
이 후보는 현재 요청보다 앞서려고 하지 않는가?
```

memory는 현재 요청을 더 잘 이해하기 위한 힌트이지, 현재 요청을 이기는 규칙이 아니다.

## 오래된 추측은 승격하지 않는다

작업 중에는 추측이 생긴다. 사용자의 선호를 추정하고, 반복 패턴을 발견하고, 다음에는 이렇게 하면 좋겠다고 생각한다. 이 자체는 나쁘지 않다. 문제는 추측이 기억으로 승격될 때다.

추측을 승격하려면 근거가 필요하다. 한 번의 상황에서 나온 말인지, 여러 번 반복된 기준인지, 사용자가 명시한 요청인지, AI가 스스로 해석한 것인지 구분해야 한다.

나는 후보를 볼 때 보통 이렇게 표시한다.

```text
근거: 사용자 명시 요청
범위: 공개 블로그 글 작성
한계: 코드 리뷰나 설계 검토에는 그대로 적용 여부 확인 필요
```

이렇게 적으면 기억이 과잉 일반화되는 것을 막을 수 있다. 반대로 근거와 범위가 없는 후보는 승격하지 않는 편이 안전하다.

## 민감한 기억은 좋은 기억이 아니다

어떤 후보는 매우 유용해 보이지만 승격하면 안 된다. 민감한 단서를 포함하기 때문이다.

예를 들어 특정 회사, 제품, 고객, 내부 경로, private repository, issue 번호, 업무 로그, 계정, 화면 캡처가 있어야 의미가 유지되는 후보는 위험하다. 아무리 다음 작업에 도움이 되어도 공개 repo나 일반 memory로 올리면 안 된다.

좋은 기억은 원문 없이도 의미가 유지된다.

```text
공개 글을 작성할 때는 본문, 이미지, 파일명, build output까지 민감정보를 검사한다.
```

이 문장은 특정 사건을 설명하지 않아도 다음 작업에 도움이 된다. 반대로 특정 사건의 세부를 알아야만 이해되는 문장은 memory가 아니라 private log에 가깝다.

Promotion Review Queue의 세 번째 질문은 이것이다.

```text
원문과 민감한 맥락을 제거해도 기준으로 남는가?
```

남지 않으면 승격하지 않는다.

## 좋은 기억에는 갱신 가능성이 있다

기억은 시간이 지나면 낡는다. 도구는 바뀌고, 작업 방식도 바뀐다. 그래서 좋은 기억은 갱신 가능하게 적어야 한다.

나쁜 예시는 이런 식이다.

```text
항상 이 검증 명령을 실행한다.
```

좋은 예시는 조금 더 좁다.

```text
이 유형의 공개 글 발행에서는 build, diff check, live URL 확인을 수행한다.
배포 방식이 바뀌면 검증 절차를 다시 본다.
```

이렇게 적으면 memory가 오래되어도 위험이 줄어든다. AI가 기억을 절대 규칙으로 받아들이기보다, 현재 환경에서 다시 확인할 기준으로 다루게 된다.

## 내가 쓰는 Promotion Review 질문

복잡한 시스템이 없어도 아래 질문만 있으면 memory 후보를 꽤 잘 걸러낼 수 있다.

```text
1. 근거가 있는가?
2. 다음 작업의 행동을 바꾸는가?
3. 현재 요청을 덮지 않도록 범위와 예외가 있는가?
4. 원문 없이도 의미가 유지되는가?
5. 개인, 조직, 제품, 고객, 내부 맥락을 유추할 단서가 없는가?
6. 시간이 지나면 다시 확인해야 할 항목이 표시되어 있는가?
7. 보류하는 편이 더 안전한가?
```

마지막 질문이 중요하다. 애매하면 승격하지 않는 편이 낫다. memory는 많이 쌓는다고 좋아지는 것이 아니기 때문이다.

좋은 Promotion Review Queue는 기억을 통과시키기 위한 절차가 아니다. 기억을 떨어뜨리기 위한 절차이기도 하다. 그 덕분에 남은 기억이 더 믿을 만해진다.

## 내가 남긴 기준

좋은 기억은 근거가 있고, 행동을 바꾸고, 현재 요청을 덮지 않으며, 민감한 맥락 없이도 의미가 유지된다. 나쁜 기억은 오래된 추측, 과잉 일반화, 민감한 단서, 사용자를 고정적으로 단정하는 문장이다.

SecondBrain을 안전하게 만들려면 후보를 많이 모으는 것보다 승격 기준을 엄격하게 두는 편이 중요하다. 기억 후보는 가능성일 뿐이다. Promotion Review Queue를 통과해야 다음 작업에서 써도 되는 기준이 된다.

내 결론은 단순하다. AI가 더 잘 기억하게 만드는 것보다, 잘못 기억하지 않게 만드는 것이 먼저다.

## 확인 기준

- OpenAI Codex 문서: [Memories](https://developers.openai.com/codex/memories)
- Claude Code 문서: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- 링크 재확인일: 2026-07-02
- 공식문서 캡처 생성일: 2026-07-01
- 이 글은 실제 개인 memory review queue, 내부 로그, 업무 데이터, 제품 정보를 공개하지 않는다. 공개 가능한 심사 기준으로 일반화한 글이다.
