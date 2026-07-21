---
title: "AI reasoning effort를 작업 위험에 맞춰 나누는 방법"
description: "reasoning effort를 항상 높이거나 낮추지 않고 실패 비용, 모호성, 상호의존성, 검증 공백으로 routing한 뒤 실제 task eval로 보정하는 방법을 설명합니다."
pubDate: 2026-07-01T10:40:00+09:00
updatedDate: 2026-07-21T16:42:37+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/reasoning-effort-lanes.png"
---

reasoning effort를 고를 때 흔히 두 극단으로 간다. “깊게 생각하면 더 좋을 테니 항상 최대로 둔다”거나, “빠른 응답이 중요하니 기본값을 건드리지 않는다”는 방식이다.

둘 다 단순하지만 작업의 위험을 보지 않는다. 오탈자 수정과 운영 데이터 삭제 계획은 짧은 요청이라는 점만 같을 뿐, 틀렸을 때의 비용과 확인해야 할 경계가 전혀 다르다. 반대로 긴 문서를 정해진 형식으로 요약하는 일은 입력이 길어도 판단 난이도가 높지 않을 수 있다.

이 글의 질문은 “어떤 effort가 가장 성능이 좋은가”가 아니다. **어떤 작업에 더 많은 추론 자원을 배정할지 사전에 어떻게 구분할 것인가**다. 모델 품질은 결국 대표 task를 직접 평가해야 하며, 아래 합성 simulation은 routing 규칙만 검토한다.

<figure>
	<img src="/blog/blog-images/reasoning-effort-lanes.svg" alt="빠른 작업, 보통 작업, 깊은 판단으로 reasoning effort를 나누는 개념도" />
	<figcaption>이 그림은 실제 모델 내부 동작이나 benchmark 결과가 아니라, 작업 위험에 따라 reasoning 자원을 배분하는 개념도다.</figcaption>
</figure>

## 공식 문서가 말하는 범위

OpenAI Codex 설정 문서는 `model_reasoning_effort`를 조절 가능한 설정으로 제공한다.

> [OpenAI Codex config reference](https://developers.openai.com/codex/config-reference): `model_reasoning_effort` 값으로 `minimal | low | medium | high | xhigh`를 제시한다.

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-model-reasoning-effort-config.png" alt="OpenAI Codex config reference에서 model_reasoning_effort 설정값을 보여주는 영역" />
	<figcaption>OpenAI Codex config reference 캡처, 재확인일 2026-07-21. effort를 설정할 수 있다는 근거이며, 높은 값이 모든 작업에서 더 낫다는 증거는 아니다.</figcaption>
</figure>

현재 OpenAI model guidance는 대표 task에서 설정을 비교하라고 권한다.

> [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model): "compare configurations on representative tasks"

<!-- evidence-screenshot-exception: 현재 모델별 권고는 자주 갱신되는 동적 문서라 짧은 원문과 링크로 남기고, 고정 캡처는 Codex 설정값 표에 한정했다. -->

이 두 근거로 말할 수 있는 것은 effort를 선택할 수 있고, 실제 workload에서 비교해야 한다는 점까지다. 특정 모델에서 `high`가 `medium`보다 얼마나 정확한지, 지연과 token이 얼마나 늘어나는지는 이 글에서 측정하지 않았다.

## routing 전에 네 가지 위험을 본다

나는 작업을 네 축으로 0–2점씩 본다.

| 축 | 0점 | 1점 | 2점 |
|---|---|---|---|
| 실패 비용 | 즉시 되돌릴 수 있음 | 재작업이 필요함 | 공개·보안·데이터 손실 가능 |
| 모호성 | 입력과 출력이 명확함 | 해석 선택지가 있음 | 목표·원인·정답 조건이 불명확 |
| 상호의존성 | 한 문장·한 값 | 한 파일·한 모듈 | 여러 저장소·시스템·사람 경계 |
| 검증 공백 | 자동 판정 가능 | 일부 사람 판단 | 결과 확인이 늦거나 불완전 |

합계가 0–2면 `low`, 3–5면 `medium`, 6–8이면 `high`로 보내는 단순 규칙을 만들 수 있다. 점수 자체가 진리가 아니라, “왜 이 작업을 무겁게 다루는가”를 검토 가능하게 만드는 장치다.

예를 들어 오탈자 한 글자 수정은 짧고 자동 확인이 쉬워 낮은 lane으로 간다. 운영 데이터 삭제 계획은 요청 문장이 짧아도 실패 비용과 검증 공백이 커서 높은 lane으로 간다. 분량만으로 effort를 고르면 이 둘을 구분하지 못한다.

## 세 routing 전략을 같은 10개 task에 적용해봤다

공개 합성 task 10개에 다음 세 정책을 적용했다.

1. `always_high`: 모든 작업을 `high`로 보낸다.
2. `always_low`: 모든 작업을 `low`로 보낸다.
3. `risk_based`: 네 축 합계로 `low`·`medium`·`high`를 나눈다.

예제는 [reasoning-effort-routing.mjs](/blog/blog-examples/reasoning-effort-routing.mjs)에서 확인할 수 있다. Node.js 22에서 다음처럼 실행한다.

```bash
node public/blog-examples/reasoning-effort-routing.mjs
```

요약 출력은 다음과 같다.

```json
{
  "always_high": { "low": 0, "medium": 0, "high": 10 },
  "always_low": { "low": 10, "medium": 0, "high": 0 },
  "risk_based": { "low": 3, "medium": 4, "high": 3 }
}
```

이 결과는 `risk_based`가 더 정확하다는 증거가 아니다. script가 어떤 작업을 어느 lane에 배정하는지만 보여준다. `always_high`는 중요한 작업을 낮게 보내지 않는 대신 10개 모두를 무겁게 처리한다. `always_low`는 단순하지만 보안 검토와 삭제 계획까지 같은 lane에 둔다. `risk_based`는 자원을 구분하지만 점수 기준이 잘못되면 그럴듯하게 오분류한다.

따라서 simulation에서 얻는 결론은 하나다. **routing 정책의 차이는 실행 전에 눈으로 검토할 수 있지만, 실제 품질 차이는 아직 모른다.**

## 왜 항상 높음과 항상 낮음이 각각 실패하는가

`always_high`가 유리한 조건도 있다. task 수가 적고, 실패 비용이 크며, latency와 사용량보다 누락 감소가 중요한 경우다. 이때 단순한 보수 정책은 routing 기준 자체를 잘못 만드는 위험을 줄인다.

하지만 반복되는 작은 작업까지 모두 같은 lane으로 보내면 어떤 작업에서 추가 추론이 실제로 필요했는지 알기 어렵다. 높은 effort로 통과한 결과가 낮은 effort에서도 같았을 수 있지만 비교하지 않았기 때문이다.

`always_low`는 자동 판정 가능한 변환이나 대량의 단순 작업에서 유리할 수 있다. 성공 기준이 명확하고 실패를 즉시 잡는 test가 있다면 낮은 effort와 강한 gate의 조합이 합리적이다.

반대로 모호한 설계나 되돌리기 어려운 변경을 낮은 lane으로 고정하면, 답은 빨리 나와도 비교·반례·중단 조건이 빠질 가능성을 별도로 관리해야 한다. 낮은 effort가 실패를 일으킨다고 이 글이 측정한 것은 아니지만, 위험한 task에 추가 검토를 배정하지 않는 정책이라는 사실은 명확하다.

## routing 뒤에는 실제 eval이 필요하다

점수표를 만들었다고 effort 선택이 끝나는 것은 아니다. 다음처럼 대표 task 하나를 두 인접 설정에서 비교해야 한다.

```text
대표 task:
고정할 것: model, prompt, 입력 파일, tool 권한, 성공 기준
비교할 것: effort A / effort B
관찰할 것: 필수 조건 충족, 오류 수, 누락 수, 수정 횟수, 응답 시간, token 사용량
판정: 품질 이득이 latency·사용량 증가를 감당하는가
반복: 변동성이 큰 결과는 여러 번 실행
```

중요한 것은 결과를 본 뒤 rubric을 바꾸지 않는 것이다. 예를 들어 “필수 요구사항 5개 중 5개 충족, 금지 변경 0개, test 통과”를 먼저 정하고 두 설정을 같은 조건에서 실행한다.

차이가 없다면 낮은 effort가 그 task에는 충분할 수 있다. 높은 effort에서만 누락이 줄고 그 누락의 비용이 크다면 높일 이유가 생긴다. 결과 변동이 크다면 한 번의 승패로 기본값을 바꾸지 않는다.

## 점수표가 놓치는 반례

위 네 축도 완전하지 않다.

- 익숙한 작업처럼 보여도 최신 정책 확인이 핵심이면 검증 공백이 커진다.
- 여러 파일을 읽는 작업이어도 정해진 추출만 하면 높은 reasoning이 필요하지 않을 수 있다.
- 짧은 요청이어도 삭제·외부 공개가 포함되면 실패 비용이 급격히 커진다.
- 자동 test가 많아도 test가 잘못된 요구사항을 검사하면 안전하지 않다.
- 높은 effort가 더 긴 설명만 만들고 실제 오류를 줄이지 못할 수 있다.

그래서 routing 점수는 자동 승인기가 아니라 1차 분류기다. 경계 점수, 파괴적 작업, 외부 write는 사람이 한 번 더 본다. 그리고 품질 이득을 측정하지 못했다면 “더 깊게 생각했으니 더 좋다”고 결론내리지 않는다.

## 결론

reasoning effort는 높을수록 좋은 성능 버튼도, 비용 때문에 무조건 낮춰야 할 값도 아니다. 실패 비용, 모호성, 상호의존성, 검증 공백에 따라 **추론 자원을 어디에 배정할지** 정하는 운영 변수다.

세 정책 simulation은 risk-based routing이 10개 task를 `3 low / 4 medium / 3 high`로 나눈다는 사실만 보여줬다. 실제 모델 품질 우열은 보여주지 않았다. 그다음 단계는 대표 task와 사전 rubric을 고정하고 인접 effort를 직접 비교하는 것이다.

내가 남기는 기준도 그래서 두 단계다. 먼저 위험으로 routing하고, 그다음 실제 eval로 보정한다. 점수표가 품질 측정을 대신하게 두지 않는다.

## 확인 기준

- OpenAI Codex 공식 문서: [Configuration reference](https://developers.openai.com/codex/config-reference)
- OpenAI 공식 model guidance: [Model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- 공식 페이지와 기존 설정 캡처 재확인일: 2026-07-21
- 합성 routing example은 Node.js v22.12.0에서 실행해 `3 low / 4 medium / 3 high` 출력을 확인했다.
- 이 글은 실제 모델 정확도, latency, token cost를 측정하지 않았다. scoring 기준과 task fixture가 바뀌면 routing 결과도 달라진다.
