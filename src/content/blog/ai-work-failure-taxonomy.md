---
title: "AI 작업의 build 실패를 원인과 첫 복구 행동으로 분류하는 법"
description: "같은 build 실패가 버그, 누락, 오해, 검증 실패에서 시작되는 네 합성 사례를 primary cause와 첫 복구 행동으로 구분합니다."
pubDate: 2026-07-06T16:35:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/diagrams/ai-failure-taxonomy.svg"
---

build가 실패하면 화면에 보이는 결과는 비슷하다. 명령은 0이 아닌 exit code로 끝나고 생성물은 나오지 않는다. 하지만 같은 명령을 다시 실행하거나 주변 코드를 더 고치는 것이 언제나 첫 행동은 아니다.

이 글의 질문은 **보이는 증상과 root cause가 겹칠 때 무엇부터 복구해야 하는가**다. 같은 `build 실패`라는 표면 증상을 버그, 누락, 오해, 검증 실패에서 시작된 네 합성 사례로 나누고, 잘못 분류한 재시도가 왜 실패하는지까지 따라간다.

<figure>
	<img src="/blog/blog-images/ai-failure-taxonomy.svg" alt="같은 build 실패를 primary cause, secondary effect, first action, recurrence guard로 나누는 개념도" />
	<figcaption>이 그림은 실제 장애 기록이 아니라, 실패 증상보다 첫 복구 행동을 정하기 위한 분류 흐름을 보여주는 개념도다.</figcaption>
</figure>

## 네 범주는 서로 배타적인 상자가 아니다

한 작업에는 오해와 버그와 검증 실패가 동시에 있을 수 있다. 예를 들어 요청을 잘못 이해해 범위 밖 코드를 바꾸고, 그 코드가 build를 깨뜨리고, 실패 뒤 같은 명령을 다시 실행하지 않은 채 완료를 보고할 수 있다.

이때 하나의 이름만 남기려고 하면 중요한 연결을 잃는다. 대신 다음 네 칸으로 정리한다.

- **primary cause:** 첫 복구 행동을 결정하는 가장 앞선 원인
- **secondary effect:** primary cause에서 파생됐거나 함께 드러난 문제
- **first action:** 더 큰 수정 전에 가장 먼저 해야 할 복구 행동
- **recurrence guard:** 같은 원인이 다시 최종 결과까지 도달하지 못하게 할 조건

primary는 “가장 심각해 보이는 오류”와 같지 않다. 그 원인을 바로잡지 않으면 뒤의 수정이 다시 잘못된 방향으로 흐르는 지점을 고른다.

## 공통 증상: 네 사례 모두 build가 실패했다

네 사례의 표면 보고는 같다.

```text
$ npm run build
Build failed
exit code: 1
```

하지만 오류가 생기기 전 작업과 실제 메시지를 함께 보면 복구 순서가 달라진다.

| 사례 | primary cause | secondary effect | first action | recurrence guard |
|---|---|---|---|---|
| A | 버그 | 유효한 합성 입력에서 예외, build 중단 | 같은 입력으로 재현하고 깨진 변환 함수를 복구 | 유효 입력 regression test |
| B | 누락 | 선언된 합성 asset을 찾지 못해 build 중단 | 요구사항을 대조해 asset을 추가하거나 참조를 제거 | 필수 asset inventory 검사 |
| C | 오해 | 범위 밖 구조 변경, import 오류, build 중단 | 원래 요청과 제외 범위를 복원하고 범위 밖 diff를 되돌림 | 시작 전 작업 계약과 diff scope gate |
| D | 검증 실패 | validation harness가 합성 fixture를 누락해 같은 build 중단 | 같은 commit·명령을 clean fixture와 비교하고 harness 입력을 복구 | fixture manifest preflight와 clean-fixture parity check |

## 사례 A — 버그: 존재하는 입력을 코드가 깨뜨린다

합성 게시물은 build 전에도 존재했고 필수 field를 모두 갖췄다. 제목 정규화 함수를 바꾼 뒤 다음 오류가 생겼다.

```text
TypeError: normalizeTitle is not a function
Build failed
```

같은 합성 입력으로 변경 전 버전은 성공하고 변경 후 버전은 실패한다. 필수 파일이 빠진 것도 아니고 요청 범위도 맞다. 이 사례의 primary cause는 **버그**다. build 중단과 생성 page 부재는 secondary effect다.

first action은 입력을 더 만들거나 설정을 바꾸는 일이 아니다. 동일한 최소 입력으로 예외를 재현하고, 함수 참조가 깨진 변경을 좁혀 복구한 뒤 같은 build를 다시 실행한다. recurrence guard는 그 유효 입력이 정규화 함수를 통과하는 regression test다.

이 실패를 누락으로 잘못 분류해 asset이나 field를 더 추가하면 예외는 그대로다. 입력을 늘릴수록 원인과 무관한 diff만 커진다.

## 사례 B — 누락: 코드가 아니라 필요한 조각이 없다

두 번째 합성 게시물은 frontmatter에서 `[SYNTHETIC_ASSET_REFERENCE]`를 선언했지만 대응하는 합성 asset을 추가하지 않았다. build는 다음 메시지로 중단됐다.

```text
Referenced asset is missing: [SYNTHETIC_ASSET_REFERENCE]
Build failed
```

여기서 bundler는 선언된 참조를 정상적으로 검사했다. primary cause는 **누락**이고, asset resolution 오류와 build 중단은 secondary effect다.

first action은 요구사항을 다시 확인하는 것이다. 대표 이미지가 필수라면 대응 asset을 추가하고, 잘못 생긴 참조라면 참조를 제거한다. 그 다음 같은 build와 asset inventory 검사를 실행한다. recurrence guard는 “필수 참조가 있으면 대응 asset도 존재해야 한다”는 자동 검사다.

이 실패를 버그로 오해해 bundler나 parser를 수정하면 검사를 약화할 뿐 누락된 산출물은 생기지 않는다. build를 초록색으로 만들더라도 요구사항은 여전히 빠져 있다.

## 사례 C — 오해: 잘못된 목표를 구현하다 build도 깨진다

세 번째 요청은 “도움말 문구 한 문장만 수정한다”였다. 그러나 AI는 문구가 들어 있는 component 구조까지 정리했고, import 방식을 바꾸는 과정에서 다음 오류를 만들었다.

```text
Module has no exported member 'SyntheticHelpPanel'
Build failed
```

import 오류만 보면 버그다. 하지만 그 코드는 애초에 요청하지 않은 구조 변경에서 생겼다. primary cause는 **오해**, import 버그와 build 중단은 secondary effect다.

first action은 오류 줄을 곧바로 고치는 것이 아니다. 원래 목표와 제외 범위를 다시 맞추고, 범위 밖 구조 변경을 되돌린 뒤 요청한 한 문장만 남긴다. 그 상태에서 build를 재실행한다. recurrence guard는 시작 전에 목표·허용 파일·제외 범위를 짧게 고정하고, 완료 전 diff가 그 범위 안인지 확인하는 gate다.

이 사례를 버그로만 분류해 export를 추가하면 build는 통과할 수 있다. 그러나 요청하지 않은 구조 변경은 그대로 남는다. 기술적으로 초록색인 결과가 작업 계약에는 실패한 상태가 된다.

## 사례 D — 검증 실패: source가 아니라 validation harness가 깨졌다

네 번째 합성 사례도 다른 세 사례와 같은 `npm run build`가 실패한다. 차이는 product source가 아니라 build 전에 isolated validation workspace를 준비하는 harness에 있다. harness의 copy 단계가 build-time check에 필요한 `SYNTHETIC_VALIDATION_FIXTURE`를 누락했다.

```text
$ npm run build
Validation fixture not found: SYNTHETIC_VALIDATION_FIXTURE
Build failed
exit code: 1
```

이 로그만 보면 source가 fixture를 빠뜨린 사례 B와 비슷하다. 그래서 같은 commit과 같은 `npm run build`를 선언된 clean fixture에서 비교한다. clean fixture는 product source와 필수 validation input을 모두 포함한다.

```text
validation fixture manifest: complete
$ npm run build
Build completed
exit code: 0
```

의심 harness workspace에서는 실패하고 clean fixture에서는 같은 commit·명령이 성공한다. product source의 필수 asset이 빠진 사례 B와 달리, 이 사례에서는 validation workspace를 만드는 과정만 합성 입력을 잃었다. primary cause는 **검증 실패**이고, false source regression 보고와 불필요한 product 수정 가능성이 secondary effect다.

first action은 source를 고치는 것이 아니다. 같은 commit·명령의 두 workspace에서 fixture manifest와 준비 결과를 비교하고, 누락된 harness input을 복구한 뒤 의심 workspace에서 `npm run build`를 다시 실행한다. recurrence guard는 build 전에 필수 validation fixture manifest를 검사하는 preflight와, harness workspace가 선언된 clean fixture와 같은 입력 계약을 갖는지 보는 parity check다.

이 사례를 버그로 분류해 product source에서 fixture-dependent check를 제거하면 깨진 harness에 맞춰 검증을 약화한다. build를 통과시킬 수는 있어도 validation input 누락을 숨기고, 이후 실제 source 누락을 잡을 능력까지 잃는다.

## primary와 secondary를 바꾸면 재시도가 빗나간다

네 사례의 차이는 “어떤 이름이 더 정확한가”보다 첫 재시도의 방향에서 선명해진다.

- 버그를 누락으로 보면 존재하는 입력을 계속 보충한다.
- 누락을 버그로 보면 올바르게 실패한 검사를 약화한다.
- 오해를 버그로 보면 요청 밖 구현을 더 완성한다.
- 검증 실패를 버그로 보면 정상 source를 깨진 harness 입력에 맞춘다.

분류가 애매하면 두 가설을 나란히 두고 가장 작은 구분 실험을 한다. 변경 전후 같은 입력 비교는 버그 가설을, 요구사항과 product file inventory 대조는 누락 가설을, 요청과 diff 비교는 오해 가설을, 같은 commit·명령의 clean fixture와 harness workspace 비교는 검증 실패 가설을 구분한다.

하나의 사례가 여러 범주에 걸칠 때는 인과 순서를 적는다.

```text
오해(primary)
→ 범위 밖 import 변경(secondary bug)
→ build 실패(visible symptom)
→ 재검증 미실행(추가 verification failure)
```

이렇게 쓰면 버그를 무시하지 않으면서도, 먼저 작업 계약을 복원해야 같은 실패가 반복되지 않는 이유를 설명할 수 있다.

## incident-response가 먼저인 경계

이 분류는 일반적인 작업 복구를 위한 도구다. build 로그에서 비밀 노출 정황이 보이거나, 데이터 손상이나 운영 장애가 함께 진행 중이라면 네 범주를 고르는 일이 첫 행동이 아니다.

그때는 영향 확대를 막는 **containment**, 추가 변경 중단, 증거 보존, 정해진 incident-response 절차와 책임자 호출이 먼저다. 필요한 접근 차단이나 복구도 승인된 절차에 따라 수행한다. 상황이 안정된 뒤에야 버그·누락·오해·검증 실패의 인과관계를 사후 분석한다.

build를 빨리 초록색으로 만들겠다고 로그를 지우거나 관련 파일을 덮어쓰면 증거와 복구 가능성을 잃을 수 있다. 보안 사고·데이터 손상·운영 장애에서는 정상 build보다 피해 제한과 복구 안전성이 우선이다.

## 결론: 증상이 아니라 첫 복구 행동을 분류한다

같은 build 실패도 버그라면 재현부터, 누락이라면 요구사항과 product inventory 대조부터, 오해라면 작업 계약 복원부터, 검증 실패라면 같은 commit·명령의 clean fixture와 harness 입력 비교부터 시작한다. 네 범주는 겹칠 수 있으므로 primary cause와 secondary effect를 인과 순서로 함께 적는다.

좋은 분류는 오류에 이름을 붙이는 데서 끝나지 않는다. first action을 바꾸고, 잘못된 재시도를 막으며, recurrence guard로 같은 원인이 다시 최종 실패까지 도달하지 않게 한다. 단, incident가 진행 중이면 분류보다 containment와 정해진 대응 절차가 먼저다.

진단이 first action을 가리켜도 수정이나 배포 권한까지 주는 것은 아니다. 실제로 행동해도 되는 범위는 [AI 사실확인 요청의 경계는 단어가 아니라 권한으로 정한다](/blog/blog/ai-factcheck-trigger-boundary/)에서 확인한다. 원인 판단과 행동 권한이 모두 맞아야 복구를 시작할 수 있다.

## 확인 범위와 한계

- 네 사례와 오류 문구는 분류 메커니즘을 설명하기 위해 만든 합성 자료이며 실제 사건 기록이 아니다.
- 실제 build 실패는 dependency, 실행 환경, network, 권한처럼 여기서 다루지 않은 원인에서도 생길 수 있다.
- clean fixture 비교가 근거가 되려면 기준 fixture의 manifest와 재현 조건이 미리 선언돼 있어야 한다. 임의로 고른 다른 workspace의 성공은 source 정상의 증거가 아니다.
- primary cause 선택에는 판단이 들어간다. 새로운 증거가 나오면 인과 순서와 first action을 바꿔야 한다.
- incident 대응의 구체적인 차단·복구 행동은 시스템과 책임 체계마다 다르므로 이 글의 일반 분류만으로 결정하지 않는다.
