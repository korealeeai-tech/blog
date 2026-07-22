---
title: "회귀 테스트는 결함을 얼마나 잡는가: mutation testing으로 검증력 측정하기"
description: "같은 8개 합성 mutant에 약한 suite와 보강 suite를 실행해 killed·survived 결과와 mutation score로 테스트의 사각지대를 찾는 과정을 설명합니다."
pubDate: 2026-07-22T13:39:09+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/diagrams/regression-test-mutation-score.svg"
---

테스트가 모두 통과했다는 보고를 받으면 보통 안심한다. 적어도 지금 작성된 assertion과 현재 구현은 충돌하지 않는다는 뜻이기 때문이다. 하지만 여기에는 답하지 않은 질문이 하나 남는다.

**그 테스트는 그럴듯하게 잘못된 구현도 실제로 거부할 수 있는가?**

이 질문은 [실패 한 건을 회귀 eval로 바꾸는 일](/blog/blog/ai-failure-to-regression-eval/) 다음에 자연스럽게 생긴다. 실패를 재현하는 case와 grader를 만들었더라도, grader나 test suite가 약하면 같은 종류의 잘못된 결과가 다시 통과할 수 있다. [검증 실패를 다음 수정으로 연결하는 loop](/blog/blog/ai-coding-validation-loop/)는 현재 실패를 고치는 순서를 다루고, [자연어 규칙과 자동 gate의 분리](/blog/blog/ai-rules-need-validation-gates/)는 누락을 실행 실패로 바꾸는 구조를 다룬다. 이 글은 그보다 좁게, **이미 존재하는 test suite의 결함 검출력을 어떻게 시험할지**만 다룬다.

이를 위해 공개용 release gate 함수 하나와 의미를 하나씩 훼손한 mutant 8개를 만들었다. 같은 mutant 집합을 test 2개, 7개, 8개짜리 suite에 차례로 실행했다. 결과는 `2/8 → 7/8 → 8/8`이었다. 마지막 100%는 자랑할 숫자가 아니라, 그 수치가 어디까지 말할 수 있고 어디서 멈춰야 하는지 확인하기 위한 경계다.

## test pass와 결함 검출력은 다른 질문이다

일반 test 실행은 현재 구현이 준비된 사례의 기대값을 만족하는지 확인한다. 이 확인은 필수지만 방향이 하나뿐이다.

```text
현재 구현 → 준비된 test → 모두 통과
```

여기서 test가 실제로 민감한지 알려면 구현 쪽을 의도적으로 흔들어야 한다. 경계 연산자를 바꾸고, 필수 조건을 제거하고, 잘못된 승인 조건을 넣었을 때 기존 test가 실패하는지 본다.

```text
정상 구현 → test 통과
잘못 바꾼 구현 A → test 실패?
잘못 바꾼 구현 B → test 실패?
잘못 바꾼 구현 C → test 실패?
```

정상 구현만 실행하면 A, B, C에 대한 정보는 없다. coverage가 높아도 마찬가지다. 어떤 줄이 실행됐다는 사실과 그 줄의 의미가 바뀌었을 때 assertion이 실패한다는 사실은 같지 않다. 반대로 mutation testing도 coverage를 대체하지 않는다. 실행되지 않은 코드, 잘못 선택한 test 범위, 통합 경로 누락은 별도 신호로 남는다.

## mutation testing은 test를 어떻게 시험하는가

Stryker의 공식 설명은 각 mutant에서 test를 다시 실행하고, 그 실패 여부로 killed와 survived를 나누는 흐름을 설명한다.

> [Stryker 공식 문서](https://stryker-mutator.io/docs/): “Your tests are run for each mutant.”

<figure>
	<img src="/blog/blog-images/official-docs/regression-test-mutation-score/stryker-mutation-testing.png" alt="Stryker 공식 문서의 Your tests are run for each mutant 문장" />
	<figcaption>Stryker 공식 문서 캡처, 확인일 2026-07-22. 각 mutant에 test를 실행한다는 원문 문장을 보여준다. 이 캡처만으로 killed·survived의 전체 상태 모델, 이 글의 8개 mutant 선택, production 결함 검출률을 증명하지 않는다.</figcaption>
</figure>

최소 흐름은 다음과 같다.

1. 먼저 정상 구현이 원래 test suite를 모두 통과해야 한다.
2. production code의 의미를 한 곳 바꾼 mutant를 만든다.
3. mutant 하나를 활성화한 상태에서 같은 suite를 실행한다.
4. test가 하나라도 실패하면 `killed`, 모두 통과하면 `survived`로 분류한다.
5. 여러 survivor가 어디에서 생겼는지 보고 test나 contract를 다시 검토한다.

이 글의 예제는 Stryker 같은 자동 mutation engine이 아니다. 어떤 의미 결함을 넣었는지 독자가 한 파일에서 확인할 수 있도록 mutant를 수동으로 고정한 교육용 runner다. 따라서 “JavaScript mutation 도구를 어떻게 설정하는가”가 아니라 “survivor가 test 설계에 어떤 질문을 던지는가”에 집중한다.

## 합성 release gate의 계약

예제의 `assessRelease(input)`은 네 조건으로 변경 승인을 판정한다. 실제 배포 시스템을 복제한 것이 아니라, 서로 독립된 조건과 경계값, 복합 오류를 작은 코드에서 관찰하기 위한 합성 함수다.

| 입력 | 정상 계약 | 위반 reason |
|---|---|---|
| `testsPassed` | 정확히 `true` | `tests_not_passed` |
| `rollbackReady` | 정확히 `true` | `rollback_not_ready` |
| `exposedSecrets` | 정수 `0` | `secret_count_invalid` |
| `changedFiles` | 1 이상 5 이하의 정수 | `scope_invalid` |

실제 baseline 구현은 다음과 같다. 전체 코드는 [mutation-testing-fixture.mjs](/blog/blog-examples/mutation-testing-fixture.mjs)에 있다.

```js
export function assessRelease(input) {
	const reasons = [];
	if (input.testsPassed !== true) reasons.push('tests_not_passed');
	if (input.rollbackReady !== true) reasons.push('rollback_not_ready');
	if (!Number.isInteger(input.exposedSecrets) || input.exposedSecrets !== 0) {
		reasons.push('secret_count_invalid');
	}
	if (!Number.isInteger(input.changedFiles)
		|| input.changedFiles < 1
		|| input.changedFiles > 5) {
		reasons.push('scope_invalid');
	}
	return { approved: reasons.length === 0, reasons };
}
```

승인 여부만 맞으면 끝나는 계약도 아니다. 여러 조건을 어기면 해당 reason을 모두 반환해야 한다. 사용자가 첫 번째 오류를 고친 뒤에야 두 번째 오류를 발견하는 식의 불필요한 재시도를 줄이기 위해서다.

## 결과를 보기 전에 8개 mutant를 고정했다

결과가 마음에 들지 않을 때 쉬운 mutant를 추가하거나 어려운 mutant를 빼면 mutation score는 설명력이 없다. 그래서 test를 실행하기 전에 다음 여덟 가지 의미 변화를 고정했다.

| mutant | 바꾼 의미 | 잡으려면 필요한 관찰 |
|---|---|---|
| `skip-tests-check` | test 실패 조건 제거 | `testsPassed: false` 거부 |
| `skip-rollback-check` | rollback 조건 제거 | `rollbackReady: false` 거부 |
| `allow-negative-secret-count` | 음수 secret 수를 안전하다고 처리 | 비정상 음수 입력 거부 |
| `reject-upper-boundary` | 유효한 상한 5를 거부 | `changedFiles: 5` 통과 |
| `allow-zero-changes` | 변경 파일 0개를 허용 | `changedFiles: 0` 거부 |
| `allow-fractional-changes` | 정수 조건 제거 | `changedFiles: 1.5` 거부 |
| `approve-one-failure` | reason 한 개까지 승인 | 단일 위반도 승인 금지 |
| `truncate-multiple-reasons` | 여러 reason 중 첫 항목만 반환 | 복합 실패의 reason 전체 확인 |

모두 baseline과 다른 결과를 만드는 입력을 갖고 있다. 예를 들어 `reject-upper-boundary`는 값 5에서, `truncate-multiple-reasons`는 두 조건 이상을 동시에 위반할 때 baseline과 갈린다. 구문만 다르고 가능한 모든 입력에서 결과가 같은 변이는 이번 분모에 넣지 않았다.

이 선택에도 편향은 남는다. 네 조건 주변의 작은 결함만 골랐기 때문에 I/O, 동시성, 권한, 시간, 외부 서비스 같은 실패는 애초에 생성하지 않는다. 높은 score가 나오더라도 이 경계를 넘어 일반화하면 안 된다.

## runner가 killed와 survived를 판정하는 방식

[run-mutation-score.mjs](/blog/blog-examples/run-mutation-score.mjs)는 외부 dependency 없이 Node.js built-in module만 사용한다. 먼저 baseline을 모든 test에 실행하고 exact expected object와 비교한다. baseline이 실패하면 mutant 결과를 만들지 않고 즉시 중단한다. 잘못된 기대값으로 높은 score를 만드는 일을 막기 위해서다.

그다음 mutant마다 suite 전체를 실행한다.

```js
const survived = tests.every((test) => {
	const actual = mutant.execute(test.input);
	return isDeepStrictEqual(actual, test.expected);
});
```

하나라도 expected와 다르면 그 mutant는 killed다. 전부 같으면 survived다. 이 예제의 score는 다음처럼 계산했다.

```text
mutation score = killed mutant 수 / 고정한 mutant 수 × 100
```

자동 도구에서는 timeout, no coverage, compile error처럼 더 많은 상태를 구분할 수 있다. 여기서는 모두 실행 가능한 함수 8개만 사용했기 때문에 killed와 survived만 계산한다. 간단한 대신, 이 숫자를 자동 도구의 전체 report와 같은 범위로 읽어서는 안 된다.

## 첫 실행: test 2개는 8개 중 2개만 잡았다

`weak` suite에는 정상 입력과 `testsPassed: false` 두 사례만 있다. 둘 다 baseline에서 통과하므로 일반 test 결과는 green이다.

```text
valid-reference  → approved true
tests-failed     → approved false, tests_not_passed
```

하지만 mutant를 실행하자 결과가 달라졌다.

```json
{
  "test_count": 2,
  "killed": 2,
  "survived": 6,
  "mutation_score": 25,
  "killed_ids": [
    "approve-one-failure",
    "skip-tests-check"
  ]
}
```

이 suite는 test 실패를 무시하거나 test 실패 한 건을 두고도 승인하는 구현은 잡는다. 그러나 rollback, secret 수, 변경 범위와 reason 누적은 한 번도 관찰하지 않는다. 여섯 mutant가 살아남은 것은 runner가 약해서가 아니라, 준비한 두 test가 그 차이를 질문하지 않았기 때문이다.

여기서 “test 두 개는 부족하다”라고 일반화하면 안 된다. 함수 하나의 핵심 계약을 test 두 개로 충분히 표현할 수도 있다. 이번에는 네 독립 조건과 출력 목록 계약을 test 두 개로 표현하려 했기 때문에 부족했다.

## 두 번째 실행: 독립 조건과 경계를 넣자 7개가 잡혔다

`strengthened` suite는 weak 두 건에 다섯 test를 더한다.

- rollback이 준비되지 않은 입력
- 음수 `exposedSecrets`
- 유효한 상한 `changedFiles: 5`
- 허용하지 않는 `changedFiles: 0`
- 정수가 아닌 `changedFiles: 1.5`

정상 경계 하나와 비정상 경계 네 개를 추가한 뒤 같은 mutant 집합을 다시 실행했다.

```json
{
  "test_count": 7,
  "killed": 7,
  "survived": 1,
  "mutation_score": 87.5,
  "survived_ids": [
    "truncate-multiple-reasons"
  ]
}
```

점수보다 survivor 이름이 더 유용했다. 일곱 test는 각 조건을 하나씩 위반한다. 그래서 `approved`와 단일 reason은 확인하지만, 여러 위반이 동시에 생겼을 때 reason 목록을 전부 보존하는지는 확인하지 않는다.

`truncate-multiple-reasons`는 승인 여부를 올바르게 `false`로 반환하면서 첫 reason만 남긴다. 개별 실패 test에서는 baseline과 완전히 같은 결과를 내므로 살아남았다. 이 survivor는 “test 개수가 아직 적다”가 아니라 **복합 실패에서의 출력 계약이 suite에 표현되지 않았다**는 더 구체적인 신호다.

## 세 번째 실행: 복합 실패 한 건이 마지막 survivor를 잡았다

마지막 `diagnostic` suite에는 새 조건을 늘리지 않았다. 이미 있던 네 조건을 동시에 어기는 입력 하나를 추가하고, 네 reason이 모두 순서대로 나오는지만 확인했다.

```js
{
	testsPassed: false,
	rollbackReady: false,
	exposedSecrets: 1,
	changedFiles: 0
}
```

기대 결과는 다음과 같다.

```js
{
	approved: false,
	reasons: [
		'tests_not_passed',
		'rollback_not_ready',
		'secret_count_invalid',
		'scope_invalid'
	]
}
```

다시 실행하자 `truncate-multiple-reasons`도 killed가 됐다.

```json
{
  "test_count": 8,
  "killed": 8,
  "survived": 0,
  "mutation_score": 100
}
```

이 변화가 보여주는 것은 “test를 많이 쓰면 좋다”가 아니다. survivor가 가리킨 **빠진 계약 하나**를 찾아 가장 좁은 test로 표현했더니, 그 의미 결함을 구분하게 됐다는 것이다.

대표 그림은 이 합성 실험을 단순화한 개념도다. 실제 mutation dashboard나 production 신뢰성 증거가 아니다.

## 통과, coverage, mutation score가 답하는 질문

세 신호는 서로 경쟁하는 단일 점수가 아니다.

| 신호 | 직접 답하는 질문 | 답하지 못하는 것 |
|---|---|---|
| 일반 test pass | 현재 구현이 준비된 사례의 expected를 만족하는가 | 다른 잘못된 구현을 구분할 수 있는가 |
| code coverage | 실행 중 어떤 코드 위치에 도달했는가 | 도달한 코드의 의미 변화에 assertion이 반응하는가 |
| mutation score | 선택한 mutant 중 몇 개를 suite가 거부했는가 | 선택하지 않은 실제 결함과 운영 위험까지 잡는가 |

coverage가 낮으면 mutation을 실행할 코드 자체가 충분히 노출되지 않을 수 있다. mutation score가 높아도 통합 환경이나 사용자 경로를 test하지 않았다면 그 위험은 그대로다. 일반 test가 green이어야 mutation 결과도 해석할 수 있다. baseline이 이미 red인데 mutant 점수부터 계산하면 test 결함과 production 결함을 섞게 된다.

따라서 순서는 `baseline pass → coverage·범위 확인 → mutation survivor 분석 → 필요한 integration/운영 검증`에 가깝다. 프로젝트의 위험에 따라 각 단계의 비중은 달라진다.

## survivor를 만나면 test부터 추가하지 않는다

survivor가 나왔을 때 기계적으로 test 한 건을 추가하면 score는 오르지만 suite가 꼭 좋아지는 것은 아니다. 먼저 세 가지 중 어디에 속하는지 판정해야 한다.

### 1. 실제로 빠진 계약인가

이번 `truncate-multiple-reasons`처럼 baseline과 mutant가 다른 결과를 만들고, 그 차이가 사용자가 의존하는 출력 계약이라면 missing test다. 가장 작은 counterexample을 추가하고 다시 실행할 가치가 있다.

### 2. baseline과 의미가 같은 변이인가

구문은 달라도 가능한 입력에서 관찰 결과가 같다면 test로 구분할 수 없다. 이런 equivalent mutation을 억지로 kill하려고 구현 세부에 결합한 assertion을 만들면 test가 더 취약해질 수 있다. 분모에서 제외할 때는 근거와 이유를 남겨 score를 조용히 유리하게 만들지 않아야 한다.

### 3. 관찰할 필요가 없는 코드인가

logging 문구, 방어적으로 남은 도달 불가능 분기, 더 이상 사용하지 않는 코드가 mutant를 만들 수도 있다. 이때 답은 test 추가가 아니라 코드 제거, 관찰 범위 제외, 또는 계약 재정의일 수 있다.

판정이 끝난 뒤에도 test 비용을 본다. 한 survivor를 kill하려고 비싼 end-to-end 환경을 매번 띄워야 한다면 unit assertion보다 다른 계층의 검증이 맞을 수 있다. mutation report는 결정을 대신하지 않고 조사 순서를 좁혀준다.

## 100%가 완전한 품질 증명이 아닌 이유

`diagnostic` suite의 score는 100%다. 정확한 문장은 **“미리 고정한 합성 mutant 8개를 이 test 8개가 모두 구분했다”**다.

다음 문장들은 이 결과로 말할 수 없다.

- 실제 결함을 100% 잡는다.
- 모든 경계값을 확인했다.
- 보안이나 성능 문제가 없다.
- production의 I/O와 동시성 경로가 안전하다.
- AI가 다음에 생성할 어떤 코드도 검증할 수 있다.
- mutant 8개가 현실의 오류 분포를 대표한다.

mutant를 쉬운 것만 고르면 약한 suite도 높은 점수를 얻는다. 너무 많은 비현실적 변이를 만들면 중요한 survivor가 잡음에 묻힌다. 자동 도구를 쓰더라도 operator와 대상 경로, 제외 기준, timeout 처리, equivalent 가능성을 함께 기록해야 score를 비교할 수 있다.

이번 100%의 용도는 품질 인증이 아니다. weak에서 6개였던 survivor가 어떤 test를 추가할 때 1개로, 다시 0개로 줄었는지 추적하는 **국소적인 설계 피드백**이다.

## 실제 프로젝트에 적용하는 순서

처음부터 저장소 전체에 mutation testing을 걸면 실행 시간과 survivor 수가 너무 커질 수 있다. 다음처럼 작은 위험 표면부터 시작하는 편이 낫다.

1. 잘못되면 비용이 큰 순수 함수나 validation boundary 하나를 고른다.
2. baseline test가 안정적으로 통과하는지 먼저 확인한다.
3. 실제로 우려하는 결함 유형과 사용할 mutation operator를 결과 전에 고정한다.
4. mutant를 하나씩 실행하고 killed, survived, 실행 오류를 구분한다.
5. survivor마다 missing contract, equivalent/out-of-scope, 불필요 코드 중 하나로 판정한다.
6. missing contract에만 가장 좁은 test를 추가한다.
7. 같은 mutant 집합을 다시 실행하고 변화 이유를 기록한다.
8. 점수 상승보다 중요한 survivor가 설명됐는지를 종료 기준으로 삼는다.

회귀가 자주 생기는 모듈, 경계 연산자가 많은 validation, 승인·권한 분기, 오류 reason처럼 여러 값을 누적하는 코드가 작은 시작점이 될 수 있다. 반대로 UI 전체 snapshot이나 외부 서비스에 강하게 의존하는 흐름은 mutant 한 개마다 실행 비용과 비결정성이 커질 수 있어 별도 설계가 필요하다.

## 공개 예제를 재현하는 방법

예제는 Node.js `v22.12.0`에서 실행했다. `node:util`, `node:path`, `node:url`만 사용하며 package 설치는 필요 없다.

전체 suite를 한 번에 실행한다.

```bash
node public/blog-examples/run-mutation-score.mjs
```

한 suite만 보고 싶다면 이름을 지정한다.

```bash
node public/blog-examples/run-mutation-score.mjs --suite strengthened
```

출력에서 확인할 항목은 `test_count`, `killed`, `survived`, `mutation_score`, `killed_ids`, `survived_ids`다. `strengthened`의 expected checkpoint는 `7 killed / 1 survived / 87.5`와 `truncate-multiple-reasons`다.

정의하지 않은 suite를 넣으면 성공처럼 빈 결과를 내지 않고 종료 코드 1로 실패한다.

```bash
node public/blog-examples/run-mutation-score.mjs --suite unknown
# Unknown suite: unknown
```

runner는 중복 mutant id, 빈 suite, baseline mismatch도 거부한다. baseline이 expected와 다르면 mutation score를 계산하지 않는 것이 정상 동작이다. 테스트 대상 자체가 깨진 상태에서 mutant 결과를 해석할 수 없기 때문이다.

## 결론: test를 믿기 전에 한 번 틀리게 만들어 본다

회귀 테스트의 결함 검출력은 green 표시만으로 알 수 없다. 정상 구현을 통과시키는지 확인한 뒤, 계약을 하나씩 훼손한 mutant에서도 같은 suite가 실패하는지 봐야 한다.

이번 합성 실험에서 test 두 개는 8개 mutant 중 2개를, 독립 조건과 경계를 추가한 일곱 test는 7개를 잡았다. 남은 survivor는 복합 실패의 reason 누적 계약이 빠졌음을 보여줬고, 그 조건 하나를 추가하자 고정한 8개를 모두 구분했다.

mutation score의 가장 좋은 쓰임은 높은 숫자를 발표하는 것이 아니다. **어떤 잘못된 구현이 아직 green으로 남는지 이름을 붙이고, 그 survivor가 빠진 test인지 잘못 만든 mutant인지 불필요 코드인지 판정하는 것**이다. 그 과정을 거치면 test는 “현재 코드가 통과했다”는 기록에서 “우리가 중요하다고 정한 일부 결함을 실제로 거부한다”는 더 강한 증거로 바뀐다.

## 확인 범위와 한계

- 공개 예제는 Node.js `v22.12.0`에서 실행했다. 다른 major version과 다른 JavaScript runtime은 확인하지 않았다.
- 함수, 입력, test 8개, mutant 8개는 메커니즘 설명을 위한 합성 자료다. 실제 프로젝트의 결함 분포와 발생률을 측정하지 않는다.
- mutant는 수동으로 선별했다. 자동 mutation framework의 operator, instrumentation, timeout, no-coverage, compile/runtime error 상태를 구현하지 않았다.
- 세 suite는 같은 baseline과 mutant 집합을 사용한 결정적 비교다. 통계 표본이나 반복 모델 실험이 아니다.
- code coverage 수치를 직접 측정하지 않았다. coverage와 mutation score의 우열을 실험한 글이 아니다.
- I/O, database, network, concurrency, time, security, performance, 접근성, 실제 사용자 행동은 범위 밖이다.
- 특정 AI 모델이 test를 생성하지 않았고 모델별 test 품질도 비교하지 않았다. 따라서 AI-generated test의 우열이나 신뢰성을 주장하지 않는다.
- 100% score는 고정한 8개 mutant에만 해당한다. 새로운 mutant를 추가하면 score와 survivor는 달라질 수 있다.
- 공식 근거는 2026-07-22에 확인했다. 이후 문서나 도구 동작이 바뀌면 killed, survived, score 해석을 다시 확인해야 한다.

## 확인 기준

- Stryker 공식 문서: [What is mutation testing?](https://stryker-mutator.io/docs/)
- 공개 실행 자산: [mutation-testing-fixture.mjs](/blog/blog-examples/mutation-testing-fixture.mjs), [run-mutation-score.mjs](/blog/blog-examples/run-mutation-score.mjs)
- 실행 환경: Node.js `v22.12.0`, external dependency 없음
- 실제 실행 결과: weak `2/8`, strengthened `7/8`, diagnostic `8/8`
