---
title: "AI가 public GitHub 블로그에 글을 올리기 전 확인할 것들"
description: "AI가 공개 GitHub 블로그에 글과 이미지를 올릴 때 확인해야 하는 안전장치를 정리합니다."
pubDate: 2026-06-23T16:30:00+09:00
updatedDate: 2026-07-01T08:25:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/public-blog-content-boundary.png"
---

AI가 블로그 글을 쓰는 일은 생각보다 쉽다. Markdown 파일을 만들고, 제목과 본문을 정리하고, 빌드가 통과하면 배포까지 이어갈 수 있다.

하지만 public GitHub 블로그에서는 글을 잘 쓰는 것보다 먼저 확인해야 할 것이 있다. 한 번 올라간 내용은 검색되고, 복제되고, 기록으로 남는다. 그래서 AI가 만든 결과를 "괜찮아 보이는 글"이 아니라 "공개해도 되는 변경사항"으로 봐야 한다.

나는 public repo에 글을 올릴 때 다음 기준을 먼저 둔다.

이 글은 보안 법률 가이드가 아니라, AI와 함께 public GitHub 블로그를 운영할 때 내가 실제로 쓰는 점검 흐름이다. 조직 보안 규정이나 서비스 약관이 따로 있다면 그것이 우선이다. 여기서는 최소한의 공개 안전 기준을 넓게 잡는 데 집중한다.

## 글만 공개되는 것이 아니다

블로그 글을 공개한다고 하면 보통 본문만 떠올린다. 하지만 Git 기반 블로그에서는 공개 표면이 훨씬 넓다.

- Markdown 원문
- 이미지와 첨부 파일
- 파일명과 디렉터리명
- commit message
- 빌드 결과물
- RSS와 sitemap
- GitHub Actions 로그
- Pages 배포 artifact

본문에서 지운 내용이 파일명이나 이미지에 남아 있으면 의미가 없다. 글에는 안전한 표현만 남겼더라도 commit message에 private한 단어가 들어가면 그것도 공개 기록이다.

그래서 public repo에서는 "글을 검토한다"가 아니라 "변경 전체를 검토한다"가 맞다.

<figure>
	<img src="/blog/blog-images/public-repo-diff-review.png" alt="공개 GitHub commit 화면에서 변경 파일 목록과 commit message를 확인하는 예시" />
	<figcaption>글 본문만 보는 대신 commit 단위로 어떤 파일이 추가되고 바뀌었는지 같이 확인한다.</figcaption>
</figure>

## AI가 쓴 글은 diff로 먼저 본다

AI는 글을 빠르게 만든다. 문제는 빠르게 만든 만큼, 사람이 의도하지 않은 맥락을 섞을 수 있다는 점이다.

특히 공개 글에서는 다음을 조심해야 한다.

- 실제 업무에서 나온 고유명사
- 내부 도구나 비공개 시스템을 떠올리게 하는 표현
- 특정 사람, 계정, 환경을 유추할 수 있는 정보
- 로컬 경로, repo 이름, branch 이름
- issue 번호, ticket 번호, 로그 조각
- token, key, cookie, credential 같은 문자열

초안이 자연스러워 보여도 바로 믿지 않는다. 먼저 diff로 어떤 파일이 바뀌었는지 본다. 그리고 "이 문장이 공개 인터넷에 영구히 남아도 되는가"라는 기준으로 다시 읽는다.

## 이미지는 본문보다 더 위험할 수 있다

이미지는 글의 이해를 크게 도와준다. 특히 설정 방법, 배포 흐름, 검증 결과를 설명할 때는 캡처 한 장이 긴 설명보다 낫다.

하지만 이미지는 본문보다 실수하기 쉽다. 브라우저 탭, 주소창, 계정 이름, 알림, 사이드바, 파일 경로, 로그, 터미널 출력이 같이 찍힐 수 있다. 글에서는 지운 정보가 이미지 한쪽 구석에 남아 있을 수도 있다.

그래서 이미지를 넣을 때는 다음 순서로 본다.

1. 공개 문서나 공개 서비스 화면처럼 안전한 캡처 대상을 먼저 고른다.
2. 원본 크기로 열어서 작은 글자까지 확인한다.
3. 불필요한 영역은 crop한다.
4. private한 내용이 보이면 blur나 redaction을 적용한다.
5. 그래도 확신이 없으면 이미지를 넣지 않는다.

이미지 파일명과 alt text도 같이 본다. `screenshot.png`보다 설명적인 이름이 좋지만, 그 이름이 private한 맥락을 드러내면 안 된다.

아키텍처나 개념을 설명할 때는 직접 만든 다이어그램이나 생성 이미지를 쓰는 편이 더 안전할 때가 많다. 다만 그런 이미지는 실제 시스템의 증거가 아니라 이해를 돕는 개념도라는 점을 caption에 밝혀야 한다. 반대로 실제 작동 흐름을 보여줄 때는 코드나 화면 일부를 캡처해도 좋지만, 필요한 영역만 남기고 민감한 정보는 crop, blur, mosaic, redaction 중 하나로 처리한다.

## 빌드 결과까지 확인한다

정적 블로그는 source와 live page가 항상 같은 모양으로 보이지 않는다. Markdown이 HTML로 바뀌고, 이미지가 최적화되고, RSS나 Open Graph metadata가 따로 만들어진다.

그래서 발행 전에는 source만 보지 않고 빌드 결과도 확인한다.

- 빌드가 통과하는지 확인한다.
- 생성된 HTML에 의도하지 않은 문자열이 없는지 검색한다.
- RSS와 sitemap에 잘못된 URL이 없는지 본다.
- 이미지가 실제 페이지와 글 목록에 표시되는지 확인한다.
- Open Graph 이미지가 기본 이미지로 남아 있지 않은지 확인한다.

이 단계는 번거로워 보여도 중요하다. public repo에서 문제는 "내 컴퓨터의 초안"이 아니라 "실제로 배포된 결과"에서 발생하기 때문이다.

<figure>
	<img src="/blog/blog-images/pages-deploy-success-check.png" alt="GitHub Pages workflow가 build와 deploy를 성공한 화면" />
	<figcaption>빌드와 배포가 모두 성공했는지 확인해야 실제 공개 페이지에 반영됐다고 말할 수 있다.</figcaption>
</figure>

## 검색은 넓게 한다

민감정보 검색은 본문 파일 하나만 대상으로 하면 부족하다. 최소한 source, assets, generated output을 같이 본다.

검색 대상은 글의 성격에 따라 달라지지만, 보통 다음 범주를 포함한다.

- private한 고유명사
- 개인 식별 정보
- 계정과 이메일
- 내부 URL이나 로컬 경로
- repo, branch, issue, ticket 식별자
- token, secret, key, password 계열 문자열

검색 결과가 없다고 완전히 안전하다는 뜻은 아니다. 그래도 검색은 사람이 놓치기 쉬운 반복 실수를 줄여준다. 특히 AI가 만든 글에서는 같은 표현이 여러 파일에 동시에 들어갈 수 있어서, 기계적인 검색이 꽤 효과적이다.

## commit과 push는 마지막 단계다

AI가 글을 만들었다고 바로 push하지 않는다. 마지막에는 다음 순서로 본다.

1. `git status`로 변경 파일 목록을 확인한다.
2. staged diff를 다시 읽는다.
3. 이미지 원본을 확인한다.
4. 빌드와 generated output 검색을 끝낸다.
5. commit message가 공개 기록으로 안전한지 본다.
6. push 후 Pages workflow와 live page를 확인한다.

여기까지 끝나야 발행이 완료됐다고 볼 수 있다. "파일을 push했다"와 "공개 블로그에 안전하게 반영됐다"는 다른 상태다.

<figure>
	<img src="/blog/blog-images/live-blog-post-list.png" alt="배포 후 공개 블로그 목록에서 새 글이 표시되는 화면" />
	<figcaption>push 이후에는 live 페이지에서 글, 이미지, 목록 순서가 의도대로 보이는지 다시 확인한다.</figcaption>
</figure>

## 내가 쓰는 기준

public GitHub 블로그에서 AI는 글 작성자라기보다 변경사항을 만드는 도구에 가깝다. 글, 이미지, metadata, commit, 배포 결과가 모두 검토 대상이다.

그래서 내가 쓰는 기준은 단순하다.

공개해도 되는 내용만 쓰고, 공개되는 모든 표면을 확인한다. 애매하면 고치지 않고 빼는 쪽을 선택한다.

이 기준을 세워두면 AI를 더 편하게 쓸 수 있다. AI에게 글을 맡길 수 없는 이유가 줄어드는 것이 아니라, AI가 만든 결과를 어디까지 확인해야 하는지 분명해지기 때문이다.
