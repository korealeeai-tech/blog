---
title: "AI가 public GitHub 블로그에 글을 올리기 전 확인할 것들"
description: "AI가 만든 글을 public repo에 올리기 전에 staged diff, 비텍스트 asset, generated output, build, remote와 live page를 실행 증거로 확인하는 방법을 설명합니다."
pubDate: 2026-06-23T16:30:00+09:00
updatedDate: 2026-07-21T16:42:37+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/public-release-gate-illustration.png"
---

public GitHub 블로그의 발행 단위는 Markdown 한 편이 아니다. commit에 들어간 파일명, 이미지 원본, frontmatter, generated HTML, workflow log, commit message까지 모두 공개 표면이 된다.

그래서 “본문을 읽어봤다”는 말만으로는 발행 준비가 끝나지 않는다. 무엇이 stage됐는지, text 검색이 어떤 파일을 보지 못했는지, build가 무엇을 보장하는지, push 뒤 원격과 live site가 같은 결과인지 차례로 확인해야 한다.

이 글은 특정 저장소의 내부 설정이나 실제 사고 기록을 공개하지 않는다. 빈 public blog repo를 가정한 명령과 합성 문자열로, pre-push gate를 어떻게 구성하고 결과를 어떻게 해석하는지 설명한다.

## 첫 단계는 내용이 아니라 staged 범위다

AI는 요청한 글을 잘 고치면서도 관련 없는 파일을 함께 바꿀 수 있다. 먼저 diff 내용을 읽기 전에 파일 목록을 고정한다.

```bash
git status --short
git diff --cached --name-status
git diff --cached --stat
```

세 명령은 서로 다른 질문에 답한다.

- `status`는 staged와 unstaged 변경이 같이 있는지 보여준다.
- `name-status`는 추가·수정·삭제된 공개 경로를 보여준다.
- `stat`은 예상보다 큰 변경이나 대량 삭제를 빠르게 드러낸다.

여기서 파일 수가 많다는 이유만으로 실패라고 볼 수는 없다. 새 글 하나에도 hero image, 본문 diagram, source capture가 함께 들어갈 수 있다. 판정 기준은 “모든 파일이 요청과 직접 연결되는가”다.

반대로 파일 하나만 바뀌었어도 안전하다고 단정할 수 없다. 하나의 SVG 안에 account 이름이나 local path가 text로 들어갈 수 있고, 한 장의 PNG에 브라우저 탭과 로그가 함께 찍힐 수 있다.

## text scan은 exit code까지 읽는다

민감 후보 검색은 넓게 시작하되 결과를 자동 삭제 판단으로 쓰지 않는다. 예를 들어 합성 패턴을 다음처럼 검색할 수 있다.

```bash
set +e
git grep --cached -n -I -E \
  'private-path|credential-value|internal-ticket|session-cookie'
scan_status=$?
set -e

case "$scan_status" in
  0) echo "review every match" ;;
  1) echo "no text match" ;;
  *) echo "scan itself failed" >&2; exit "$scan_status" ;;
esac
```

`rg`와 `git grep` 계열에서 exit 1은 보통 “match 없음”이다. 2 이상은 잘못된 정규식, 읽기 오류, 도구 실패일 수 있다. 출력이 비어 있다는 이유로 둘을 같은 성공으로 처리하면 검사를 실행하지 못하고도 통과했다고 기록할 수 있다.

match가 있다고 모두 유출도 아니다. 보안 체크리스트 글은 `credential`이라는 일반 단어를 설명할 수 있다. 반대로 실제 값이 패턴과 다른 형태라 검색에 잡히지 않을 수도 있다. 검색은 후보 생성기이고, staged diff review가 판정 단계다.

## binary와 image는 별도 목록으로 뽑는다

text scan은 PNG, WebP, 압축 파일 안의 작은 글자를 읽지 못한다. staged diff에서 text로 비교하기 어려운 파일을 따로 뽑아야 한다.

```bash
git diff --cached --name-only -z --diff-filter=ACMR | \
while IFS= read -r -d '' path; do
  case "${path,,}" in
    *.png|*.jpg|*.jpeg|*.webp|*.gif|*.pdf|*.zip|*.svg)
      printf '%s\n' "$path"
      ;;
  esac
done
```

NUL 구분자와 `read -d ''`를 쓰면 공백이 있는 경로도 한 파일로 보존된다. rename은 새 경로를 검사 대상으로 삼고, 삭제된 asset은 staged inventory와 history 한계에서 별도로 확인한다. 확장자 목록은 완전한 binary 탐지기가 아니므로 저장소가 다른 asset 형식을 쓰면 목록을 늘리거나 MIME 검사와 결합해야 한다.

이미지는 원본 크기로 열어 다음을 본다.

- 계정명, 이메일, avatar, 브라우저 profile
- 주소창, 다른 tab, local path, repo 이름
- source code, 로그, issue id, 고객·조직을 유추할 문구
- crop 바깥에 남은 작은 글자와 blur로 읽을 수 있는 윤곽
- EXIF, comment, author 같은 metadata

OCR이 아무것도 찾지 못해도 육안 검토를 생략할 수 없다. 반대로 육안으로 안전해 보여도 metadata에 원본 위치가 남을 수 있다. 두 검사는 대체 관계가 아니다.

## source가 깨끗해도 generated output은 다를 수 있다

정적 사이트는 source를 변환한다. Markdown frontmatter가 HTML metadata로 들어가고, image path가 최종 URL로 바뀌며, build 과정에서 source map이나 manifest가 생길 수 있다.

그래서 build 전 source scan과 build 후 output scan을 분리한다.

```bash
npm run build

rg -n -I \
  'private-path|credential-value|internal-ticket|session-cookie' \
  src public dist
```

`npm run build`가 성공했다는 사실은 문법, import, content schema 같은 build contract가 맞았다는 근거다. 내용이 사실인지, 이미지가 안전한지, 민감한 문자열이 없는지까지 증명하지 않는다.

반대 사례도 있다. source에는 안전한 환경변수 이름만 있고 build plugin이 값을 HTML에 주입할 수 있다. source scan만 통과하고 `dist`를 보지 않으면 이 차이를 놓친다. 반대로 `dist`만 보면 commit에 들어간 불필요한 source 파일이나 삭제되지 않은 원본 이미지를 놓친다.

## 검증 명령과 위험을 연결한다

명령 수가 많다고 검증이 깊어지는 것은 아니다. 각 명령이 어떤 실패를 잡는지 연결해야 한다.

| 검증 | 직접 확인하는 것 | 확인하지 못하는 것 |
|---|---|---|
| `git diff --cached --name-status` | commit 대상 경로와 변경 종류 | 파일 내용의 사실성·이미지 내부 |
| `git diff --cached --check` | whitespace error와 깨진 patch 일부 | 논리·보안·build 성공 |
| staged text scan | 알려진 text 후보 | binary 내부·알려지지 않은 표현 |
| image 원본/metadata 검토 | 시각·metadata 단서 | 글의 논리와 링크 최신성 |
| `npm run build` | site build contract | public 안전과 주장 정확성 |
| `dist` scan | 생성 결과에 남은 text 후보 | 원격 branch와 실제 배포 상태 |
| live HTTP/readback | 배포된 페이지와 asset 접근 | 보이지 않는 과거 Git 이력 |

이 표에서 중요한 열은 마지막이다. 검증이 무엇을 증명하지 않는지 알아야 다음 gate를 붙일 수 있다.

## branch·remote·author는 push 직전에 다시 본다

여러 저장소와 계정을 오가면 내용이 안전해도 잘못된 remote로 push할 수 있다.

```bash
git branch --show-current
git remote get-url origin
git config --local user.name
git config --local user.email
git log -1 --format='%H %an <%ae>'
```

expected branch, remote, author 값은 저장소마다 다르다. 중요한 것은 기억으로 답하지 않고 직전에 실제 값을 읽는 것이다. commit message도 공개되므로 내부 project 이름, 경로, 작업 ticket을 넣지 않는다.

## push 뒤에는 원격과 live page를 분리해 확인한다

push 성공은 Git remote가 commit을 받았다는 뜻이다. Pages build와 실제 URL 반영까지 성공했다는 뜻은 아니다.

```bash
git fetch origin refs/heads/main:refs/remotes/origin/main
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
```

세 SHA가 같으면 local, tracking branch, remote ref가 일치한다. 그다음 배포 workflow의 head SHA와 conclusion을 확인하고, 마지막으로 수정 URL을 직접 읽는다.

live 검증에서는 HTTP 200만 보지 않는다. 새 제목이나 핵심 section marker가 HTML에 있는지, 삭제한 asset 이름이 남지 않았는지 확인한다. CDN cache나 이전 deployment 때문에 잠시 과거 페이지가 보일 수 있으므로 workflow 완료와 readback을 함께 본다.

## 이 gate도 놓칠 수 있는 것

실행 가능한 gate는 기억에 의존하는 것보다 낫지만 완전하지 않다.

- 검색 사전에 없는 민감 표현은 text scan을 통과할 수 있다.
- 합성 이미지가 실제 조직의 UI와 우연히 비슷할 수 있다.
- 공식 문서 링크가 build 뒤에 살아 있어도 해석은 틀릴 수 있다.
- 이미 과거 commit에 공개된 파일은 현재 tree에서 삭제해도 history에 남는다.
- false positive가 많아지면 사람이 match를 습관적으로 무시할 수 있다.

그래서 실패 조건은 “검색 결과가 0인가” 하나가 아니다. tool이 정상 실행됐는지, match를 사람이 분류했는지, binary를 별도 확인했는지, history 한계를 이해했는지를 함께 본다.

## 내가 사용하는 release 순서

public blog 발행은 다음 순서로 닫는다.

1. 요청과 직접 관련된 파일만 stage한다.
2. filename, text diff, binary asset을 분리해 검토한다.
3. source scan의 exit code와 match를 판정한다.
4. image를 원본 크기로 열고 metadata를 확인한다.
5. build 후 generated output을 다시 검색한다.
6. branch, remote, author, commit message를 확인한다.
7. push 뒤 local·origin·remote SHA를 맞춘다.
8. workflow와 live HTML·asset을 readback한다.
9. 확인하지 못한 항목과 Git history 한계를 남긴다.

이 순서는 모든 public 프로젝트의 보안 감사 절차를 대체하지 않는다. secret scanning, dependency review, 조직 정책, 전문 보안 검토가 필요한 저장소라면 별도 gate가 더 필요하다.

그래도 최소한 한 가지는 달라진다. “글을 읽어보니 괜찮았다”가 아니라, 어떤 공개 표면을 어떤 증거로 확인했고 어디까지는 확인하지 못했는지 설명할 수 있다. public 발행에서 신뢰할 만한 것은 자신감이 아니라 그 연결이다.
