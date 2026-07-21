---
title: "AI 코딩 전에 어떤 문서를 어디까지 읽어야 할까"
description: "code-first, all-docs-first, scoped-doc-first를 합성 변경 요청에 적용해 추측을 줄이면서 stale 문서를 피하는 근거 탐색 순서를 설명합니다."
pubDate: 2026-07-01T10:50:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/doc-first-ai-coding.png"
---

AI에게 “코드보다 문서를 먼저 읽어라”라고 말하는 것만으로는 충분하지 않다. 문서가 적으면 좋은 출발점이지만, 저장소가 커지면 오래된 설계안과 현재 규칙, 무관한 운영 문서가 함께 나온다. 전부 읽으면 안전해 보이지만 서로 충돌하는 문장을 더 많이 만날 수도 있다.

이 글의 질문은 **어떤 문서를 어디까지 읽어야 코드 수정 전 추측 범위를 줄이면서 stale 문서의 함정을 피할 수 있는가**다. 답을 “문서를 많이 읽는다”가 아니라, 현재 변경의 불확실성을 하나씩 닫는 evidence route로 만든다.

<figure>
	<img src="/blog/blog-images/doc-first-ai-coding.svg" alt="공식 기능 경계, 저장소 규칙, 주변 코드 패턴, 실행 증거 순으로 불확실성을 줄이는 Doc-first 흐름" />
	<figcaption>이 그림은 실제 프로젝트 구조가 아니라 작업별 근거를 좁혀 가는 순서를 설명한 개념도다.</figcaption>
</figure>

## 공식 동작은 출발점을 제공할 뿐이다

OpenAI Codex 문서는 `AGENTS.md`를 작업 전에 읽는 지침 파일로 설명한다.

> [OpenAI Codex AGENTS.md 문서](https://developers.openai.com/codex/guides/agents-md): "Codex reads `AGENTS.md` files before doing any work."

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-agents-md-reads.png" alt="OpenAI Codex AGENTS.md 공식문서에서 Codex가 작업 전 AGENTS.md 파일을 읽는다고 설명한 영역 캡처" />
	<figcaption>OpenAI Codex AGENTS.md 문서 캡처, 확인일 2026-07-01. 저장소 지침을 작업 전 context로 읽는다는 근거이며, 해당 지침이 최신이거나 완전하다는 증거는 아니다.</figcaption>
</figure>

Codex skills 문서는 필요한 지침을 필요한 시점에 불러오는 progressive disclosure를 설명한다.

> [OpenAI Codex skills 문서](https://developers.openai.com/codex/skills): "Skills use progressive disclosure to manage context efficiently"

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-skills-progressive-disclosure.png" alt="OpenAI Codex skills 공식문서에서 progressive disclosure로 context를 효율적으로 관리한다고 설명한 영역 캡처" />
	<figcaption>OpenAI Codex skills 문서 캡처, 확인일 2026-07-01. 관련 지침을 단계적으로 불러올 수 있다는 근거이며, 어떤 문서가 현재 변경에 필요한지 증명하는 자료는 아니다.</figcaption>
</figure>

두 기능은 문서를 읽게 할 수 있다는 사실을 알려준다. 그러나 “모든 문서를 읽으면 더 정확하다”거나 “문서가 코드보다 항상 우선한다”는 결론은 주지 않는다. 읽을 범위와 충돌 해결은 현재 task의 근거로 정해야 한다.

## 세 접근은 속도와 위험을 다르게 교환한다

코드 수정 전 탐색은 크게 세 방식으로 나눌 수 있다.

| 접근 | 먼저 보는 것 | 유리한 조건 | 대표 실패 |
|---|---|---|---|
| code-first | 오류 지점, 주변 코드, 가장 가까운 test | 실패가 재현되고 수정 범위가 한 줄·한 함수로 고정됨 | repo 금지사항과 외부 계약을 놓침 |
| all-docs-first | 검색되는 설계·운영·회고 문서 전체 | 저장소 전반의 계약을 재구성하는 migration·감사 작업 | stale·무관 문서가 현재 근거와 같은 무게로 섞임 |
| scoped-doc-first | 불확실성별 primary source, 적용 규칙, 주변 pattern, 실행 증거 | 경계가 있는 기능 변경과 bugfix | 초기 scope를 너무 좁히면 숨은 의존 문서를 놓침 |

code-first는 무조건 나쁜 출발이 아니다. 현재 test가 정확히 실패하고 원인이 오탈자나 지역 조건문으로 좁혀졌다면 문서 탐색을 길게 할 이유가 적다. all-docs-first도 저장소 전체의 호환성 계약을 이관하거나 규정 항목을 빠짐없이 map할 때는 필요하다.

scoped-doc-first는 둘의 중간 분량을 뜻하지 않는다. **현재 남아 있는 질문에 답하는 자료만 읽고, 답이 안 나오거나 충돌이 생기면 범위를 확장하는 방식**이다.

## 합성 저장소 변경 요청으로 비교한다

가상의 CLI 저장소가 다음 자료를 가진다고 하자.

```text
sample-cli/
├── AGENTS.md
├── docs/output-format.md
├── docs/archive/export-v1.md
├── src/cli.mjs
├── src/serialize-records.mjs
└── test/cli-output.test.mjs
```

요청은 `--format json`을 추가하되 기존 text 출력은 바꾸지 않는 것이다. 현재 `AGENTS.md`는 새 dependency 금지와 stdout 호환성 유지를 요구한다. `docs/output-format.md`는 JSON 최상위 key를 `records`로 정의하고, archive 문서는 이전 초안의 `items`를 사용한다. 현재 serializer와 test fixture는 `records`를 쓴다.

이것은 실제 모델 실행 결과가 아니라 같은 고정 사실을 세 탐색 방식에 노출했을 때 어떤 판단 근거가 남는지 보는 합성 사례다.

### code-first

`src/cli.mjs`와 가까운 test만 보면 option을 어디에 추가할지는 빨리 찾을 수 있다. 하지만 저장소 규칙을 읽지 않으면 익숙한 parsing package를 새로 넣는 선택이 금지사항과 충돌할 수 있다. serializer까지 검색하지 않으면 새 JSON shape를 현재 관례와 다르게 직접 만들 수도 있다.

이 route가 확보한 근거는 수정 지점과 현재 test뿐이다. 라이브러리의 기능 경계, dependency 정책, output contract는 미해결로 남는다.

### all-docs-first

모든 문서를 같은 무게로 읽으면 현재 문서의 `records`와 archive의 `items`가 함께 들어온다. 많이 읽었다는 사실만으로 어느 쪽이 최신인지 정해지지 않는다. 다른 command의 배포 절차와 과거 migration 회고까지 읽어도 이번 option의 성공 조건은 더 선명해지지 않는다.

이 route는 넓은 후보를 찾는 장점이 있지만, 문서 상태와 적용 scope를 별도로 판정하지 않으면 오래된 초안이 현재 계약처럼 보이는 실패가 생긴다.

### scoped-doc-first

먼저 import된 CLI library의 primary documentation에서 option parsing과 값 전달 범위만 확인한다. 그다음 현재 경로에 적용되는 `AGENTS.md`에서 dependency와 호환성 경계를 읽는다. 식별자 검색으로 `format`, `records`, serializer 호출부를 찾고, 가까운 source와 test를 함께 읽는다.

이 route에서는 공식 기능 경계가 “현재 API로 option을 받을 수 있는가”를 닫고, 저장소 규칙이 “새 package를 넣어도 되는가”를 닫는다. 주변 pattern은 JSON shape를 새로 발명하지 않고 기존 serializer를 재사용하게 한다. 마지막으로 기존 text test와 새 focused JSON test가 실제 동작을 판정한다.

| 남은 질문 | code-first | all-docs-first | scoped-doc-first |
|---|---|---|---|
| option API를 추측하지 않았는가 | 확인 안 됨 | 관련 문서를 찾았지만 범위가 섞임 | imported API의 primary source로 확인 |
| 새 dependency가 허용되는가 | 놓칠 수 있음 | 규칙은 읽었으나 다른 절차도 함께 유입 | 적용 `AGENTS.md`로 금지 확인 |
| JSON key가 무엇인가 | 가까운 파일에 따라 우연히 결정 | `items`와 `records` 충돌 | 현재 문서·serializer·test의 `records`를 교차 확인 |
| 기존 text 출력이 유지되는가 | 가까운 test로 일부 확인 | 실행 전에는 알 수 없음 | baseline과 변경 후 focused test로 확인 |

이 표는 품질 점수나 속도 측정이 아니다. 각 route가 어떤 질문을 닫고 무엇을 미해결로 남기는지를 보여준다.

## uncertainty는 순서대로 줄인다

scoped-doc-first의 작동 원리는 정보량보다 질문 순서에 있다.

```text
공식 기능 경계
  → API·설정에서 가능한 것과 불가능한 것을 구분
저장소 규칙
  → 허용 dependency, 수정 범위, 호환성, 검증 명령을 고정
주변 pattern
  → 현재 naming, data shape, error 처리, sibling 관례를 확인
실행 증거
  → 문서와 해석이 실제 baseline·focused test에서 성립하는지 판정
```

앞 단계가 뒤 단계를 대신하지 않는다. 공식 문서는 저장소가 선택한 JSON shape를 정하지 않는다. 저장소 규칙은 함수의 현재 호출 방식을 보여주지 않는다. 주변 코드가 그럴듯해도 실행하지 않으면 기존 text 출력이 보존됐는지 알 수 없다.

반대로 각 단계에서 질문이 닫히면 무관한 문서를 더 읽지 않는다. 새로운 identifier가 나오거나, 적용 규칙을 찾지 못하거나, source와 문서가 충돌하거나, test가 예상과 다르게 실패할 때만 탐색 범위를 넓힌다. 이것이 “어디까지”의 중단 기준이다.

## 문서와 코드가 충돌할 때는 승자를 미리 정하지 않는다

archive 문서의 `items`와 현재 source의 `records`가 다르다고 해서 “코드가 항상 진실”이라고 결론내리면 안 된다. source와 test가 함께 오래된 구현일 수도 있고, 외부 specification이 이미 바뀌었을 수도 있다.

먼저 문서의 상태와 적용 scope를 확인한다. 다음으로 현재 source와 version history에서 실제 변경 근거를 찾는다. 그다음 baseline을 실행해 지금 배포되는 동작을 확인한다. 외부 계약이 있다면 최신 primary source나 공개 fixture와 비교한다. 그래도 충돌이 남으면 임의로 한쪽을 밀어붙이지 않고 작업을 보류하거나 사람에게 계약 선택을 요청한다.

즉, 실행 결과는 현재 동작의 증거이지 바람직한 요구사항의 자동 증거는 아니다. 문서는 의도의 후보이지 최신 사실의 자동 증거가 아니다. 충돌 자체가 더 많은 근거가 필요하다는 신호다.

## 이 route가 실패하는 조건과 경계

초기 질문을 잘못 좁히면 scoped-doc-first도 중요한 문서를 놓친다. 한 CLI flag처럼 보여도 생성 파일, API consumer, 배포 script까지 이어진다면 식별자 검색 결과에 따라 scope를 확장해야 한다. 적용 규칙의 진입 링크가 깨졌거나 문서 이름이 검색어와 다르면 “관련 문서 없음”을 사실로 착각할 수도 있다.

all-docs-first가 더 맞는 반례도 있다. 저장소 전체의 인증 흐름을 바꾸거나 여러 버전의 contract를 통합하는 일은 처음부터 넓은 문서 inventory와 상태 분류가 필요하다. code-first가 더 맞는 반례는 이미 정확한 failing test가 있는 지역 회귀다. 이때도 적용 규칙과 금지 범위만큼은 짧게 확인한다.

[지시문을 세 계층으로 나누는 글](/blog/blog/ai-agent-instruction-diet/)은 규칙 내용을 상시 파일, 필요 시 절차, 자동 gate 중 어디에 둘지 다룬다. 이 글은 그 자료들이 이미 존재한다고 가정하고, **현재 변경에서 어떤 근거를 어떤 순서로 읽을지**를 다룬다.

## 결론과 한계

코드 수정 전 문서를 읽는 목적은 문서 권위를 높이는 것이 아니라 추측해야 할 질문을 줄이는 것이다. 공식 기능 경계, 적용되는 저장소 규칙, 주변 구현 pattern, 실행 증거 순으로 확인하고, 질문이 닫히면 멈춘다. 충돌이 생기면 문서나 코드를 자동 승자로 삼지 않고 근거 범위를 넓힌다.

이 글의 CLI 저장소와 세 route는 합성 비교다. 실제 모델을 반복 실행해 수정 시간, token, 오류율을 측정하지 않았다. 저장소마다 문서 상태와 test 신뢰도가 다르며, 비공개 dependency나 실행 불가능한 환경에서는 마지막 증거가 약해질 수 있다. 그런 경우에는 미확인 질문을 숨기지 않는 것이 route의 마지막 단계다.

## 확인 기준

- OpenAI Codex 문서: [Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [Agent Skills](https://developers.openai.com/codex/skills)
- 공식 문서와 기존 캡처 확인일: 2026-07-01
- 합성 저장소 비교는 evidence routing의 차이를 설명하며, 실제 모델 성능·속도 benchmark가 아니다.
