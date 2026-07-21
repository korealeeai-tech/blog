---
title: "AI 코딩 에이전트의 운영 규칙은 어디에 어떻게 둬야 할까"
description: "AGENTS.md를 길게 쓰는 대신 global·repo·하위 경로 규칙과 기계적 검증을 나누고, 충돌과 누락을 실제로 확인하는 방법을 설명합니다."
pubDate: 2026-06-23T17:05:00+09:00
updatedDate: 2026-07-21T16:42:37+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/agents-rules-layered-illustration.png"
---

AI 코딩 에이전트에게 운영 규칙을 주는 일은 어렵지 않다. 파일 하나를 만들고 “추측하지 말 것”, “테스트할 것”, “관련 없는 파일은 고치지 말 것”이라고 적으면 된다.

어려운 부분은 그다음이다. 규칙이 실제 작업 전에 읽혔는지, 어느 경로에서 어떤 규칙이 우선하는지, 문장으로 적은 기준이 검증 가능한 행동으로 이어지는지 확인해야 한다. 이 세 가지가 빠지면 규칙 파일은 길어져도 작업 방식은 안정되지 않는다.

이 글은 `AGENTS.md`에 무엇을 많이 적을지보다, 규칙을 **scope와 강제 방식에 맞게 어디에 둘지**를 다룬다. 특정 저장소의 실제 설정은 사용하지 않고 공개 가능한 예제로만 설명한다.

## 먼저 확인할 공식 동작

OpenAI Codex 문서는 작업 전에 `AGENTS.md`를 읽고, global guidance와 project-specific override를 계층으로 적용한다고 설명한다.

> [OpenAI Codex AGENTS.md 문서](https://developers.openai.com/codex/guides/agents-md): "Codex reads AGENTS.md files before doing any work."

<figure>
	<img src="/blog/blog-images/official-docs/openai-codex-agents-md-reads.png" alt="OpenAI Codex AGENTS.md 공식문서에서 작업 전에 AGENTS.md를 읽고 global guidance와 project-specific override를 계층화한다고 설명한 영역" />
	<figcaption>OpenAI Codex AGENTS.md 문서 캡처, 확인일 2026-07-21. 규칙 파일이 자동으로 context에 들어간다는 근거이며, 적힌 규칙이 모호해도 항상 의도대로 실행된다는 증거는 아니다.</figcaption>
</figure>

여기서 확인되는 사실은 “지속 규칙을 넣을 공식 표면이 있다”는 점이다. 반면 어떤 규칙이 좋은지, 긴 파일이 더 잘 지켜지는지, 테스트가 충분한지는 공식 문장 하나로 결론낼 수 없다. 그 판단은 실제 저장소의 구조와 실패 비용에 맞춰야 한다.

## 규칙을 세 층으로 나누는 이유

운영 기준은 모두 같은 수명을 갖지 않는다. 다음 세 층을 한 파일에 섞으면, 자주 쓰는 짧은 규칙과 드물게 쓰는 긴 절차가 서로를 가린다.

| 층 | 맡길 내용 | 예시 | 바뀌는 빈도 |
|---|---|---|---|
| durable guidance | 거의 모든 작업에 적용되는 경계 | 응답 언어, 추측 금지, dirty worktree 보존 | 낮음 |
| task protocol | 특정 작업에서만 필요한 절차 | 배포 순서, 이미지 검토, 장애 대응 | 중간 |
| mechanical gate | 사람이 해석하지 않아도 판정할 조건 | test, schema, lint, secret scan | 코드와 함께 |

`AGENTS.md`에는 첫 번째 층과 두 번째 층의 진입점만 둔다. 세부 절차는 별도 문서로 보내고, 명확히 실패시킬 수 있는 것은 명령이나 schema로 옮긴다.

이 구분은 파일을 예쁘게 나누기 위한 것이 아니다. 규칙의 실패 모드가 다르기 때문이다.

- durable guidance가 누락되면 작업 전체의 기본 행동이 흔들린다.
- task protocol이 누락되면 특정 workflow의 순서와 승인 경계가 깨진다.
- mechanical gate가 문장으로만 남으면 “검증했다”는 설명과 실제 결과가 달라질 수 있다.

## scope는 디렉터리 구조와 함께 읽는다

가상의 저장소가 다음처럼 생겼다고 하자.

```text
~/.codex/AGENTS.md
sample-app/AGENTS.md
sample-app/web/AGENTS.md
sample-app/api/
```

global 파일은 개인 기본값, repo 파일은 프로젝트 공통 규칙, `web/AGENTS.md`는 웹 하위 경로의 구체적인 규칙을 맡는다. `web` 아래에서 작업할 때 가까운 규칙이 공통 규칙을 구체화하거나 override할 수 있다.

따라서 규칙을 추가할 때는 문장만 보지 말고 적용 경로를 같이 물어야 한다.

1. 모든 저장소에 필요한가, 이 저장소에만 필요한가.
2. 저장소 전체에 필요한가, 특정 하위 경로에만 필요한가.
3. 상위 규칙을 보완하는가, 실제로 뒤집는가.
4. 같은 개념을 다른 말로 중복해 충돌시키지는 않는가.

가까운 파일이 더 구체적이라는 사실은 편리하지만 위험도 만든다. 예를 들어 상위에서 “외부 write 전 승인”을 요구했는데 하위 파일에 “작업 완료 후 자동 push”만 적으면, 승인 경계를 의도치 않게 약화한 것처럼 읽힐 수 있다. override가 필요한 경우에는 무엇을 대체하고 무엇은 그대로 유지하는지 명시해야 한다.

## 실패 사례 1: 좋은 말이지만 판정할 수 없는 규칙

다음 문장은 방향은 맞지만 완료 여부를 판정하기 어렵다.

```text
공개 저장소에 안전하게 작성한다.
충분히 검증한 뒤 완료한다.
```

`안전하게`, `충분히`가 무엇인지 사람마다 다르게 읽힌다. 이 문장을 행동과 증거로 바꾸면 달라진다.

```text
commit 전 staged filename과 text diff를 확인한다.
이미지는 원본 크기로 열어 계정, 경로, 탭, metadata를 확인한다.
build 결과와 generated output도 같은 민감 패턴으로 검색한다.
검증 명령, exit code, 확인하지 못한 항목을 완료 보고에 분리한다.
```

두 번째 버전도 모든 위험을 막지는 못한다. 하지만 누가 무엇을 했는지 재검토할 수 있다. 운영 규칙의 품질은 문장의 엄격함보다 **실행 증거를 남길 수 있는가**로 판단하는 편이 낫다.

## 실패 사례 2: 한 파일에 모든 절차를 넣기

하나의 큰 `AGENTS.md`는 검색하기 쉽고 진입점도 하나라는 장점이 있다. 대신 모든 작업에서 관계없는 절차까지 context에 들어오고, 비슷한 문장이 여러 군데 생기기 쉽다.

선택지는 세 가지다.

| 방식 | 유리한 조건 | 실패하기 쉬운 지점 |
|---|---|---|
| 한 파일에 전부 작성 | 작은 저장소, 규칙 수가 적음 | 길어질수록 충돌·stale 문장 발견이 어려움 |
| 경로별 `AGENTS.md` 계층 | 하위 영역의 기술·검증 방식이 다름 | override 경계가 모호하면 상위 안전 규칙을 약화 |
| 짧은 `AGENTS.md` + protocol + gate | workflow가 많고 기계 검증 가능 | 진입 링크가 깨지거나 protocol 선독이 누락될 수 있음 |

나는 세 번째 방식을 기본으로 두되, 하위 경로의 규칙이 실제로 다를 때만 두 번째를 함께 쓴다. 중요한 것은 파일 수가 아니라 진입점이 끊기지 않는지와 충돌을 확인할 방법이 있는지다.

## 규칙 변경은 readback까지 해야 끝난다

규칙을 추가한 직후에는 다음 순서로 확인할 수 있다.

```bash
# 1. global 파일과 repo root부터 현재 경로까지 실제 적용 후보를 찾는다.
repo_root=$(git rev-parse --show-toplevel)
repo_root=$(cd "$repo_root" && pwd -P)
current=$(pwd -P)
test -f "$HOME/.codex/AGENTS.md" && printf '%s\n' "$HOME/.codex/AGENTS.md"
while :; do
  test -f "$current/AGENTS.md" && printf '%s\n' "$current/AGENTS.md"
  test "$current" = "$repo_root" && break
  parent=$(dirname "$current")
  test "$parent" = "$current" && { echo "current path is outside repo" >&2; exit 1; }
  current=$parent
done

# 2. repo 규칙의 진입점과 참조 문서가 실제로 존재하는지 찾는다.
rg -n "검증|완료|금지|protocol" "$repo_root/AGENTS.md" "$repo_root/docs"

# 3. untracked를 포함한 범위와 HEAD 대비 최종 변경을 함께 검토한다.
git status --short -- AGENTS.md docs
git diff HEAD -- AGENTS.md docs

# 4. staged와 unstaged가 합쳐진 최종 patch의 whitespace를 확인한다.
git diff HEAD --check

# 5. 규칙이 요구한 가장 좁은 검증을 실제로 실행한다.
npm test
```

마지막 명령은 프로젝트에 맞게 바꿔야 한다. 중요한 점은 `AGENTS.md` 자체의 문법 검사로 끝내지 않는 것이다. 규칙이 “build를 실행하라”고 했다면 실제 작업에서 build evidence가 나오는지 확인해야 한다.

`git diff HEAD`를 쓰는 이유는 staged와 unstaged 변경을 한 번에 보기 위해서다. `git diff`만 쓰면 stage된 규칙을, `git diff --cached`만 쓰면 아직 stage하지 않은 규칙을 놓친다. untracked 문서는 diff에 나오지 않으므로 `git status`도 같이 본다.

negative check도 필요하다. 예를 들어 protocol로 옮긴 옛 명령이 현재 문서에 남지 않았는지, 더 가까운 `AGENTS.md`가 상위 금지 규칙을 반대로 쓰지 않는지 검색해야 한다. 새 경로가 존재한다는 positive check만으로는 stale reference를 잡을 수 없다.

## 규칙을 추가하지 않는 편이 나은 경우

반복되지 않은 한 번의 실수를 곧바로 durable rule로 만들면 규칙이 빠르게 비대해진다. 다음 조건에서는 먼저 prompt나 작업 메모에만 둔다.

- 이번 작업에만 유효한 예외다.
- 원인이 규칙 부재가 아니라 도구 오류나 잘못된 구현이다.
- 자동 test 하나로 더 정확하게 막을 수 있다.
- 기존 규칙을 정확히 읽었어도 피할 수 없는 실패다.
- 다른 작업에서는 오히려 반대 행동이 필요하다.

규칙은 실패할 때마다 늘리는 벌점표가 아니다. 반복되는 판단을 일관되게 만들고, 사람이 결과를 검증할 수 있게 하는 인터페이스에 가깝다.

## 결론

AI 코딩 에이전트의 운영 규칙은 “많이 적기”보다 “맞는 scope에 두기”가 먼저다.

항상 필요한 경계는 durable guidance에, 상황별 순서는 protocol에, 판정 가능한 조건은 test와 schema에 둔다. 계층을 만들었다면 더 가까운 규칙이 무엇을 override하는지 확인하고, 변경 뒤에는 파일 존재뿐 아니라 stale reference와 실제 검증 행동까지 readback한다.

이 구조가 AI를 자동으로 안전하게 만들지는 않는다. 하지만 규칙이 어디에서 적용되고, 어떤 증거가 있어야 지켰다고 말할 수 있는지는 훨씬 선명해진다. 그때부터 운영 규칙은 선언문이 아니라 검토 가능한 작업 계약이 된다.

## 확인 기준

- OpenAI Codex 공식 문서: [AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- 공식 페이지와 캡처 재확인일: 2026-07-21
- `AGENTS.md` 로드와 계층은 공식 동작을 근거로 했고, 세 층 분리와 readback 절차는 이 글의 운영 설계다.
- 예시 경로와 명령은 공개 설명용이며 특정 private 저장소 구조를 옮긴 것이 아니다.
