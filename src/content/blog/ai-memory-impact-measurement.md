---
title: "AI memory가 실제로 도움이 됐는지 측정하는 법"
description: "같은 task의 memory off/on 조건을 짝지어 반복 설명, 필수 검증, 위험 재발, 맥락 회수, 잘못된 override를 함께 측정하는 방법을 합성 데이터와 실행 코드로 설명합니다."
pubDate: 2026-07-02T16:00:00+09:00
updatedDate: 2026-07-21T16:42:37+09:00
category: "secondbrain"
heroImage: "../../assets/blog/ai-memory-impact-measurement.png"
---

AI memory를 켠 뒤 “이제 AI가 나를 더 잘 이해한다”고 말하기는 쉽다. 하지만 이 문장은 무엇이 좋아졌는지, memory가 없었을 때와 무엇이 달랐는지, 부작용은 없었는지 알려주지 않는다.

측정하려면 질문을 더 작게 만들어야 한다. 같은 기준을 덜 반복했는가, 필수 검증을 더 수행했는가, 이미 알려진 위험이 덜 재발했는가, 시작 전에 필요한 맥락을 더 적은 단계로 회수했는가를 각각 본다. 그리고 memory가 현재 요청을 잘못 덮은 횟수도 같이 세야 한다.

이 글은 이 다섯 지표를 **같은 task의 `memory_off`와 `memory_on` 조건으로 짝지어 비교하는 방법**을 설명한다. 공개 데이터는 측정법을 재현하기 위해 만든 합성 fixture다. 실제 사용자 대화나 업무 로그가 아니며, 아래 결과로 특정 memory 제품의 효과를 주장하지 않는다.

<figure>
	<img src="/blog/blog-images/secondbrain/ai-memory-impact-measurement.svg" alt="AI memory 효과를 반복 설명, 검증 강화, 위험 감소, 맥락 회수와 override 오류로 나누어 관찰하는 개념도" />
	<figcaption>측정 축을 분리하면 한 지표의 개선이 다른 부작용을 가리는 일을 줄일 수 있다. 이 그림은 실제 dashboard가 아닌 공개용 개념도다.</figcaption>
</figure>

## 공식 기능 설명과 효과 주장을 분리한다

OpenAI Codex memories 문서는 memory가 이전 작업의 유용한 context를 다음 작업으로 가져올 수 있다고 설명한다.

> [OpenAI Codex memories 문서](https://developers.openai.com/codex/memories): "carry useful context"

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-memories-context.png" alt="OpenAI Codex memories 공식문서에서 유용한 context를 다음 작업으로 가져올 수 있다고 설명한 영역" />
	<figcaption>OpenAI Codex memories 문서 캡처, 재확인일 2026-07-21. memory가 문맥을 이어줄 수 있다는 근거이며, 작업 품질이 자동으로 좋아진다는 증거는 아니다.</figcaption>
</figure>

OpenAI Codex의 iterative repair loops 문서는 baseline eval, 실패 모드 식별, focused change, 재실행과 점수 기록을 연결한다.

> [OpenAI Codex iterative repair loops 문서](https://developers.openai.com/codex/use-cases/iterate-on-difficult-problems): "Run the evals"

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-iteration-loop-evals.png" alt="OpenAI Codex 문서에서 eval 실행, 실패 모드 식별, focused change와 재실행 흐름을 설명한 영역" />
	<figcaption>OpenAI Codex iterative repair loops 문서 캡처, 재확인일 2026-07-21. 반복 개선을 baseline과 재평가로 다룬다는 근거이며, 아래 다섯 지표가 OpenAI 공식 memory 평가 지표라는 뜻은 아니다.</figcaption>
</figure>

첫 문서는 기능의 가능 범위를, 두 번째 문서는 개선을 검증하는 일반적인 loop를 설명한다. 둘 다 “memory를 켜면 검증률이 몇 퍼센트 오른다”는 수치를 제공하지 않는다. 그 효과는 자신의 task와 rubric으로 따로 측정해야 한다.

## 먼저 측정 단위를 task pair로 고정한다

전후 기간의 전체 작업을 단순 비교하면 memory 외의 변화가 너무 많이 섞인다. 작업 난이도, 모델 버전, prompt, tool 권한, 담당자가 달라질 수 있기 때문이다.

가능하면 같은 task를 두 조건으로 짝짓는다.

```text
pair id: T01
고정: task 입력, 성공 기준, 필수 검증 목록, 알려진 위험
조건 A: memory_off
조건 B: memory_on
관찰: 반복 설명, 검증 수행, 위험 재발, 회수 단계, override 오류
```

완전히 같은 생성 결과를 기대할 수는 없다. AI 결과에는 변동성이 있고, 한 번 본 task를 다시 실행하면 학습 효과도 섞일 수 있다. 순서를 무작위화하거나 서로 비슷한 task set을 교차 배치하고, 가능하면 여러 번 반복해야 한다.

이 글의 8쌍은 통계적 효과 추정용 표본이 아니다. 계산식과 실패 조건을 검토하기 위한 최소 fixture다.

## 다섯 지표를 계산 가능하게 정의한다

### 1. 반복 설명 수

사용자가 작업 중 다시 말해야 했던 기존 기준의 횟수를 센다. 같은 말을 길게 했는지가 아니라, memory가 있었다면 작업 시작 전에 회수했어야 할 기준이 몇 번 다시 입력됐는지 본다.

### 2. 필수 검증 수행률

task 전에 필수 검증 목록을 고정한다.

```text
필수 검증 수행률 = 수행한 필수 검증 수 / 요구한 필수 검증 수 × 100
```

검증을 많이 실행하는 것이 목표는 아니다. task의 핵심 위험과 연결된 검증을 실제로 수행했는지 본다.

### 3. 알려진 위험 재발률

과거에 확인돼 memory 후보가 된 위험이 있는 task만 분모에 넣는다.

```text
위험 재발률 = 다시 발생한 알려진 위험 수 / 알려진 위험이 있던 task 수 × 100
```

새로운 종류의 실패는 이 지표에 넣지 않는다. 기존 위험 재발과 전체 오류율을 섞으면 memory가 무엇을 막았는지 알 수 없다.

### 4. 맥락 회수 단계 중앙값

관련 규칙과 현재 근거를 찾기까지 실행한 조회·질문 단계를 센다. 평균 대신 중앙값을 쓰면 한 번의 매우 긴 탐색이 전체 결과를 과도하게 끌어올리는 영향을 줄일 수 있다.

단계 수가 적다고 항상 좋지는 않다. 필요한 확인을 생략해서 빨라진 것이라면 필수 검증 수행률과 함께 나빠진다.

### 5. 잘못된 override 수

memory가 현재 명시 요청보다 우선해 잘못된 행동을 만든 횟수다. 예를 들어 사용자가 “초안만 작성하고 발행하지 말라”고 했는데 과거의 자동 발행 기준을 적용했다면 override 오류다.

이 지표를 빼면 반복 설명과 회수 속도만 좋아진 memory가 현재 요청을 침범하는 부작용을 숨길 수 있다.

## 공개 fixture를 직접 실행한다

합성 원자료는 [memory-impact-sample.json](/blog/blog-examples/memory-impact-sample.json), 계산기는 [measure-memory-impact.mjs](/blog/blog-examples/measure-memory-impact.mjs)에 있다.

```bash
node public/blog-examples/measure-memory-impact.mjs
```

Node.js 22에서 확인한 결과는 다음과 같다.

```json
{
  "memory_off": {
    "tasks": 8,
    "repeated_instructions": 8,
    "required_check_rate": 58.3,
    "risk_recurrence_rate": 50,
    "median_recovery_steps": 4,
    "override_errors": 0
  },
  "memory_on": {
    "tasks": 8,
    "repeated_instructions": 2,
    "required_check_rate": 87.5,
    "risk_recurrence_rate": 16.7,
    "median_recovery_steps": 2,
    "override_errors": 1
  }
}
```

계산기는 각 task id에 두 조건이 모두 없으면 실패한다. 횟수·단계 필드는 0 이상의 정수, 위험·override 필드는 boolean이어야 한다. `performed_checks`가 `required_checks`보다 크거나, 알려진 위험이 없는데 재발했다고 표시한 row도 거부한다. 숫자가 그럴듯해 보여도 pair와 field contract가 깨졌다면 결과를 만들지 않는 편이 낫다.

분모가 없는 비율은 0%가 아니다. 한 조건의 `required_checks` 합계가 0이거나 알려진 위험 task가 하나도 없으면 해당 rate와 rate delta를 `null`로 출력한다. 이는 “문제가 없었다”가 아니라 “이 dataset에서는 그 비율을 정의할 수 없다”는 뜻이며, 비교 결론에서 제외해야 한다.

## 결과를 한 문장으로 뭉치지 않는다

합성 fixture에서는 memory를 켠 조건에서 반복 설명이 8회에서 2회로 줄었다. 필수 검증 수행률은 58.3%에서 87.5%로 29.2%p 높아졌고, 알려진 위험 재발률은 50.0%에서 16.7%로 33.3%p 낮아졌다. 맥락 회수 단계 중앙값은 4에서 2로 줄었다.

이 네 수치만 보면 memory가 전반적으로 좋아 보인다. 하지만 override 오류가 0건에서 1건으로 늘었다. T07에서는 지속 기준이 현재 요청을 잘못 덮었다는 합성 사례를 넣었다.

따라서 이 fixture의 올바른 결론은 “memory가 효과적이다”가 아니다.

```text
합성 조건에서는 반복 설명·검증·위험 재발·회수 단계가 개선되는 모양이 나타났다.
동시에 현재 요청 override라는 부작용도 나타났다.
실제 효과와 순효용은 실제 task를 반복 측정하기 전에는 알 수 없다.
```

negative result를 포함하지 않았다면 같은 데이터로 과도하게 낙관적인 dashboard를 만들었을 것이다.

## 세 가지 평가 방식을 비교한다

| 방식 | 장점 | 약점 | 적합한 시작점 |
|---|---|---|---|
| 작업 후 체크리스트 | 가장 간단하고 바로 시작 가능 | baseline과 비교가 없고 회상 편향이 큼 | 지표 후보를 찾는 초기 단계 |
| 기간별 dashboard | 장기 추세와 운영 이상을 보기 쉬움 | task 구성·모델·규칙 변화가 섞임 | 안정된 수집 정의가 있을 때 |
| paired task evaluation | 조건 차이를 좁혀 비교 가능 | 비용이 크고 반복 실행·순서 효과 관리 필요 | 효과 주장을 검증할 때 |

처음부터 큰 dashboard를 만들 필요는 없다. 체크리스트로 어떤 행동이 변하는지 찾고, 중요한 주장만 paired evaluation으로 올린 뒤, 정의가 안정되면 추세 dashboard를 만드는 순서가 현실적이다.

반대로 dashboard의 숫자부터 정하면 “반복 설명 40% 감소”처럼 분모와 표본이 없는 지표가 생기기 쉽다. 숫자를 만들기 전에 어떤 task를 왜 세는지 고정해야 한다.

## 실제 측정에서 통제하기 어려운 것

memory 외에 결과를 바꾸는 변수가 많다.

- 모델 또는 reasoning 설정이 달라졌다.
- 두 번째 실행이 첫 번째 task를 이미 본 상태다.
- 필수 검증 목록을 결과를 본 뒤 바꿨다.
- 쉬운 task만 memory_on에 배치했다.
- 사용자가 개입한 횟수와 개입 이유를 일관되게 기록하지 않았다.
- memory가 아니라 새 tool이나 더 나은 prompt가 결과를 바꿨다.
- 평가자가 조건을 알고 있어 주관 판정이 기울었다.

표본이 작을 때는 효과 크기를 일반화하지 않는다. 몇 쌍의 task로는 “이 환경에서 이런 실패가 관찰됐다”까지가 안전하다. 제품 전체나 모든 사용자에게 같은 결과가 난다고 말할 수 없다.

또한 개인정보와 원문 대화를 그대로 dataset에 넣지 않는다. 필요한 것은 사건의 구체적인 원문이 아니라 `필수 검증 3개 중 2개 수행`, `현재 요청 override 1건`처럼 행동으로 일반화한 관찰값이다.

## 결론

AI memory의 효과는 저장 항목 수가 아니라 작업 행동의 변화로 본다. 다만 행동이 바뀌었다는 관찰과 memory가 그 변화를 일으켰다는 인과 주장은 다르다.

같은 task를 두 조건으로 짝짓고, 반복 설명·필수 검증·알려진 위험 재발·맥락 회수·override 오류를 함께 보면 최소한 좋은 지표 하나가 부작용을 가리는 문제는 줄일 수 있다.

이 글의 합성 결과에서는 네 축이 좋아지고 한 축이 나빠졌다. 실제 환경에서도 이 균형을 보지 않으면 memory는 편리해졌다는 인상만 남기고, 현재 요청을 침범하는 실패는 놓칠 수 있다. 측정의 목적은 memory를 자랑하는 것이 아니라 **어디에서 도움이 됐고 어디에서 멈춰야 하는지 결정하는 것**이다.

## 확인 기준

- OpenAI Codex 공식 문서: [Memories](https://developers.openai.com/codex/memories), [Build iterative repair loops](https://developers.openai.com/codex/use-cases/iterate-on-difficult-problems)
- 공식 페이지와 기존 캡처 재확인일: 2026-07-21
- 합성 JSON과 계산기는 Node.js v22.12.0에서 실행했고, 완전한 8쌍은 통과했으며 한 조건을 제거한 fixture는 pairing 오류로 실패했다.
- 이 글은 실제 memory 제품의 정확도·생산성·인과 효과를 측정하지 않았다. 표의 수치는 측정 설계와 해석 경계를 재현하기 위한 합성 결과다.
