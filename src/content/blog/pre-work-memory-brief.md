---
title: "작업 전에 기억을 꺼내는 방법: Pre-work Memory Brief"
description: "같은 memory pool에서도 단순 상태 확인과 public 발행 작업에 서로 다른 기준만 회수해 짧은 작업 계약으로 바꾸는 방법을 설명합니다."
pubDate: 2026-07-01T10:30:00+09:00
updatedDate: 2026-07-21T18:00:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/pre-work-memory-brief.png"
---

memory pool에 좋은 기준이 많이 있어도 현재 작업에 전부 필요하지는 않다. “현재 파일이 있는지 확인해 달라”는 요청과 “public 글을 발행해 달라”는 요청은 같은 사용자의 기준을 참고하지만, 권한·위험·완료 증거가 다르다.

Pre-work Memory Brief의 역할은 저장된 기억을 요약하는 것이 아니다. **현재 요청과 관련된 기준만 회수하고, 충돌을 해소한 뒤, 이번 작업의 실행 계약으로 바꾸는 것**이다.

아래 memory pool과 두 작업은 공개 설명용 합성 사례다. 특정 제품 기능이나 실제 개인 기록을 옮긴 것이 아니다.

<figure>
	<img src="/blog/blog-images/pre-work-memory-brief.svg" alt="기억 회수, 작업 brief, 현재 근거 검증, 실행 흐름을 나눈 개념도" />
	<figcaption>이 그림은 실제 memory 저장 구조가 아니라 Pre-work Memory Brief 흐름을 설명하기 위한 개념도다.</figcaption>
</figure>

## brief는 memory dump가 아니다

좋은 brief는 현재 task가 답해야 할 다섯 질문만 남긴다.

```text
goal: 무엇을 끝내는가
allowed: 어디까지 행동할 수 있는가
prohibited: 무엇은 하지 않는가
proof: 어떤 현재 증거가 있어야 완료인가
unknowns: 무엇이 확인되지 않으면 멈추는가
```

이 필드는 저장된 기억을 그대로 복사하지 않는다. “사용자는 근거를 선호한다”는 넓은 문장을 “현재 상태는 방금 읽은 파일과 명령 출력으로 증명한다” 같은 task contract로 번역한다.

## 공식 memory 기능과 개인 brief의 범위를 구분한다

2026-07-01에 캡처한 OpenAI Codex memories 문서는 이전 작업의 context를 이어주는 기능을 다음처럼 설명했다.

> [2026-07-01 당시 OpenAI Codex memories 문서](https://developers.openai.com/codex/memories): "Memories let Codex carry useful context"

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-memories-context.png" alt="2026년 7월 1일 OpenAI Codex memories 문서에서 Codex가 유용한 context를 다음 작업으로 가져올 수 있다고 설명한 영역 캡처" />
	<figcaption>2026-07-01에 만든 역사적 캡처다. 2026-07-21에는 링크가 새 memories 문서로 이동하고 문구와 적용 대상이 달라졌다. 이 캡처는 현재 제품의 Pre-work Memory Brief 기능을 증명하지 않는다.</figcaption>
</figure>

Claude Code memory 문서는 `CLAUDE.md`와 auto memory가 대화 시작 시 문맥으로 로드된다고 설명한다.

> [Claude Code memory 문서](https://code.claude.com/docs/en/memory): "Both are loaded at the start of every conversation."

<figure>
	<img src="/blog/blog-images/official-docs/claude-memory-context-not-enforced.png" alt="Claude Code memory 공식문서에서 CLAUDE.md와 auto memory가 conversation 시작 시 로드된다고 설명한 영역 캡처" />
	<figcaption>Claude Code memory 문서 캡처, 확인일 2026-07-01. 작업 시작 시 memory 계층이 문맥으로 들어온다는 근거이며, 이 글의 Pre-work Memory Brief가 공식 제품 기능이라는 뜻은 아니다.</figcaption>
</figure>

Pre-work Memory Brief는 이 기능 설명 위에 둔 개인 운영 방식이다. 어떤 context를 현재 작업에 넣을지 선택하고 계약으로 번역하는 과정은 별도로 설계해야 한다.

## 하나의 합성 memory pool

두 사례는 다음 여섯 기준을 공유한다.

| id | 저장된 기준 | 적용 단서 |
|---|---|---|
| `P1` | 단순 상태 질문은 결과를 먼저 보여준다 | `status_check` |
| `V1` | 변동 가능한 상태는 현재 source를 다시 읽는다 | 상태·존재 여부 주장 |
| `V2` | public 발행 전 build와 생성 결과를 확인한다 | `public_release` |
| `R1` | 명시되지 않은 외부 공개는 하지 않는다 | 외부 write |
| `R2` | 검증한 것과 미검증을 분리한다 | 완료 보고 |
| `S1` | public artifact 전체에서 식별 가능한 정보를 점검한다 | 공개 본문·asset·generated output |

이 pool에서 항목을 많이 고르는 것이 목표가 아니다. 현재 요청을 task signature로 바꾼 뒤, goal·권한·위험·proof에 실제로 영향을 주는 기준만 선택한다.

## 사례 A: 단순 상태 확인 brief

합성 요청은 “현재 초안 파일이 있는지만 확인해 줘. 수정하지 마.”다.

여기에는 `P1`, `V1`, `R2`가 필요하다. public 발행용 `V2`와 `S1`은 관련이 없고, 외부 write 자체가 허용되지 않으므로 `R1`은 이미 현재 요청의 금지사항에 흡수된다.

```yaml
goal: 현재 초안 파일의 존재 여부를 보고한다
allowed:
  - read_only_search
prohibited:
  - file_edit
  - publish
proof:
  - current_file_search_output
report:
  - result_first
  - separate_unverified_items
stop_if:
  - search_scope_is_ambiguous
```

이 brief에는 build도, 배포 상태도, 이미지 metadata도 없다. 파일 존재만 묻는 요청에서 그 검증을 넣으면 안전성이 높아지는 것이 아니라 task 범위를 왜곡한다.

## 사례 B: public 발행 brief

두 번째 합성 요청은 “완성된 글을 public 사이트에 발행하고 결과를 확인해 줘.”다.

이번에는 `V2`, `R1`, `R2`, `S1`이 선택된다. `P1`은 응답 형식을 정하는 약한 default일 뿐이고, 발행 작업의 proof보다 우선하지 않는다. `V1`은 `V2`의 build·generated output 확인에 구체화된다.

```yaml
goal: 허용된 글을 public 사이트에 발행하고 결과를 확인한다
allowed:
  - edit_scoped_article
  - run_build
  - publish_after_release_gate
prohibited:
  - expose_identifying_context
  - modify_unrelated_content
proof:
  - source_diff_reviewed
  - public_safety_scan_passed
  - build_exit_zero
  - generated_page_contains_expected_links
  - live_page_verified
report:
  - separate_local_and_live_proof
stop_if:
  - release_target_or_authority_is_unclear
  - identifying_context_cannot_be_removed
```

같은 pool에서 만들었지만 첫 brief와 겹치는 줄은 많지 않다. 첫 사례의 핵심은 read-only 범위와 현재 파일 증거이고, 두 번째의 핵심은 공개 권한, 안전 gate, build와 live proof다.

## 회수에서 계약까지 네 단계를 거친다

### 1. 현재 요청을 task signature로 만든다

명사만 뽑지 않는다. 요청이 요구한 행동, 명시적 금지, 외부 영향, 완료 증거를 함께 본다.

```text
status_check = read_only + current_state + no_edit
public_release = scoped_edit + external_write + safety_gate + live_proof
```

### 2. 관련성과 권한으로 먼저 줄인다

task kind가 맞지 않는 기억은 제외한다. 맞더라도 현재 요청이 더 좁은 범위를 명시하면 그 범위로 줄인다. “보통 발행한다”는 과거 default가 있어도 현재 요청이 “초안만”이라고 하면 release 관련 항목은 선택하지 않는다.

### 3. 충돌하는 기억을 현재 source와 대조한다

두 기억이 다르거나 한 항목이 stale할 수 있으면 더 많은 기억을 넣어 평균내지 않는다. 현재 요청의 명시 범위를 확인하고, 실제 파일이나 현재 규칙을 읽고, 필요한 검증을 새로 실행한다. 자세한 precedence는 [stale context 점검](/blog/blog/stale-ai-context-check/)에서 다룬다.

### 4. 서술을 검증 가능한 계약으로 바꾼다

“안전하게 한다”처럼 판정할 수 없는 문장은 brief에 남기지 않는다. `public_safety_scan_passed`, `build_exit_zero`처럼 실행 뒤 확인할 수 있는 proof로 바꾼다. 어떤 기준을 찾았는지가 아니라, 작업이 어떤 행동과 증거로 달라졌는지가 중요하다.

## 모든 기억을 넣은 긴 brief가 실패하는 이유

같은 pool을 그대로 붙이면 다음처럼 된다.

```text
결과를 먼저 말한다.
현재 source를 읽는다.
build를 실행한다.
외부 공개를 조심한다.
검증과 미검증을 나눈다.
public artifact를 검사한다.
```

문장 하나하나는 나쁘지 않다. 그러나 단순 상태 확인에서 build와 public artifact 검사가 왜 필요한지 알 수 없고, “수정하지 마”라는 현재 요청은 목록 속 한 신호로 약해진다. 길이가 문제라기보다 **관련 없는 지속 기준이 현재 명시 신호와 같은 레벨에 놓인 것**이 문제다.

brief에는 글자 수 상한보다 선택 근거가 필요하다. 각 줄에 대해 “이 줄을 빼면 이번 task의 행동·위험·완료 증거 중 무엇이 달라지는가?”에 답하지 못하면 제외한다.

## memory pool의 분류와 retrieval은 다른 문제다

선호, 검증 기준, 위험 기준, 작업 맥락, 응답 전략을 어떤 schema로 보관할지는 [사용자 의도 라이브러리](/blog/blog/secondbrain-user-intent-library/)에서 다룬다. 이 글은 그 pool이 이미 있다는 가정 아래, 현재 task에 필요한 항목을 꺼내 계약으로 번역하는 데 집중한다.

따라서 저장 여부나 후보 승격 기준을 brief 생성 때 다시 평가하지 않는다. 다만 현재 요청과 실제 source에 맞지 않는 기억은 아무리 잘 승격됐어도 이번 brief에서 제외한다.

## 결론

Pre-work Memory Brief는 기억 요약이 아니라 task-specific projection이다. 현재 요청을 goal·권한·금지·proof로 분해하고, 관련된 memory만 골라, 충돌을 현재 source로 해소한 뒤 검증 가능한 계약으로 바꾼다.

같은 pool에서도 단순 상태 확인에는 read-only와 current file proof가 남고, public 발행에는 공개 안전 gate, build, generated output, live proof가 남는다. 이 차이를 만들지 못한 긴 brief는 memory가 많다는 사실만 보여줄 뿐, 현재 작업의 신호는 오히려 흐린다.

## 확인 범위와 한계

- memory pool과 두 brief는 공개 설명용 합성 사례다.
- 이 글은 retrieval 정확도나 작업 품질 향상을 측정하지 않았다.
- OpenAI Codex memories 캡처는 2026-07-01 당시 화면이며, 2026-07-21 redirect 이후 현재 문구의 완전한 증거가 아니다.
- 실제 외부 발행에서는 플랫폼별 권한, rollback, 배포 검증 계약을 별도로 확인해야 한다.
