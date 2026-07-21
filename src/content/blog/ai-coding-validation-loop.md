---
title: "AI 코딩 검증 실패를 다음 수정으로 바꾸는 루프"
description: "baseline 실패와 약한 false green을 구분하고, focused check의 신호를 최소 수정과 중단 조건으로 연결하는 검증 루프를 설명합니다."
pubDate: 2026-07-01T11:00:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/validation-loop-ai-coding.png"
---

검증 명령을 마지막에 한 번 실행한다고 검증 루프가 생기지는 않는다. 실패 로그가 너무 넓으면 무엇을 고쳐야 할지 모르고, check가 너무 약하면 잘못된 결과도 초록색으로 보인다. 반대로 실패할 때마다 관련 없는 파일까지 바꾸면 다음 결과에서 원인을 분리하기 더 어려워진다.

이 글의 질문은 **검증 실패 신호를 어떻게 다음 focused change로 바꾸고, 어떤 조건에서 loop를 멈출 것인가**다. “완료가 무엇인가”라는 계약은 [AI 코딩 에이전트의 완료 기준](/blog/blog/ai-coding-agent-done-contract/)에서 다룬다. 여기서는 baseline, 실패 신호, 최소 수정, 재검증 사이의 전환만 좁게 본다.

<figure>
	<img src="/blog/blog-images/validation-loop-ai-coding.svg" alt="baseline, 약한 검사, focused failure, 최소 수정, 재검증과 중단 조건으로 이어지는 AI 코딩 검증 루프" />
	<figcaption>이 그림은 특정 테스트 시스템이 아니라 실패 신호를 다음 수정 입력으로 바꾸는 흐름을 설명한 개념도다.</figcaption>
</figure>

## 공식 문서에서 가져온 범위

OpenAI Codex의 iterative repair loops 문서는 현재 baseline에서 eval을 실행하고, 큰 실패 모드를 찾고, 집중된 변경 뒤 다시 평가하는 흐름을 설명한다.

> [OpenAI Codex iterative repair loops 문서](https://developers.openai.com/codex/use-cases/iterate-on-difficult-problems): "Run the evals on the current baseline."

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-iteration-loop-evals.png" alt="OpenAI Codex 문서에서 eval 실행, 실패 모드 식별, focused change, 재실행, 점수 기록 루프를 설명한 영역 캡처" />
	<figcaption>OpenAI Codex iterative repair loops 문서 캡처, 확인일 2026-07-01. baseline과 반복 평가를 연결하라는 근거이며, 아래 합성 check가 공식 eval 구현이라는 뜻은 아니다.</figcaption>
</figure>

Codex hooks 문서는 반복 검증을 이벤트에 연결할 수 있는 확장 표면을 제공한다.

> [OpenAI Codex hooks 문서](https://developers.openai.com/codex/hooks): "Hooks are an extensibility framework for Codex."

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-hooks-extensibility.png" alt="OpenAI Codex hooks 공식문서에서 Hooks가 Codex 확장 프레임워크라고 설명한 영역 캡처" />
	<figcaption>OpenAI Codex hooks 문서 캡처, 확인일 2026-07-01. 자동 실행을 연결할 수 있다는 근거이며, 무엇을 실패로 볼지나 언제 멈출지를 증명하는 자료는 아니다.</figcaption>
</figure>

이 공식 자료는 반복과 자동화의 기능 범위를 뒷받침한다. 어떤 check가 현재 변경의 위험을 잡는지, 실패를 어떤 코드 수정으로 연결할지는 작업자가 설계해야 한다.

## loop는 실패 전에 계약한다

검증 루프의 최소 계약은 다섯 항목이면 된다.

```text
baseline: 변경 전 또는 최초 산출물에서 관찰할 상태
focused check: 이번 위험을 직접 거부할 조건
repair boundary: 실패 하나를 고치기 위해 바꿀 수 있는 범위
recheck: 같은 조건으로 다시 실행할 명령
stop condition: 통과, 보류, 범위 확장 중 무엇으로 끝낼지
```

baseline이 없으면 새 실패인지 기존 실패인지 알기 어렵다. focused check가 없으면 전체 build의 수많은 신호 중 이번 변경과 관련된 것을 고르기 어렵다. repair boundary가 없으면 한 실패를 고치다가 다른 조건까지 바꿔 결과를 설명할 수 없게 된다.

## false green을 드러내는 합성 Node.js 예제

외부 dependency가 없는 [validation-loop-demo.mjs](/blog/blog-examples/validation-loop-demo.mjs)는 합성 게시물 artifact 하나를 검사한다. Node.js 22에서 실행한다.

```bash
node public/blog-examples/validation-loop-demo.mjs
```

baseline에는 제목이 있지만 `updatedDate`가 없고 대표 이미지 asset도 존재하지 않는다. 약한 check는 제목만 보므로 통과한다. focused check는 metadata와 asset contract를 함께 보고 baseline을 거부한다. repair는 실패 이유로 나온 두 값만 바꾼다.

실제 출력은 다음과 같다.

```json
{
  "synthetic_fixture": true,
  "baseline": {
    "title": "합성 검증 루프",
    "metadata": {
      "pubDate": "2026-07-21"
    },
    "heroImage": "/blog/blog-images/synthetic-loop.svg",
    "assetExists": false
  },
  "weak_check": {
    "passed": true,
    "inspected": [
      "title"
    ],
    "interpretation": "false green: title exists, but publish requirements were not inspected"
  },
  "focused_check": {
    "passed": false,
    "inspected": [
      "metadata.updatedDate",
      "heroImage",
      "assetExists"
    ],
    "failures": [
      "metadata.updatedDate is missing",
      "heroImage asset does not exist"
    ]
  },
  "repaired_artifact": {
    "title": "합성 검증 루프",
    "metadata": {
      "pubDate": "2026-07-21",
      "updatedDate": "2026-07-21"
    },
    "heroImage": "/blog/blog-images/synthetic-loop.svg",
    "assetExists": true
  },
  "repaired_check": {
    "passed": true,
    "inspected": [
      "metadata.updatedDate",
      "heroImage",
      "assetExists"
    ],
    "failures": []
  },
  "stop_reason": "focused publish contract passed for the repaired synthetic artifact"
}
```

`weak_check.passed: true`는 성공 증거가 아니라 검사가 보지 않은 범위를 보여주는 false green이다. `focused_check.failures`는 다음 수정 입력을 두 개로 제한한다. 같은 focused check를 고정한 채 수정 후 다시 실행했을 때 `repaired_check.passed: true`가 되고, 그때 `stop_reason`이 기록된다.

script에는 이 전환을 확인하는 assertion도 들어 있다. 약한 check는 반드시 baseline을 통과하고, focused check는 같은 baseline을 반드시 거부하며, repaired artifact는 focused contract를 통과해야 한다. 따라서 출력 문구만 그럴듯하게 바꿔서는 실행이 성공하지 않는다.

## 실패 신호는 수정 범위를 줄여야 한다

좋은 실패는 단지 빨간색이 아니라 다음 행동을 구체화한다.

| 신호 | 다음 focused change | 그대로 반복하지 말아야 할 것 |
|---|---|---|
| 필수 metadata 누락 | 해당 field와 생성 경로만 수정 | 본문 구조 전체 재작성 |
| asset 경로는 있으나 파일 없음 | 생성·복사 단계 또는 경로만 수정 | schema 기준을 느슨하게 변경 |
| 기존 test 회귀 | 회귀를 만든 diff와 가까운 호출부 확인 | 새 test를 삭제해 초록색 만들기 |
| 같은 실패가 수정 뒤에도 반복 | 원인 가설과 check 자체를 재검토 | 근거 없이 같은 patch 재시도 |
| 예상 밖 surface가 함께 실패 | scope 확장 여부를 결정하고 baseline을 다시 잡음 | 원래 성공 조건에 몰래 새 범위 추가 |

메커니즘은 단순하다. 실패 메시지가 관찰한 contract를 말하고, 다음 변경은 그 contract를 통과시키는 최소 범위로 제한한다. 같은 check를 다시 실행하면 변경과 결과의 연결을 설명할 수 있다. check 자체를 동시에 약화하면 무엇이 고쳐졌는지 알 수 없다.

## 세 검증 전략은 상황에 따라 선택한다

검증을 배치하는 방식에도 공정한 대안이 있다.

| 전략 | 유리한 조건 | 실패하기 쉬운 지점 |
|---|---|---|
| 마지막에 한 번 검증 | 수정이 매우 작고 deterministic하며 실패 시 되돌리기 쉬움 | 늦게 발견한 실패가 어느 변경에서 왔는지 분리하기 어려움 |
| 매번 모든 검증 일괄 실행 | surface가 강하게 결합되고 전체 suite가 빠르며 병렬 CI가 있음 | 느리고 noisy한 suite가 focused signal을 가림 |
| risk-first incremental loop | 위험 surface와 가까운 check를 먼저 고를 수 있고 수정 단위를 작게 유지 가능 | 초기 risk model이 틀리면 관련 없는 영역의 회귀를 놓침 |

risk-first가 항상 더 빠르거나 정확하다는 뜻은 아니다. schema 한 줄 수정이고 전체 suite가 몇 초라면 매번 모두 실행하는 편이 단순하다. 반대로 전체 suite가 오래 걸리고 실패가 많다면 focused test로 원인을 좁힌 뒤 마지막에 broader check로 범위를 넓힐 수 있다.

마지막 한 번 검증도 throwaway 초안이나 즉시 폐기 가능한 변환에는 충분할 수 있다. 다만 실패 비용이 큰 작업에서 그 전략을 쓰려면 중간 변경이 작고 추적 가능해야 한다.

## 통과 외에도 멈춰야 하는 이유가 있다

loop는 초록색이 나올 때까지 무한 반복하는 장치가 아니다. 다음 조건을 미리 stop condition으로 둔다.

- focused check와 필요한 broader check가 통과해 이번 계약을 충족했다.
- 같은 실패가 정해진 횟수만큼 반복돼 원인 가설을 다시 세워야 한다.
- 수정이 허용 범위를 벗어나거나 새로운 권한·비용·외부 변경이 필요해졌다.
- baseline 자체가 불안정해 같은 입력에서 결과가 반복되지 않는다.
- 자동 판정할 수 없는 의미·시각·문체 판단만 남아 사람 검토가 필요하다.

두 번째부터 다섯 번째는 실패한 완료가 아니라 올바른 보류다. 신호가 약한 상태에서 계속 patch를 쌓는 것보다, loop의 전제를 다시 확인할 시점을 기록한다.

## 자동 loop로 닫히지 않는 반례

비결정적인 모델 출력, flaky network, 시간에 따라 달라지는 외부 데이터는 한 번의 pass로 안정성을 증명하지 못한다. 반복 횟수와 허용 변동, 실패 표본을 따로 정해야 한다. 반복 결과가 다르면 deterministic check처럼 첫 pass에서 멈추면 안 된다.

UI의 시각적 균형, 글의 자연스러움, 출처 해석의 과장 여부는 사람이 판단해야 한다. 정규식이나 snapshot이 일부 회귀를 잡아도 의미 품질 전체를 대체하지 않는다. 자동 loop가 통과한 뒤 사람이 보고, 사람의 구체적인 실패 신호를 다음 focused change로 다시 번역해야 한다.

예제의 `assetExists`도 실제 filesystem을 검사한 값이 아니라 fixture에 적힌 boolean이다. 실제 게시 시스템에서는 파일 존재, decode 가능 여부, 크기, 경로 생성 결과를 실제 API로 확인해야 한다. 합성 예제가 통과했다는 사실을 real-world validator의 충분성으로 확대하면 안 된다.

## 결론과 한계

검증 루프의 핵심은 검사를 많이 실행하는 것이 아니라 실패 신호를 다음 최소 수정으로 바꾸는 것이다. baseline을 고정하고, 약한 false green을 구분하고, focused check가 거부한 조건만 고친 뒤 같은 조건으로 재실행한다. 통과뿐 아니라 불안정성, 권한 경계, 사람 판단도 중단 이유로 기록한다.

이 글의 Node.js 예제는 하나의 deterministic 합성 artifact를 한 번 실행한 결과다. 모델 품질, 실제 배포 안전성, 검증 전략의 시간·비용 우열을 측정하지 않았다. 실제 작업에서는 focused check가 잡지 못하는 회귀를 위해 마지막 broader validation과 사람 검토를 추가해야 한다.

## 확인 기준

- OpenAI Codex 문서: [Build iterative repair loops with Codex](https://developers.openai.com/codex/use-cases/iterate-on-difficult-problems), [Hooks](https://developers.openai.com/codex/hooks)
- 공식 문서와 기존 캡처 확인일: 2026-07-01
- 합성 예제는 Node.js v22.12.0에서 실행해 baseline 거부, title-only false green, focused failure, repaired pass, `stop_reason` 출력을 확인했다.
- 이 글은 자동 loop가 실제 모델 정확도나 사람 판단을 대체한다고 주장하지 않는다.
