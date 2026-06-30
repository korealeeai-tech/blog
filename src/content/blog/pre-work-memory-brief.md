---
title: "작업 전에 기억을 꺼내는 방법: Pre-work Memory Brief"
description: "AI memory를 답변 생성 장치가 아니라 작업 전 기준을 정리하는 brief로 쓰는 방식을 소개합니다."
pubDate: 2026-07-01T10:30:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/pre-work-memory-brief.png"
---

AI memory를 쓰다 보면 쉽게 빠지는 착각이 있다. 기억이 많아질수록 AI가 나를 더 잘 이해하고, 그래서 답도 더 정확해질 것이라는 기대다.

나는 이 기대를 조금 다르게 본다. memory는 답을 대신 만드는 장치가 아니라, 작업 전에 기준을 꺼내는 장치에 가까워야 한다. 이전 대화에서 생긴 선호, 반복되는 실수, 검증 기준을 현재 작업 앞에 짧게 놓아주는 것이다.

내가 이 흐름을 부르는 이름은 Pre-work Memory Brief다. 거창한 시스템 이름이라기보다, AI가 일을 시작하기 전에 읽는 짧은 작업 브리핑에 가깝다.

이 글은 공개 가능한 개념으로만 설명한다. 실제 개인 기록, 내부 경로, 업무 로그, 비공개 시스템 화면, 원문 대화는 다루지 않는다. 2026-07-01 기준으로 OpenAI Codex와 Claude Code 공식 문서에서 memory와 instruction 관련 설명을 확인했고, 이 글에서는 그 위에 개인적인 운영 방식을 덧붙인다.

<figure>
	<img src="/blog/blog-images/pre-work-memory-brief.svg" alt="기억 회수, 작업 brief, 현재 근거 검증, 실행 흐름을 나눈 개념도" />
	<figcaption>이 그림은 실제 memory 저장 구조가 아니라 Pre-work Memory Brief 흐름을 설명하기 위한 개념도다.</figcaption>
</figure>

## memory는 현재 근거를 대신하지 않는다

가장 먼저 정해야 할 원칙은 이것이다. memory는 현재 근거를 대신할 수 없다.

예를 들어 memory에 "사용자는 근거 확인을 중요하게 생각한다"는 기준이 있다고 하자. 이것은 좋은 단서다. 하지만 이 단서만으로 현재 코드가 맞는지, 문서가 최신인지, 빌드가 통과하는지 알 수는 없다.

memory는 AI가 작업을 어떻게 시작할지 알려준다. 실제 답은 현재 파일, 공식 문서, 실행 결과, 사용자 요청을 다시 확인해서 만들어야 한다.

이 경계를 흐리면 memory는 위험해진다. 오래된 선호가 현재 요청을 덮어버릴 수 있고, 과거 맥락이 사실처럼 쓰일 수 있고, 공개하면 안 되는 내용이 요약이라는 이름으로 새어나갈 수 있다.

그래서 나는 memory를 "기억된 사실"보다 "확인해야 할 기준"으로 바꿔 쓰는 편이 낫다고 본다.

## brief는 짧아야 한다

Pre-work Memory Brief는 길면 실패한다. 작업 시작 전에 AI가 읽는 짧은 안내문이어야 한다.

좋은 brief에는 보통 네 가지가 들어간다.

- 이번 요청을 해석할 때 중요한 사용자 선호
- 이번 작업에서 특히 조심해야 할 위험
- 완료라고 볼 수 있는 최소 기준
- 확인하지 않았으면 말하지 말아야 할 내용

예를 들면 이런 식이다.

```md
이 사용자는 추측을 싫어한다.
변동 가능한 사실은 최신 출처를 확인한다.
공개 repo 작업에서는 본문, 이미지, 파일명, build output까지 민감정보를 검사한다.
검증하지 못한 항목은 완료 보고에 분리해서 적는다.
```

이 정도면 작업 시작 전에 방향을 잡는 데 충분하다. 반대로 원문 대화 전체, 긴 회고, 세부 일정, 개인적인 맥락을 넣기 시작하면 brief가 아니라 또 하나의 거대한 context dump가 된다.

## 기억을 작업 계약으로 바꾼다

Pre-work Memory Brief의 핵심은 기억을 작업 계약으로 바꾸는 것이다.

나쁜 memory는 이렇게 남는다.

```md
사용자는 꼼꼼한 답변을 좋아한다.
```

틀린 말은 아니지만 실제 작업에서는 애매하다. 꼼꼼하다는 말은 사람마다 다르다.

작업 계약으로 바꾸면 이렇게 된다.

```md
수정한 파일, 실행한 검증, 검증하지 못한 항목을 최종 보고에 분리한다.
```

이 문장은 훨씬 낫다. AI가 무엇을 해야 하는지 확인할 수 있고, 사람이 결과를 보고 지켰는지 판단할 수 있다.

memory를 쌓는 목적은 사용자를 성격 유형으로 분류하는 것이 아니다. 다음 작업에서 덜 헷갈리게 만드는 것이다. 그러려면 memory는 라벨보다 행동 기준에 가까워야 한다.

## 공개 가능한 memory와 아닌 memory를 나눈다

memory는 개인화될수록 유용해지지만, 그만큼 조심해야 한다. 특히 블로그 글이나 공개 repo에서 memory를 설명할 때는 경계를 넓게 잡아야 한다.

공개할 수 있는 것은 보통 이런 수준이다.

- "검증한 것과 추정한 것을 분리한다" 같은 일반 원칙
- "공개 repo에서는 이미지와 build output까지 검사한다" 같은 안전 기준
- "긴 작업은 성공 기준을 먼저 정한다" 같은 작업 방식
- 실제 데이터가 없는 합성 예시

공개하면 안 되는 것은 다르다.

- 원문 대화
- 내부 경로
- 계정명
- 업무 로그
- 실제 시스템 화면
- 개인이나 조직을 유추할 수 있는 작업명
- 특정 제품, 고객, repository, issue, schedule 정보

이 차이를 흐리면 memory 글은 쉽게 위험해진다. "예시는 익명화했다"는 말만으로 충분하지 않다. 익명화된 구조 자체가 맥락을 드러낼 수 있기 때문이다.

그래서 이 글에서도 실제 memory 내용을 공개하지 않는다. 대신 어떤 형태가 안전한 brief인지 개념으로만 설명한다.

## 작업 전 30초 체크

Pre-work Memory Brief는 복잡한 자동화가 없어도 쓸 수 있다. 작업을 시작하기 전에 다음 질문만 던져도 된다.

1. 이 요청에서 반복적으로 중요한 사용자 기준은 무엇인가?
2. 이 작업에서 공개되거나 깨지면 안 되는 표면은 무엇인가?
3. 완료 전 반드시 확인할 증거는 무엇인가?
4. memory만 보고 단정하면 안 되는 사실은 무엇인가?

이 네 질문에 답하면 AI의 첫 움직임이 달라진다. 바로 작성하거나 수정하기 전에, 무엇을 확인해야 하는지 먼저 정하게 된다.

내가 보기에는 이것이 memory의 가장 현실적인 장점이다. AI가 사람처럼 기억한다는 환상을 주는 것이 아니라, 작업 시작 전에 실수하기 쉬운 기준을 다시 꺼내준다.

## official memory 기능과 개인 brief는 다르다

Codex 문서는 memories를 이전 작업의 유용한 문맥을 가져오는 보조 계층으로 설명한다. Claude Code 문서는 `CLAUDE.md`와 auto memory가 세션 시작 시 문맥으로 로드되지만 강제 설정은 아니라고 설명한다.

공식 문서 원문을 짧게 보면 이 차이가 보인다.

> [OpenAI Codex memories 문서](https://developers.openai.com/codex/memories): "Memories let Codex carry useful context"

나는 이 문장을 memory가 답을 대신 내는 장치가 아니라, 이전 작업에서 유용했던 문맥을 다음 작업으로 가져오는 보조 장치라는 뜻으로 해석했다.

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "Both are loaded at the start of every conversation."

Claude Code의 `CLAUDE.md`와 auto memory도 작업 시작 시 들어오는 문맥으로 보았다. 하지만 같은 문서에서 context와 enforced configuration을 구분하기 때문에, 이 글에서는 memory를 최종 근거가 아니라 작업 전 brief의 재료로만 다룬다.

여기서 말하는 Pre-work Memory Brief는 특정 제품 기능 이름이 아니다. official memory 기능을 그대로 설명하려는 글도 아니다. 내가 말하는 것은 memory에서 가져온 기준을 작업 직전에 짧은 계약으로 정리하는 운영 방식이다.

도구가 기억을 자동으로 만들 수 있더라도, 어떤 기억을 현재 작업에 적용할지는 여전히 검토해야 한다. 오래된 기준은 버리고, 민감한 내용은 제외하고, 현재 요청에 맞는 기준만 남겨야 한다.

## 내가 쓰는 결론

AI memory는 많이 저장한다고 좋아지는 것이 아니다. 현재 작업에 맞는 기준을 짧게 꺼내고, 그 기준이 실제 근거 확인으로 이어질 때 유용해진다.

Pre-work Memory Brief는 이 흐름을 작게 만든 것이다. 기억을 회수하고, 작업 계약으로 바꾸고, 현재 근거를 확인한 뒤 실행한다. 이때 memory는 답의 출처가 아니라 출발점이다.

내가 원하는 AI는 사용자를 추측해서 맞히는 AI가 아니다. 작업 전에 "이 사람은 이런 기준으로 결과를 확인한다"는 점을 떠올리고, 그 기준에 맞춰 실제 증거를 보러 가는 AI다.

그 차이가 작아 보이지만, 반복 작업에서는 꽤 크다.

## 확인 기준

- OpenAI Codex 문서: [Memories](https://developers.openai.com/codex/memories), [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- Claude Code 문서: [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- 확인일: 2026-07-01
