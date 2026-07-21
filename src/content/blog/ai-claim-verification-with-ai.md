---
title: "AI가 내 결론을 반복하지 않게 검증하는 법"
description: "하나의 주장을 검증 가능한 단위로 나누고, build 성공 사례를 근거 범위와 보류 조건에 따라 partly true로 판정하는 과정을 설명합니다."
pubDate: 2026-07-06T01:30:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/diagrams/ai-claim-verification.svg"
---

AI에게 “내 생각이 맞아?”라고 물으면 결론보다 대화의 방향이 먼저 정해진다. 사용자의 문장을 이어 설명하는 것이 가장 자연스러운 답이 되기 때문이다. 반대로 역할과 증거 규칙 없이 반박만 요구하면 가능한 반례와 억지 반례가 섞인다. 중요한 차이는 찬성과 반대 중 어느 역할을 주느냐가 아니라, 그 역할의 목적과 실패 경계를 함께 정했느냐다.

이 글의 질문은 **AI가 사용자의 결론을 반복하지 않게 하면서, 한 주장을 어떻게 검증 가능한 단위와 보류 조건으로 바꾸는가**다. 설명을 위한 합성 주장 하나를 처음부터 끝까지 판정해 본다.

```text
주장: build 성공이면 public 발행 준비가 끝났다.
```

결론부터 말하면 이 주장의 판정은 `partly true`다. build 성공은 발행 준비의 한 조건을 통과했다는 근거지만, 내용·공개 안전·생성 결과·live 반영까지 끝났다는 근거는 아니기 때문이다.

<figure>
	<img src="/blog/blog-images/ai-claim-verification.svg" alt="주장 분해, 근거 범위 확인, 반례 검토, 보류 조건과 판정으로 이어지는 AI 의견 검증 흐름" />
	<figcaption>이 그림은 실제 검증 제품 화면이 아니라, 하나의 주장을 증거 단위로 나누는 흐름을 설명한 개념도다.</figcaption>
</figure>

## 결론을 네 개의 판단 단위로 바꾼다

원래 문장은 두 상태를 한 번에 묶는다. “build contract를 통과했다”와 “사람이 public 발행을 승인해도 된다”는 같은 말이 아니다. 먼저 다음처럼 나눈다.

1. 설정된 build 명령이 성공했다.
2. build가 검사하도록 설정된 schema와 asset 참조가 유효하다.
3. 글의 의미와 공개 안전까지 확인됐다.
4. 생성 결과와 live page까지 확인됐다.

이 분해가 필요한 이유는 각 문장이 요구하는 증거가 다르기 때문이다. 1번은 명령의 exit code로 볼 수 있다. 2번은 그 build가 실제로 무엇을 검사하는지 알아야 한다. 3번은 내용 review와 공개 전 제거 대상 검색이 필요하다. 4번은 생성 결과 scan과 배포 후 readback이 필요하다.

“build가 성공했다”는 하나의 관찰을 3번과 4번의 근거로 확장하면, 관찰보다 결론이 넓어진다.

## 합성 사례에서 build는 성공했다

가상의 정적 게시물 하나를 가정한다. 이 사례의 build script는 frontmatter schema, 본문 parse, 저장소에 포함된 대표 이미지 참조를 검사한다. 게시물에는 다음 상태를 의도적으로 함께 둔다.

```text
frontmatter schema: valid
hero image reference: resolved
body parse: valid
본문 날짜: 2026-02-30
공개 전 제거 대상 marker: present
generated output scan: not run
live page readback: not run
```

build 결과는 다음과 같다.

```text
$ npm run build
build completed
exit code: 0
```

이 결과로 “명령이 성공했다”는 확인된다. 이 합성 build가 schema와 대표 이미지 참조를 검사하도록 구성됐으므로 그 두 조건도 통과했다고 말할 수 있다.

하지만 `2026-02-30`이 유효한 날짜인지는 build 대상이 아니다. 공개 전 제거 marker도 일반 본문으로 parse되므로 build를 막지 않는다. 생성 결과 scan과 live readback은 아예 실행하지 않았다. 같은 실행 결과가 앞의 네 판단 단위에 주는 답은 서로 다르다.

| 판단 단위 | 직접 근거 | 판정 | 보류 조건 |
|---|---|---|---|
| 설정된 build 명령 성공 | exit code `0` | `true` | 없음 |
| schema와 대표 이미지 참조 유효 | 이 사례의 build contract와 성공 로그 | `true` | build 설정이 바뀌면 다시 확인 |
| 의미와 공개 안전 확인 | 잘못된 날짜와 제거 marker가 남음 | `false` | 날짜 수정, marker 제거, 사람 review와 scan |
| 생성 결과와 live 반영 확인 | 두 검증 모두 미실행 | `insufficient evidence` | output scan과 배포 후 readback |

합성 사례에서 build 성공은 사실이다. 다만 “그래서 발행 준비가 끝났다”는 결론은 성립하지 않는다. 문장 전체를 구성하는 일부가 참이고, 나머지는 거짓이거나 증거가 없으므로 최종 판정은 `partly true`다.

## 세 접근을 같은 증거 규칙으로 비교한다

strongest-support synthesis, bounded red-team, evidence-led verification은 서로 다른 목적에 쓸 수 있다. 공정하게 비교하려면 세 접근 모두 같은 build 주장과 같은 관찰 자료를 받아야 한다.

```text
공통 주장: build 성공이면 public 발행 준비가 끝났다.

관찰된 증거:
- build exit code는 0이다.
- 이 build가 검사하는 schema와 대표 이미지 참조는 통과했다.
- 본문에는 잘못된 날짜와 공개 전 제거 marker가 남아 있다.
- generated output scan과 live readback은 실행하지 않았다.

공통 규칙:
- 관찰된 증거와 아직 확인하지 않은 가설을 분리한다.
- 유리하거나 불리한 가설을 사실처럼 판정에 넣지 않는다.
- build가 직접 증명하는 범위를 유지한다.
```

### Strongest-support synthesis: 주장이 성립할 최선의 조건을 찾는다

이 접근은 아이디어가 거칠 때 가장 강한 형태로 다시 쓰거나, 추가 검증에 투자할 가치가 있는지 볼 때 유용하다.

```text
이 주장의 가장 강한 해석과 성립 조건을 만들어줘.
현재 관찰이 직접 지지하는 부분과, 성립하려면 추가로 확인할 가설을 분리해줘.
반대 증거를 숨기지 말고 현재 truth status는 별도로 남겨줘.
```

합성 사례에서 strongest-support는 “build에 의미 review, 공개 안전 scan, output 검증, live readback까지 포함되고 각 결과가 기록됐다면 발행 준비 완료를 지지할 수 있다”는 최선의 조건을 만든다. 이것은 좋은 검증 설계 후보지만 현재 관찰은 아니다. 잘못된 날짜와 marker가 이미 남아 있으므로, strongest-support도 현재 주장을 `true`라고 판정할 수 없다.

이 접근의 실패 경계는 성립 조건을 현재 사실로 바꾸는 순간이다. strongest-support는 주장을 개선하는 데 강하지만, 지지 가설을 검증하지 않은 채 최종 판정으로 승격하면 동의 편향이 된다.

### Bounded red-team: 가능한 실패를 정해진 경계 안에서 찾는다

이 접근은 발행 직전처럼 놓친 위험의 비용이 크거나, 알려진 검증이 보지 않는 surface를 찾을 때 유용하다.

```text
이 주장을 bounded red-team으로 검토해줘.
직접 관찰된 반대 증거와 추가 확인할 실패 가설을 분리하고,
build가 확인한 사실은 부정하지 마.
판정을 바꿀 수 있는 반례만 우선해줘.
```

합성 사례에서 red-team은 잘못된 날짜, 제거 marker, 미실행 output scan과 live readback을 직접 관찰된 반대 증거로 잡는다. “숨은 링크 오류가 더 있을 수 있다”는 확인 후보로만 남긴다. 동시에 schema와 대표 이미지 참조가 통과했다는 사실은 보존한다.

이 접근의 실패 경계는 관찰하지 않은 위험을 실제 실패로 세거나, 반대 역할을 지키려고 build의 유효한 증거까지 무시하는 순간이다. bounded red-team은 failure discovery에 강하지만, 발견 후보의 존재만으로 전체 주장을 `false`라고 정하면 억지 반박이 된다.

### Evidence-led verification: 현재 truth status를 판정한다

이 접근은 지금 가진 증거로 승인·보류 같은 결정을 내려야 할 때 유용하다.

```text
주장을 검증 가능한 단위로 나눠줘.
각 단위마다 직접 근거, 근거가 증명하지 않는 범위,
반대 증거, 추가 확인 전 보류할 결론을 적어줘.
true, false, partly true, insufficient evidence만 사용해 판정해줘.
```

evidence-led verification은 build 성공과 build contract 통과를 `true`, 의미·공개 안전을 `false`, output·live 상태를 `insufficient evidence`로 연결한다. 그래서 같은 합성 주장의 현재 판정은 `partly true`다.

이 접근의 실패 경계는 이미 모은 evidence map을 완전하다고 착각하는 순간이다. 알려지지 않은 실패 후보를 넓히는 데는 strongest-support와 bounded red-team이 도움이 된다. 다만 그 후보도 관찰로 확인된 뒤에만 truth status를 바꿀 수 있다.

| 접근 | 주된 목적 | 같은 build 주장에 주는 결과 | 실패 경계 |
|---|---|---|---|
| strongest-support synthesis | 가장 강한 해석과 성립 조건 설계 | 더 강한 발행 gate 가설을 만들지만 현재 `true`로 올리지는 않음 | 지지 가설을 관찰된 증거처럼 사용 |
| bounded red-team | 중요한 실패 후보와 반대 증거 발견 | 직접 반대 증거를 찾되 build가 확인한 사실은 보존 | 가설을 실제 실패로 세거나 참인 증거를 부정 |
| evidence-led verification | 현재 truth status와 보류 조건 판정 | `partly true` | evidence map 밖의 위험이 없다고 간주 |

세 접근은 승자 하나를 고르는 대안이 아니다. strongest-support는 가장 강한 성립 조건을, bounded red-team은 실패 후보를 넓히는 데 적합하다. 현재 주장의 truth status를 판정하는 목적에는 evidence-led verification이 맞고, 앞의 두 접근에서 나온 가설은 다음 확인 목록으로 사용한다.

## 작동 원리는 주장과 증거 사이의 간격을 드러내는 것이다

truth status를 정하는 evidence-led verification은 다섯 단계로 움직인다.

1. **주장 분해:** 하나의 결론을 서로 다른 증거가 필요한 문장으로 나눈다.
2. **직접 근거 연결:** 각 문장을 실제 실행 결과나 확인 가능한 자료와 연결한다.
3. **증명 범위 제한:** 근거가 직접 확인한 것과 확인하지 않은 것을 구분한다.
4. **경쟁 설명 확인:** 같은 결과가 다른 원인으로도 나올 수 있는지, 반대 증거가 있는지 본다.
5. **판정과 보류:** 현재 근거로 내릴 수 있는 판정과 다음 확인 전 멈출 결론을 함께 적는다.

핵심은 반례의 개수가 아니다. 반례 하나가 실제 관찰인지, 단지 가능한 이야기인지 구분해야 한다. AI가 만든 반례는 확인할 후보일 뿐 source가 아니다. 반례가 판정을 바꾸려면 실행 결과, 원자료, 1차 출처처럼 독립적으로 확인 가능한 근거와 연결돼야 한다.

## 무엇이 나오면 `partly true`를 벗어나는가

이 사례의 판정은 영구적이지 않다.

- 잘못된 날짜를 수정하고 의미 review를 통과한다.
- 공개 전 제거 marker가 source와 generated output 모두에서 사라진다.
- 생성 결과의 링크와 asset을 확인한다.
- 배포 뒤 실제 page를 readback한다.

이 조건이 모두 확인되면 “이 사례는 발행 준비 gate를 통과했다”는 더 강한 결론으로 갈 수 있다. 그래도 “모든 public 발행이 안전하다”는 일반화는 할 수 없다. 반대로 build가 실패하면 첫 번째 판단 단위부터 `false`가 되므로 발행 준비 판정은 즉시 보류된다.

## 결론: 검증은 동의와 반대 사이에서 고르는 일이 아니다

AI가 내 결론을 반복하지 않게 하려면 “맞아?” 대신 주장 단위, 직접 근거, 증명하지 않는 범위, 반대 증거, 보류 조건을 요구해야 한다. 그러면 참인 부분을 보존하면서도 근거가 닿지 않는 결론을 멈출 수 있다.

strongest-support synthesis는 주장의 최선 형태와 성립 조건이 필요할 때, bounded red-team은 실패 비용이 큰 surface의 반례 후보를 넓힐 때 유용하다. 두 접근도 관찰과 가설을 나눠야 한다. 현재 truth status가 필요한 순간에는 같은 증거 규칙을 적용한 evidence-led verification으로 판정한다.

합성 주장 `build 성공이면 public 발행 준비가 끝났다`의 최종 판정은 `partly true`다. build 성공은 설정된 build contract를 통과했다는 뜻까지는 지지한다. 내용 정확성, 공개 안전, generated output, live 상태는 별도 증거가 필요하다.

주장의 truth status를 이 범위로 제한한 다음에는 질문이 바뀐다. 실제 artifact를 인수할 수 있는지는 별개의 문제이며, [AI가 만든 결과를 리뷰할 때 먼저 보는 5가지](/blog/blog/ai-output-review-first-checks/)에서 요청 일치와 변경 범위부터 판정한다.

## 확인 범위와 한계

- 이 글의 게시물과 실행 결과는 메커니즘을 설명하기 위한 합성 사례이며 실제 발행 사건이 아니다.
- build가 검사하는 범위는 프로젝트마다 다르다. 이 사례의 schema·asset 조건을 다른 build에 그대로 적용할 수 없다.
- AI가 제안한 반례와 원인 후보는 source가 아니며 독립적인 확인 전에는 근거로 취급하지 않는다.
- 최신 제품 동작과 정책은 현재 1차 출처로 다시 확인해야 한다.
- 법률, 의료, 금융처럼 잘못된 판단의 비용이 큰 주제는 1차 출처와 자격 있는 전문가의 검토가 필요하다.
