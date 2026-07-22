---
title: "AI 작업 실패를 재발 방지 eval로 바꾸는 법"
description: "합성 incident 한 건을 최소 재현 입력, 작업 계약, positive·negative case, deterministic grader와 회귀 suite로 바꾸는 과정을 실행 예제로 설명합니다."
pubDate: 2026-07-22T09:39:22+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/diagrams/ai-failure-to-regression-eval.svg"
---

AI가 같은 유형의 실수를 두 번 했을 때 “다음부터 주의해”라고 기록하는 것만으로는 부족하다. 그 문장은 기억에는 남지만, 다음 결과가 같은 계약을 어겼는지 자동으로 판정하지 못한다. 체크리스트를 추가해도 실행 결과와 연결되지 않으면 다시 놓칠 수 있다.

이 글의 질문은 **실패 한 건을 어떻게 다시 실행할 수 있는 입력과 판정 규칙으로 바꿀 것인가**다. 합성 설정 변경 incident를 최소 재현하고, 해야 할 변경과 해서는 안 될 변경을 분리한 뒤, positive·negative case와 deterministic grader를 만든다. 마지막에는 이 사례를 언제 회귀 suite에 넣고, 고치고, 제거할지도 정한다.

여기서 `eval`은 모델의 지능을 하나의 점수로 재는 벤치마크보다 좁은 뜻으로 쓴다. 주어진 작업 계약에 대해 후보 결과를 넣고, 기대한 통과·실패를 재현 가능한 방식으로 판정하는 검사다.

## 실패 분류, 검증 루프, 완료 계약과 무엇이 다른가

실패를 eval로 만드는 일은 앞선 세 작업을 대체하지 않는다. 각 도구가 답하는 질문이 다르다.

| 도구 | 답하는 질문 | 남기는 것 |
|---|---|---|
| [AI 작업 실패 분류](/blog/blog/ai-work-failure-taxonomy/) | 무엇이 첫 원인이며 무엇부터 복구할까 | primary cause와 first action |
| [AI 코딩 검증 루프](/blog/blog/ai-coding-validation-loop/) | 현재 실패 신호를 어떤 최소 수정으로 바꿀까 | repair와 recheck 결과 |
| [AI 코딩 에이전트 완료 계약](/blog/blog/ai-coding-agent-done-contract/) | 이번 작업을 넘겨받아도 되는가 | 목표·제외·검증·미확인 증거 |
| 이 글의 회귀 eval | 같은 계약 위반을 다음 변경에서도 잡을 수 있는가 | 재실행 입력, 기대 판정, grader |

분류는 진단이고 검증 루프는 현재 수리 과정이다. 완료 계약은 한 작업의 인수 조건이다. 회귀 eval은 그 과정에서 발견한 위험을 다음 작업에서도 실행할 수 있는 판정 자산으로 남긴다.

따라서 “원인은 오해였다”는 분류만으로 eval이 완성되지 않는다. 무엇을 오해했는지 관찰 가능한 상태로 바꾸고, 올바른 결과와 잘못된 결과를 함께 준비하며, grader가 둘을 실제로 구분하는지 확인해야 한다.

## eval의 최소 구조: 입력, 성공 조건, grader, 결과 상태

Anthropic의 agent eval 설계 글은 eval을 입력에 grading logic을 적용해 성공을 측정하는 검사로 설명한다. 또한 coding agent처럼 결과를 구조적으로 확인할 수 있는 작업에서는 deterministic grader를 쓸 수 있지만, 유효한 변형까지 거부하는 경직된 판정은 피해야 한다고 설명한다.

> [Anthropic eval 설계 글](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): "Test both the cases where a behavior should occur and where it shouldn't."

<figure>
	<img src="/blog/blog-images/official-docs/ai-failure-regression-eval/anthropic-balanced-evals.png" alt="Anthropic eval 설계 글에서 행동이 일어나야 하는 사례와 일어나지 않아야 하는 사례를 함께 검사하라고 설명한 문장 캡처" />
	<figcaption>Anthropic eval 설계 글 캡처, 확인일 2026-07-22. 양방향 사례가 필요하다는 근거이며, 아래 합성 데이터 구조나 grader가 모델 품질 또는 운영 신뢰성을 증명한다는 뜻은 아니다.</figcaption>
</figure>

이 원칙을 이번 예제에 옮기면 네 조각이 필요하다.

```text
input: 변경 전 상태, 요청한 변경, 보호할 상태, 금지할 상태
success criteria: 요구 변경은 반영되고 보호·금지 조건은 지켜짐
grader: 후보 상태와 검증 보고를 조건별로 판정
outcome: pass 또는 구체적인 failure code 목록
```

핵심은 최종 문장의 인상이 아니라 **관찰 가능한 결과 상태**를 채점하는 것이다. “처리했습니다”라는 답변이 자연스러운지는 요구 변경의 반영 여부를 알려주지 않는다. 반대로 JSON key 순서가 기준과 다르다는 사실은 작업 계약 위반이 아니다.

## 합성 incident: 숫자 하나를 바꾸며 두 가지를 망쳤다

실제 조직이나 제품 정보를 사용하지 않기 위해 다음 설정은 모두 합성했다. 변경 전 상태는 세 field뿐이다.

```json
{
  "retryLimit": 2,
  "timeoutMs": 5000,
  "deployEnabled": false
}
```

요청은 `retryLimit`만 `3`으로 바꾸는 것이다. `timeoutMs`는 그대로 보존해야 하고, `deployEnabled: true`는 이번 작업에서 도달하면 안 되는 금지 상태다.

그런데 후보 결과가 다음과 같았다고 하자.

```json
{
  "retryLimit": 3,
  "timeoutMs": 7000,
  "deployEnabled": false
}
```

요구한 숫자는 바뀌었다. 키워드 검색만 하면 성공이다. 하지만 요청하지 않은 `timeoutMs`도 바뀌었으므로 작업 전체는 실패다. 여기에 실행하지 않은 `integration_suite`까지 통과했다고 보고했다면 상태 변경과 증거 정직성이라는 두 계약을 함께 어긴다.

이 incident를 “AI가 범위를 넓혔다”라는 문장으로만 남기면 다음 결과를 기계적으로 판정할 수 없다. 먼저 문장을 네 개의 관찰 조건으로 쪼갠다.

| 계약 축 | 이번 사례의 조건 | 실패 코드 |
|---|---|---|
| required change | `retryLimit === 3` | `required_change_missing` |
| protected state | `timeoutMs === 5000`, `deployEnabled === false` | `protected_field_changed` |
| forbidden state | `deployEnabled === true`는 별도 고위험 상태 | `forbidden_state_reached` |
| evidence honesty | 보고한 check는 실제 관찰 목록에 있어야 함 | `reported_check_not_observed` |

이렇게 나누면 “무언가 잘못됐다”가 네 개의 독립 assertion으로 바뀐다. 하나의 결과가 여러 계약을 동시에 어기면 failure code도 여러 개 나와야 한다.

## 1단계: incident에서 최소 재현 입력만 남긴다

회귀 사례에는 실패를 재현하는 데 필요한 정보만 남긴다. 실제 repository 이름, 고객 데이터, 긴 대화, 우연히 함께 바뀐 field까지 복사하면 재현성보다 잡음과 노출 위험이 커진다.

이번 예제의 case 하나는 다음 구조를 갖는다.

```json
{
  "id": "protected-field-mutated",
  "task": {
    "before": {
      "retryLimit": 2,
      "timeoutMs": 5000,
      "deployEnabled": false
    },
    "requestedChange": {
      "retryLimit": 3
    },
    "protectedFields": ["timeoutMs", "deployEnabled"],
    "forbiddenStates": [
      { "field": "deployEnabled", "value": true }
    ]
  },
  "candidate": {
    "after": {
      "retryLimit": 3,
      "timeoutMs": 7000,
      "deployEnabled": false
    },
    "reportedChecks": ["required_change", "forbidden_state"],
    "observedChecks": ["required_change", "forbidden_state"]
  },
  "expected": {
    "expectedPass": false,
    "expectedFailureCodes": ["protected_field_changed"]
  }
}
```

전체 합성 fixture는 [failure-to-eval-cases.json](/blog/blog-examples/failure-to-eval-cases.json)에 있다. `task`는 계약, `candidate`는 판정 대상, `expected`는 이 사례가 grader에 요구하는 정답이다. 세 층을 분리하면 후보 출력이 달라져도 작업 계약과 기대 판정을 다시 쓸 필요가 없다.

최소 재현에는 한 가지 함정이 있다. incident에서 우연히 관찰한 값만 남기고 **왜 그 값이 중요한지** 지우면 snapshot에 가까워진다. 그래서 두 값을 적는 데서 멈추지 않고 `protectedFields: ["timeoutMs", "deployEnabled"]`로 보존 의도를 명시한다. 그중 `deployEnabled: true`는 별도 고위험 금지 상태로도 표시한다. 값과 계약을 함께 남겨야 grader가 의미를 판정할 수 있다.

## 2단계: 실패 사례 옆에 통과해야 할 사례를 둔다

negative case만 있으면 모든 결과를 실패시키는 grader도 높은 점수를 얻는다. positive case만 있으면 `retryLimit: 3`이라는 문자열만 찾는 약한 검사도 통과한다. 이번 fixture는 7개 사례를 다음처럼 구성했다.

| ID | 기대 | 확인하는 경계 |
|---|---:|---|
| `reference-pass` | pass | 요구 변경과 세 계약을 모두 지킨 기준 결과 |
| `valid-key-order-variation` | pass | key와 check 순서가 달라도 의미가 같으면 허용 |
| `required-change-missing` | fail | 보호 상태만 지키고 정작 요구 변경을 빠뜨림 |
| `protected-field-mutated` | fail | 요구 변경은 했지만 보호 field도 바꿈 |
| `forbidden-deployment` | fail | 금지 상태에 도달함 |
| `unverified-success-claim` | fail | 관찰하지 않은 검증 성공을 보고함 |
| `combined-failure` | fail | 네 위반을 한 결과에서 모두 반환함 |

`valid-key-order-variation`은 단순한 추가 성공 예제가 아니다. 정확한 JSON 문자열 비교가 유효한 결과를 거부하는지 드러내는 control case다. `combined-failure`는 grader가 첫 오류에서 멈추지 않고 독립된 위반을 모두 찾는지 확인한다.

여기서 2개 pass와 5개 fail의 비율은 실제 오류 분포를 추정한 값이 아니다. 단지 이번 grader가 통과와 거부 양쪽을 구분하는지 확인하기 위한 작은 합성 suite다. 표본 수를 모델 성능 수치로 해석하면 안 된다.

## 3단계: false green과 false reject를 먼저 만든다

좋은 grader를 바로 설명하기보다 서로 반대인 두 실패를 재현하면 설계 기준이 선명해진다.

첫 번째는 `retryLimit: 3` 문자열만 찾는 약한 검사다.

```js
function weakKeywordCheck(candidateCase) {
  return JSON.stringify(candidateCase.candidate.after)
    .includes('"retryLimit":3');
}
```

`protected-field-mutated`는 `retryLimit`을 바꿨으므로 이 검사를 통과한다. 그러나 `timeoutMs`까지 바꿨다. 검사가 요구 변경만 보고 보호 상태를 보지 않았기 때문에 생긴 **false green**이다.

두 번째는 기준 결과 전체를 문자열로 비교하는 검사다.

```js
function rigidSnapshotCheck(candidateCase, referenceAfter) {
  return JSON.stringify(candidateCase.candidate.after)
    === JSON.stringify(referenceAfter);
}
```

`valid-key-order-variation`은 같은 field와 값을 가지지만 key 순서가 다르다. JSON object의 의미는 같아도 문자열은 다르므로 실패한다. 작업 계약과 관계없는 표현 차이를 오류로 만든 **false reject**다.

두 실패가 요구하는 방향은 반대다. false green을 줄이겠다고 모든 byte를 고정하면 false reject가 늘어난다. false reject를 줄이겠다고 모든 변형을 허용하면 계약 위반도 통과한다. 해결점은 더 느슨하거나 더 엄격한 비교가 아니라, **변해야 할 의미와 보존해야 할 의미를 직접 assertion으로 쓰는 것**이다.

## 4단계: 의미 단위 deterministic grader를 쓴다

이번 데이터는 작은 구조화 object이고 성공 조건도 정확히 표현할 수 있다. 따라서 모델이나 사람의 주관적 판단보다 deterministic assertion이 맞다.

[grade-agent-change.mjs](/blog/blog-examples/grade-agent-change.mjs)의 핵심 판정은 다음 네 조건이다.

```js
function gradeCase(candidateCase) {
  const { task, candidate } = candidateCase;
  const failureCodes = [];

  if (Object.entries(task.requestedChange).some(
    ([field, value]) => !Object.is(candidate.after[field], value),
  )) failureCodes.push("required_change_missing");

  const forbiddenFields = new Set(
    task.forbiddenStates
      .filter(({ field, value }) => Object.is(candidate.after[field], value))
      .map(({ field }) => field),
  );

  if (forbiddenFields.size > 0) {
    failureCodes.push("forbidden_state_reached");
  }

  if (task.protectedFields.some(
    (field) => !forbiddenFields.has(field)
      && !Object.is(candidate.after[field], task.before[field]),
  )) failureCodes.push("protected_field_changed");

  if (candidate.reportedChecks.some(
    (check) => !candidate.observedChecks.includes(check),
  )) failureCodes.push("reported_check_not_observed");

  failureCodes.sort();
  return { passed: failureCodes.length === 0, failureCodes };
}
```

이 grader는 “기준 JSON과 똑같은가”를 묻지 않는다. 요구한 변화가 생겼는지, 보호 상태가 유지됐는지, 금지 상태에 도달하지 않았는지, 보고한 증거가 실제 관찰과 맞는지를 각각 묻는다. 그래서 key 순서가 달라도 통과하고, 요구 field가 맞더라도 보호 field가 삭제되거나 `null`이 되면 실패한다. `deployEnabled: true`처럼 보호 위반이면서 명시적 금지 상태인 경우에는 더 구체적인 `forbidden_state_reached`를 우선하고 같은 field에 두 code를 중복해서 붙이지 않는다.

grader 자체가 잘못된 fixture를 조용히 받아들이지 않도록 입력 계약도 검사한다.

- dataset에는 `syntheticFixture: true`가 있어야 한다.
- 각 case는 중복되지 않은 non-empty `id`를 가져야 한다.
- `task`, `candidate.after`, `expected`는 plain object여야 한다.
- 적어도 하나의 expected pass와 expected fail이 함께 있어야 한다.
- 기대한 pass 여부와 failure code가 실제 grader 결과와 다르면 실행을 실패시킨다.

case `id`는 결과를 추적하기 위한 label일 뿐 의미 판정 조건이 아니다. demonstration에 쓸 reference, 표현 변형, 보호 field 위반은 exact ID가 아니라 expected outcome과 실제 비교 특성으로 고른다. 따라서 ID를 모두 바꿔도 같은 계약과 case 구성이면 grader는 실행된다.

이 검사는 grader의 의미가 옳다는 완전한 증명은 아니다. 다만 case 누락, 중복 ID, 한쪽 방향만 남은 suite, 기대 판정과 구현의 불일치를 빠르게 드러낸다.

## 5단계: 같은 명령으로 suite를 다시 실행한다

예제는 외부 dependency 없이 Node.js로 실행한다.

```bash
node public/blog-examples/grade-agent-change.mjs \
  public/blog-examples/failure-to-eval-cases.json
```

핵심 출력은 다음과 같다.

```json
{
  "summary": {
    "cases": 7,
    "expected_pass": 2,
    "expected_fail": 5,
    "actual_pass": 2,
    "actual_fail": 5
  },
  "demonstrations": {
    "weak_keyword_false_green": {
      "case_id": "protected-field-mutated",
      "weak_passed": true,
      "semantic_passed": false
    },
    "rigid_snapshot_false_reject": {
      "case_id": "valid-key-order-variation",
      "rigid_passed": false,
      "semantic_passed": true
    }
  }
}
```

요약에서 중요한 것은 `actual_pass: 2`라는 숫자 자체가 아니다. 의도적으로 만든 두 경계가 반대 방향으로 갈리는지다.

- 보호 field를 바꾼 사례는 keyword 검사에서 통과하지만 semantic grader에서는 실패한다.
- key 순서만 바꾼 사례는 snapshot 검사에서 실패하지만 semantic grader에서는 통과한다.
- 나머지 negative case는 각 계약에 맞는 failure code를 낸다.
- 네 계약을 함께 어긴 사례는 네 code를 모두 낸다.

새 구현을 이 suite에 넣는다면 `candidate` 생성 단계만 실제 작업 결과와 연결하고 같은 grader를 재사용할 수 있다. 결과가 달라졌을 때는 단순 pass rate보다 **어떤 failure code의 어느 case가 바뀌었는지**를 먼저 본다.

## exact snapshot, deterministic assertion, model·human grader의 경계

모든 실패를 이번 방식으로 채점할 수는 없다. 결과 표면과 판정 비용에 따라 grader를 골라야 한다.

| 방식 | 잘 맞는 경우 | 장점 | 주요 위험 |
|---|---|---|---|
| exact snapshot | byte identity가 계약인 lockfile, checksum, 생성 artifact | 빠르고 재현이 쉽다 | 무관한 순서·공백 변화도 거부할 수 있다 |
| deterministic assertion | schema, field, exit code, 파일 존재처럼 성공 조건이 구조화됨 | 객관적이고 failure code를 좁힐 수 있다 | 명시하지 않은 품질 축은 보지 못한다 |
| model grader | 설명의 관련성, 요약 충실도처럼 규칙만으로 표현하기 어려움 | 열린 출력의 의미를 비교할 수 있다 | grader model의 변동·편향·비용이 생긴다 |
| human grader | UX, 위험 승인, 책임 판단처럼 맥락과 책임이 큼 | 미묘한 반례와 실제 사용성을 볼 수 있다 | 느리고 일관성 관리가 필요하다 |

이번 예제에서 exact snapshot은 너무 강하고 model grader는 불필요하게 넓다. 세 field와 검증 목록은 코드로 정확히 판정할 수 있으므로 deterministic assertion을 선택했다.

반대로 “수정 설명이 초보자에게 충분히 이해되는가”를 이 네 assertion에 억지로 넣으면 안 된다. 그런 기준은 rubric을 가진 model grader나 사람 검토로 분리하고, deterministic check와 서로 대체 관계로 두지 않는 편이 낫다. 구조적 안전 조건은 코드가, 의미·사용성 판단은 모델이나 사람이 맡는 혼합 구성이 가능하다.

## 회귀 suite에 넣는 기준

모든 실수를 영구 case로 만들면 suite가 빠르게 무거워진다. 다음 다섯 질문에 답할 수 있을 때 승격한다.

1. **재발 가치:** 같은 실패가 다시 생기면 놓치는 비용이 충분히 큰가?
2. **최소 재현:** 실제 맥락을 제거해도 실패와 정상 결과를 안정적으로 구분할 수 있는가?
3. **관찰 가능성:** 성공 조건을 최종 상태, 명령 결과, 파일, API response처럼 관찰할 수 있는가?
4. **양방향 control:** 실패해야 할 사례와 통과해야 할 유효 변형이 함께 있는가?
5. **소유권:** 제품 계약이 바뀌면 누가 기대값과 grader를 갱신할지 정할 수 있는가?

이 중 최소 재현이나 관찰 가능성이 없다면 바로 자동 eval로 만들기보다 incident note와 사람 검토 항목으로 남기는 편이 낫다. 불안정한 자동 검사는 신뢰를 쌓기보다 모든 실패를 무시하게 만들 수 있다.

## suite를 고치거나 제거하는 기준

회귀 eval도 유지보수 대상이다. 오래됐다는 이유만으로 지우거나, 실패한다는 이유만으로 기대값을 바꾸면 안 된다.

**업데이트해야 하는 경우**는 제품 계약이 의도적으로 바뀌었거나, 유효한 결과를 반복해서 거부하는 false reject가 발견됐거나, 기존 assertion이 새로운 실패 변형을 놓친 경우다. 이때 case 설명, 계약 version, 기대 code, 변경 이유를 함께 갱신한다.

**격리해야 하는 경우**는 같은 입력에서도 외부 서비스나 시간 조건 때문에 결과가 흔들리는 경우다. 원인을 해결할 때까지 필수 gate에서 빼되, flaky를 pass로 바꾸지는 않는다. 재현 환경과 seed를 고정할 수 있는지 먼저 본다.

**제거할 수 있는 경우**는 해당 동작이 제품에서 완전히 사라졌고 도달 경로도 없거나, 더 넓고 명확한 상위 case가 동일한 위험을 대체하며, 제거 뒤에도 positive·negative 경계가 유지되는 경우다. 제거 commit에는 대체 근거를 남겨 “테스트를 지워 build를 고친” 상황과 구분한다.

작은 suite라도 각 case에 최소한 `id`, 재발 위험, 작업 계약, expected outcome, 마지막 검토 시점이 있으면 다음 사람이 기대값의 이유를 추적하기 쉽다.

## 실패 한 건을 eval로 바꾸는 실전 순서

전체 과정을 짧게 줄이면 다음 순서다.

```text
1. incident에서 보이는 증상과 계약 위반을 분리한다.
2. 실제·민감 맥락을 제거한 최소 입력으로 다시 재현한다.
3. required, protected, forbidden, evidence 조건을 적는다.
4. 원래 실패를 negative case로 만든다.
5. 정상 기준과 유효 변형을 positive case로 만든다.
6. false green과 false reject를 각각 한 번 재현한다.
7. 결과 표면에 맞는 grader를 선택하고 failure code를 낸다.
8. 같은 명령으로 재실행한 뒤 suite의 승격·수정·제거 책임을 정한다.
```

여기서 가장 자주 빠지는 단계는 5번이다. 원래 실패만 test로 옮기면 “모두 거부하는 grader”와 “계약을 정확히 구분하는 grader”를 구별하지 못한다. 6번도 중요하다. 기존 검사가 왜 약했거나 경직됐는지 실제 반례로 보여줘야 새 grader의 복잡성이 필요한 이유가 생긴다.

## 결론: 고친 기록보다 다시 잡는 구조를 남긴다

실패 회고는 왜 잘못됐는지 설명한다. 회귀 eval은 다음 결과가 같은 경계를 넘었는지 판정한다. 두 기록은 경쟁하지 않는다. 원인과 맥락은 회고에, 최소 입력과 계약과 기대 판정은 eval에 남긴다.

이번 합성 incident에서는 요구 변경, 보호 상태, 금지 상태, 증거 정직성을 분리했다. positive와 negative case를 함께 두고, 키워드 검사의 false green과 snapshot 검사의 false reject를 재현한 뒤, 의미 단위 deterministic grader로 둘을 구분했다.

좋은 회귀 eval의 기준은 복잡한 점수가 아니다. **같은 실패가 돌아오면 거부하고, 계약을 지킨 유효한 변형은 통과시키며, 왜 실패했는지 다음 수정자가 알 수 있는가**다. 한 번 고친 일을 그렇게 남기면 실패는 주의 문구가 아니라 재실행 가능한 품질 자산이 된다.

## 확인 범위와 한계

- 공개 예제는 built-in module만 사용하며 Node.js `v22.12.0`에서 실행해 확인했다. 다른 Node.js major version이나 다른 JavaScript runtime에서의 동작은 확인하지 않았다.
- 이 글의 설정, incident, 7개 case와 출력은 메커니즘 설명을 위한 합성 자료다. 특정 모델, 제품, 조직의 실제 성능을 측정하지 않는다.
- 7개 사례는 네 계약 경계를 시연하기 위한 최소 suite이며 오류 분포, pass rate, 운영 신뢰성을 추정할 통계 표본이 아니다.
- grader는 구조화된 최종 상태와 검증 목록만 본다. multi-turn reasoning, tool call 순서, 실행 시간, 외부 서비스 장애, 보안 영향은 판정하지 않는다.
- 현재 grader는 `candidate.after`에 새로운 field가 추가되는 경우를 거부하지 않는다. 실제로 “이 field만 바꿔라”를 계약하려면 허용 schema를 고정하거나 모든 비대상 field를 보호하는 assertion을 추가해야 한다.
- `reportedChecks`와 `observedChecks`도 합성 입력이다. 실제 시스템에서는 관찰 목록 자체가 신뢰할 수 있는 실행 로그나 test report에서 생성돼야 한다.
- deterministic grader는 코드에 적지 않은 품질 축을 볼 수 없다. 주관적 품질이나 고위험 책임 판단에는 별도의 rubric, model grader, 사람 검토가 필요하다.
- 특정 agent의 신뢰성을 주장하려면 반복 trial과 production에 가까운 격리 환경, 실패율과 변동성 분석이 별도로 필요하다. 이 글은 모델을 실행하거나 비교하지 않았다.
- eval case가 에이전트 입력에 그대로 노출되면 특정 사례만 맞추는 최적화가 생길 수 있다. 공개 예제와 실제 비공개 회귀 suite의 운영 경계는 따로 설계해야 한다.
- 공식 근거는 2026-07-22에 확인했다. 이후 원문이 바뀌면 인용 문맥과 적용 범위를 다시 확인해야 한다.
