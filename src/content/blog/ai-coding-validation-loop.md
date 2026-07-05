---
title: "AI 코딩에서 완료 보고를 믿지 않고 검증 루프를 만드는 법"
description: "AI가 완료했다고 말하는 순간이 아니라, 빌드·테스트·diff·live 확인 같은 증거를 기준으로 완료를 판단하는 방식을 정리합니다."
pubDate: 2026-07-01T11:00:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/validation-loop-ai-coding.png"
---

AI에게 작업을 맡기면 가장 듣기 쉬운 말이 있다. "완료했습니다."

문제는 이 말이 실제 완료를 보장하지 않는다는 점이다. 파일을 바꿨지만 빌드가 깨졌을 수 있고, 테스트를 돌리지 않았을 수 있고, 공개 글이라면 이미지나 metadata에 민감한 내용이 남아 있을 수도 있다. AI가 진심으로 완료했다고 판단했더라도, 그 판단이 충분한 증거 위에 있지 않으면 위험하다.

그래서 나는 AI 코딩에서 완료 보고를 그대로 믿지 않는다. 대신 검증 루프를 만든다. 작업을 바꾸고, 확인하고, 실패 원인을 반영하고, 다시 확인하는 과정을 완료 조건으로 둔다.

이 글은 OpenAI Codex 공식 문서를 참고해, 내가 AI와 작업할 때 쓰는 공개 가능한 검증 흐름을 정리한 것이다. 여기서 말하는 검증 루프는 특정 도구의 공식 절차가 아니라, AI가 만든 결과를 사람이 믿을 수 있는 증거로 바꾸기 위한 운영 방식이다.

<figure>
	<img src="/blog/blog-images/validation-loop-ai-coding.svg" alt="기준 고정, 작게 변경, 검증 실행, 실패 반영, 재검증으로 이어지는 AI 코딩 검증 루프" />
	<figcaption>이 그림은 실제 테스트 시스템 구조가 아니라, AI 작업을 완료 증거 중심으로 반복하는 개념도다.</figcaption>
</figure>

## 먼저 확인한 것

OpenAI Codex의 "Build iterative repair loops" 문서는 반복을 명시적으로 만들라고 설명하면서, 같은 루프를 따르도록 요청하는 예시를 제시한다. 그 흐름에는 baseline eval 실행, 가장 큰 실패 모드 식별, 집중된 변경, eval 재실행, 점수와 변경 효과 기록이 포함된다.

> [OpenAI Codex iterative repair loops 문서](https://developers.openai.com/codex/use-cases/iterate-on-difficult-problems): "Run the evals on the current baseline."

나는 이 문장을 "AI가 완료라고 말하기 전에 먼저 현재 상태를 측정해야 한다"는 근거로 본다. 다만 이 글의 검증 루프가 OpenAI의 공식 eval 시스템을 그대로 구현했다는 뜻은 아니다. 글, 코드, 배포처럼 작업 성격에 맞는 작은 검증으로 바꿔 적용한 것이다.

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-iteration-loop-evals.png" alt="OpenAI Codex 문서에서 eval 실행, 실패 모드 식별, focused change, 재실행, 점수 기록 루프를 설명한 영역 캡처" />
	<figcaption>OpenAI Codex iterative repair loops 문서 캡처, 확인일 2026-07-01. 반복 검증을 명시적으로 만들라는 근거이며, 이 글의 모든 검증 항목이 공식 eval이라는 뜻은 아니다.</figcaption>
</figure>

OpenAI Codex hooks 문서도 참고했다. Hooks는 Codex에 스크립트를 주입할 수 있는 확장 프레임워크로 설명된다.

> [OpenAI Codex hooks 문서](https://developers.openai.com/codex/hooks): "Hooks are an extensibility framework for Codex."

나는 이 문장을 반복 검증 중 일부를 자동화할 수 있다는 근거로 본다. 하지만 hook이 있다고 해서 검증 설계가 자동으로 좋아지는 것은 아니다. 무엇을 실패로 볼지 사람이 먼저 정해야 한다.

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-hooks-extensibility.png" alt="OpenAI Codex hooks 공식문서에서 Hooks가 Codex 확장 프레임워크라고 설명한 영역 캡처" />
	<figcaption>OpenAI Codex hooks 문서 캡처, 확인일 2026-07-01. 자동 검증을 연결할 수 있는 확장 지점의 근거이며, 모든 작업에 hook이 필요하다는 뜻은 아니다.</figcaption>
</figure>

## 완료 보고는 상태가 아니라 주장이다

AI가 "완료했습니다"라고 말하면 사람은 자연스럽게 결과가 끝났다고 느낀다. 하지만 그 말은 상태가 아니라 주장이다.

완료 상태가 되려면 증거가 있어야 한다. 예를 들어 코드 작업이라면 관련 테스트나 빌드가 통과해야 한다. 문서 작업이라면 요구한 문구가 실제 파일에 반영됐는지 봐야 한다. 공개 블로그라면 source, asset, generated output, live page가 모두 안전한지 확인해야 한다.

증거가 없는 완료 보고는 "그럴듯한 요약"에 가깝다. 나쁘다는 뜻은 아니다. 다만 그대로 믿을 수는 없다.

## 검증 루프는 처음부터 정한다

검증은 마지막에 급하게 붙이면 약해진다. 작업이 끝난 뒤 "뭘 확인하지?"라고 묻기 시작하면, 이미 AI가 만든 구조에 맞춰 느슨한 검증을 고르게 된다.

그래서 검증 루프는 작업 전에 정한다.

- 무엇을 바꿀 것인가
- 무엇은 바꾸지 않을 것인가
- 어떤 명령이나 확인으로 성공을 판단할 것인가
- 실패하면 어떤 정보를 보고 다음 수정을 할 것인가
- 어디서 멈출 것인가

이 기준을 먼저 정하면 AI의 역할이 달라진다. 단순히 결과를 만드는 것이 아니라, 검증 가능한 결과를 만들게 된다.

## 작은 검증부터 붙인다

모든 작업에 거대한 테스트 체계가 필요한 것은 아니다. 작은 작업에는 작은 검증이면 충분하다.

예를 들어 블로그 글을 하나 추가한다면 다음 정도가 시작점이 될 수 있다.

```text
1. Markdown frontmatter schema가 맞는지 확인한다.
2. 대표 이미지가 실제로 존재하는지 확인한다.
3. build를 실행한다.
4. 민감한 문자열이 source와 generated output에 없는지 검색한다.
5. push 후 live URL이 200인지 확인한다.
```

이 정도만 해도 "글을 썼다"와 "공개 가능한 글이 배포됐다"는 상태를 구분할 수 있다.

코드 작업도 마찬가지다. 전체 테스트를 매번 돌릴 수 없다면 수정한 표면에 가장 가까운 테스트부터 고른다. 테스트가 없다면 빌드, 타입 체크, lint, smoke check, grep 기반 negative check처럼 지금 가능한 증거를 모은다.

## 실패를 루프 안에 넣는다

AI 작업에서 실패는 자주 나온다. 빌드가 깨질 수도 있고, 공식 문서와 표현이 맞지 않을 수도 있고, 테스트가 없는 영역에서 확인 방법이 애매할 수도 있다.

중요한 것은 실패를 부끄러운 예외로 보지 않는 것이다. 검증 루프 안에서는 실패가 다음 입력이다.

빌드가 깨졌다면 오류 메시지를 읽고 수정한다. 민감정보 검색에 걸렸다면 표현이나 파일명을 바꾼다. 공식 문서 캡처가 너무 넓다면 다시 crop한다. live page가 404라면 배포 상태나 경로를 다시 확인한다.

이렇게 실패를 루프 안에 넣으면 AI가 "완료"를 서둘러 선언하기 어렵다. 아직 통과하지 못한 증거가 남아 있기 때문이다.

## 자동화할 것과 사람이 볼 것을 나눈다

검증 루프의 일부는 자동화할 수 있다. 빌드, 타입 체크, 테스트, 금지 문자열 검색, 링크 확인은 자동화하기 좋다.

하지만 모든 것을 자동화할 수는 없다. 글의 과장 여부, 독자가 오해할 수 있는 표현, 이미지에 남은 미세한 맥락, 공식 문서 해석의 한계는 사람이 봐야 한다.

그래서 나는 검증을 두 층으로 나눈다.

- 기계 검증: build, test, diff check, grep, link check
- 사람 검토: 의미, 톤, 공개 가능성, 과장, 근거 해석

기계 검증이 통과해도 글이 좋은 것은 아니다. 사람 검토가 좋아도 빌드가 실패하면 발행할 수 없다. 두 층이 함께 있어야 한다.

## 완료 증거를 마지막에 남긴다

작업이 끝났다면 어떤 증거로 끝났는지 남겨야 한다. 단순히 "수정 완료"라고 쓰는 대신, 무엇을 확인했는지 적는다.

예를 들어 이렇게 정리한다.

```text
변경: 새 글 1편, 대표 이미지 1장 추가
검증: build PASS, diff check PASS, 민감 패턴 검색 0건
배포: Pages workflow success, live URL 200
한계: 실제 독자 반응이나 검색 노출은 확인하지 않음
```

이런 기록은 나중에 중요해진다. 문제가 생겼을 때 무엇을 확인했고 무엇을 확인하지 않았는지 바로 알 수 있기 때문이다.

## 내가 남긴 기준

AI 코딩에서 완료 보고는 출발점일 뿐이다. 실제 완료는 증거로 판단해야 한다.

작업 전에는 성공 기준과 중단 조건을 정한다. 작업 중에는 작게 바꾸고 검증한다. 실패하면 원인을 반영하고 다시 확인한다. 마지막에는 어떤 증거로 완료 판단을 했는지 남긴다.

이 방식은 느려 보일 수 있다. 하지만 AI가 만든 결과를 되돌리는 시간, 공개 후 문제를 고치는 시간, 잘못된 완료 보고를 다시 추적하는 시간을 생각하면 오히려 더 빠르다.

내가 믿는 것은 AI의 "완료했습니다"가 아니다. 그 말 뒤에 붙은 검증 증거다.

## 확인 기준

- OpenAI Codex 문서: [Build iterative repair loops with Codex](https://developers.openai.com/codex/use-cases/iterate-on-difficult-problems), [Hooks](https://developers.openai.com/codex/hooks)
- 확인일: 2026-07-01
- 이 글은 보안·품질 보증 절차의 완전한 목록이 아니라, AI가 만든 변경을 확인 가능한 증거로 바꾸기 위한 개인 운영 기준이다.
