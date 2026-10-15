---
title: "1M 컨텍스트에서 자동 압축은 언제 도는가: 세션 로그에 남은 압축 300건으로 본 임계 설정"
description: "Claude Code의 자동 압축이 실제로 어느 지점에서 돌고, 한 번에 얼마를 줄이고, 얼마나 기다리게 하는지 7주치 세션 로그로 다시 집계했습니다. 임계를 낮출 때 얻는 것과 내주는 것, 자기 로그에서 압축 분포와 임계별 근사를 뽑는 방법을 정리합니다."
pubDate: 2026-10-15T16:25:00+09:00
category: "ai-workflow"
heroImage: "../../assets/blog/diagrams/claude-code-autocompact-window.svg"
---

어느 날 Claude Code 사용량이 평소보다 눈에 띄게 빨리 찼다. 그날 세션 로그를 열어 보니 세션 하나가 컨텍스트 57K에서 시작해 637K까지 자라는 동안 압축이 한 번도 돌지 않았다. 로컬에 남아 있던 세션 로그 408개를 모두 뒤져도 자동 압축 기록은 없었다. 요청이 오갈 때마다 그때까지의 대화 전체가 다시 실려 갔고, 대화가 길어질수록 요청 한 번의 무게가 커졌다.

나는 압축이 컨텍스트가 어느 정도 차면 알아서 도는 장치라고 생각하고 있었다. 실제로는 그렇지 않았다. 그래서 임계를 400K로 정해 쓰기 시작했고, 그 뒤 7주 동안 값을 세 번 더 바꿨다. 이 글은 그 기간의 세션 로그를 다시 집계해서 다음 질문에 답한다.

**1M 컨텍스트 모델에서 자동 압축은 실제로 언제 돌고, 임계를 낮추면 무엇을 얻고 무엇을 내주는가?**

숫자는 모두 한 사람의 로그에서 나왔다. 대화 내용은 쓰지 않았고, 요청마다 로그에 남는 토큰 수와 압축 기록만 셌다. 압축 분포와 임계별 근사를 자기 로그에서 뽑는 스크립트는 글 끝에 있다.

## 기본값에서 압축이 도는 두 가지 경우

공식 문서는 임계를 정하지 않았을 때의 동작을 이렇게 적는다.

> [Model configuration](https://code.claude.com/docs/en/model-config): "Models running with a native 1M window compact before the window fills, at about 967K tokens by default. These include the Fable models, Sonnet 5 and later, Haiku 5.5, and Opus 4.7 and later."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-default-autocompact-thresholds.png" alt="Claude Code Model configuration 문서의 Default auto-compact thresholds 목록에서 1M 창 모델은 약 967K 토큰에서 압축한다는 항목을 포함한 영역 캡처" />
	<figcaption>Claude Code Model configuration 문서 캡처, 확인일 2026-10-15. 1M 창 모델의 기본 압축 지점을 보여주지만, 그 지점이 비용이나 품질 면에서 적절하다는 뜻은 아니다.</figcaption>
</figure>

내가 주로 쓴 모델(Fable 5.1, Opus 5, Opus 5.5)은 모두 이 목록에 들어간다. 크기로만 보면 압축은 창이 거의 찼을 때 대화를 이어 가게 하는 안전장치다. 그 아래 구간에서는 매 요청이 쌓인 대화를 그대로 다시 보낸다. 637K까지 자란 세션에서 압축이 0번이었던 것도 지금 문서가 설명하는 기본 동작과 같은 모습이었다.

세션 대부분은 967K에 닿기 전에 끝난다. 다만 이 글의 데이터로 압축을 되돌려 보면 419개 세션 중 35개는 967K를 넘었을 것이고, 그 35개가 요청의 41%를 차지했다. 419개 중 약 100개는 임시 폴더에서 몇 번만 오간 짧은 세션(요청 합 약 300건)이라, 세션 수보다 요청 비중으로 보는 편이 맞다. 소수의 긴 세션에 요청이 몰린다.

같은 문서는 바로 아래에서 다른 경로를 하나 더 안내한다. 자리를 비웠을 때의 압축이다.

> [All settings](https://code.claude.com/docs/en/settings-reference): "Idle compaction compacts a long conversation that you've stepped away from, shortly before its prompt cache expires. Your next message then sends a summary instead of the whole conversation."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-idle-compaction.png" alt="Claude Code All settings 문서의 idleCompaction 항목에서 자리를 비운 긴 대화를 프롬프트 캐시가 만료되기 직전에 압축하며 대화형 터미널, 1시간 캐시, 기능 플래그, 20만 토큰 이상, 약 54분 무활동 조건을 모두 만족할 때 기본으로 켜진다는 영역 캡처" />
	<figcaption>Claude Code All settings 문서 캡처, 확인일 2026-10-15. idle 압축의 조건을 보여주지만, 내 로그의 어느 버전부터 이 동작이 있었는지는 증명하지 않는다. 문서상 이 기능을 끄는 키는 2.1.290부터 쓸 수 있다.</figcaption>
</figure>

조건은 다섯 가지다. 대화형 터미널 세션이어야 하고, 1시간짜리 프롬프트 캐시를 써야 하고, 기능 플래그를 받아 올 수 있어야 한다. 컨텍스트가 기준 크기 이상이어야 하는데, 기본값은 20만 토큰이고 바꿀 수 있다. 끝으로, 마지막 요청 뒤 약 54분이 지난 시점에 컴퓨터가 깨어 있어야 한다. 이 경로는 사용량 쪽을 겨냥한다. 캐시가 식은 뒤 돌아와 첫 메시지를 보내면 대화 전체를 캐시 없이 다시 처리해야 하는데, 그 전에 요약으로 바꿔 둔다. 그러니 임계를 정하지 않아도 "967K 전에는 절대 압축하지 않는다"고 말할 수는 없다. 오래 자리를 비우는 사용 방식이라면 idle 압축이 먼저 돌 수 있다.

1시간 캐시 조건은 누구에게나 맞는 것이 아니다.

> [Prompt caching](https://code.claude.com/docs/en/prompt-caching): "Unless you choose a TTL yourself, Claude Code requests the one-hour TTL only on a Claude subscription within your plan's included usage."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-prompt-caching-ttl.png" alt="Claude Code Prompt caching 문서에서 TTL을 직접 정하지 않으면 구독 요금제의 포함 사용량 안에서만 1시간 TTL을 요청하며, 메인 대화는 구독에서 1시간, 사용량 크레딧·API 키·클라우드 제공자에서 5분이라는 표 캡처" />
	<figcaption>Claude Code Prompt caching 문서 캡처, 확인일 2026-10-15. 요금 방식별 기본 캐시 수명을 보여주지만, 내 로그의 각 요청이 어떤 수명으로 캐시됐는지는 증명하지 않는다.</figcaption>
</figure>

API 키나 클라우드 제공자로 쓰면 메인 대화의 기본 캐시는 5분이라, 캐시 수명을 따로 1시간으로 정하지 않는 한 idle 압축 조건에 들지 않는다. 구독 요금제라도 포함 사용량을 넘겨 추가 사용량으로 넘어가면 같은 문서상 5분으로 내려간다.

## 임계를 정하는 방법

크기 기준의 압축 지점은 `autoCompactWindow` 설정으로 앞당길 수 있다.

> [All settings](https://code.claude.com/docs/en/settings-reference): "Type: number of tokens, from 100000 to 1000000. Claude Code caps the value at your model's context window"

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-autocompactwindow-setting.png" alt="Claude Code All settings 문서의 autoCompactWindow 항목에서 값의 범위가 100000에서 1000000 토큰이고 기본값은 비어 있으며 세션별 덮어쓰기 우선순위를 설명하는 목록 캡처" />
	<figcaption>Claude Code All settings 문서 캡처, 확인일 2026-10-15. 설정 범위와 우선순위를 보여주지만, 어떤 값이 좋은지는 말하지 않는다.</figcaption>
</figure>

같은 값을 넣는 길이 세 가지 더 있다. 세션 안에서 쓰는 `/autocompact` 명령, 실행할 때 붙이는 `--autocompact` 플래그, `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 환경 변수다. 환경 변수가 가장 우선한다. 환경 변수에는 함정이 하나 있다.

> [Environment variables](https://code.claude.com/docs/en/env-vars): "Accepts a plain integer such as 500000 only: a value like 500k reads as 500 and clamps to the 100K minimum."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-env-autocompact-window.png" alt="Claude Code Environment variables 문서의 CLAUDE_CODE_AUTO_COMPACT_WINDOW 행에서 정수만 받으며 500k처럼 쓰면 500으로 읽혀 최소값 100K로 잘린다는 설명 캡처" />
	<figcaption>Claude Code Environment variables 문서 캡처, 확인일 2026-10-15. 환경 변수의 값 형식을 보여주지만, 이 글의 로그를 만든 세션에서 이 변수를 썼는지는 증명하지 않는다. 내가 설정을 바꿀 때 확인한 시점에는 이 변수가 비어 있었다.</figcaption>
</figure>

명령과 플래그는 `500k`를 받지만 환경 변수는 `500000`만 받는다. 같은 문자열을 옮겨 적으면 의도한 값의 5분의 1인 100K로 내려간다. 같은 행에는 이 변수를 쓰면 상태 줄의 사용률이 모델 전체 창 기준으로 계속 표시돼 더는 압축 시점을 가리키지 않는다는 설명도 있다.

명령으로 정한 값이 저장되는 자리도 알아 둬야 한다.

> [All settings](https://code.claude.com/docs/en/settings-reference): "/autocompact saves here. For that model, the value takes precedence over a top-level autoCompactWindow in the same settings file. Requires Claude Code v2.1.288 or later"

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-autocompact-per-model.png" alt="Claude Code All settings 문서의 modelSettings 아래 autoCompactWindow 항목에서 /autocompact가 이 자리에 저장하며 그 모델에 대해서는 최상위 autoCompactWindow보다 우선한다는 설명 캡처" />
	<figcaption>Claude Code All settings 문서 캡처, 확인일 2026-10-15. 명령으로 정한 값이 모델별로 저장되고 우선한다는 설명을 보여주지만, 내 로그의 설정 변경은 모두 최상위 키를 고친 것이라 이 동작을 증명하지는 않는다.</figcaption>
</figure>

2.1.288부터는 `/autocompact`로 한 번 값을 정하면 그 모델의 설정에 따로 남는다. 나중에 같은 설정 파일의 최상위 `autoCompactWindow`를 고쳐도 그 모델에는 반영되지 않는다. 다른 설정 범위와의 관계는 [Model configuration](https://code.claude.com/docs/en/model-config) 문서가 적는다. managed settings처럼 우선순위가 더 높은 범위가 그 모델이나 모든 모델의 창을 정해 두면, 명령은 값을 저장하지만 세션은 그 범위의 값을 따른다. 명령과 파일 편집을 섞어 쓰면 어느 값이 살아 있는지부터 헷갈린다.

## 첫 판단은 틀렸다: 파일을 고쳐도 떠 있는 세션은 그대로였다

처음에는 설정 파일에 400K를 적고, 이미 떠 있던 세션에도 바로 적용될 것이라고 판단했다. 근거는 설정 문서였다. 그 문서는 설정 파일이 바뀌면 대부분의 항목을 실행 중인 세션에 다시 읽어 들인다고 하고, 세션 시작 때 한 번만 읽는 키를 따로 적어 둔다.

> [Settings files and precedence](https://code.claude.com/docs/en/settings): "Claude Code reads some keys only once, at session start, so an edit to one of them doesn't reach the running session."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-settings-read-at-session-start.png" alt="Claude Code Settings files and precedence 문서에서 일부 키는 세션 시작 때 한 번만 읽으며 실행 중에 자주 고치는 키로 model, effortLevel, modelSettings를 나열한 영역 캡처" />
	<figcaption>Claude Code Settings files and precedence 문서 캡처, 확인일 2026-10-15. 세션 시작 때만 읽는 키의 일부를 보여주지만, 이 목록이 전부라는 뜻은 아니다. 목록 앞에 "세션 중에 고칠 가능성이 가장 큰 것들"이라는 단서가 붙어 있다.</figcaption>
</figure>

이 목록에 최상위 `autoCompactWindow`가 없으니 다시 읽는 대상이라고 본 것이다. 그때 기록에 남은 목록은 `model`, `effortLevel`, `outputStyle`이었다. 지금 목록에는 `modelSettings`가 들어 있는데, 앞에서 본 대로 `/autocompact`가 모델별 임계를 저장하는 자리가 이 키다. 최상위 `autoCompactWindow`가 목록에 없다는 점은 그때와 같다. 하지만 목록 앞에는 "세션 중에 고칠 가능성이 가장 큰 것들"이라는 단서가 붙어 있었고, 실측이 그 판단을 뒤집었다. 설정을 바꾼 시점에 이미 528,954 토큰이던 세션이 그 뒤로 571,303까지 계속 자랐다. 새 임계를 13만~17만 토큰 넘긴 상태로 여러 차례 요청이 오갔는데도 압축은 없었다. 그때 기록에는 47번으로 남았지만, 뒤에서 말할 로그 줄 중복 때문에 실제 요청은 그보다 적었을 수 있다.

7주치 로그로 이 결과를 다시 확인했다. 그 사이 설정 파일의 값을 세 번 더 바꿨고, 세 번 모두 값을 고친 명령이 세션 로그에 남아 있어 바꾼 시각을 초 단위로 알 수 있었다. 바꾼 뒤에 일어난 압축 중 6건(세션 3개)이 바꾸기 전 값의 지점에서 돌았고, 셋 다 변경 전에 시작한 세션이었다. 변경 전에 시작한 세션이 새 값으로 압축한 사례는 한 건도 없었다. 6건은 모두 2.1.283 세션이었다. 이 6건과 8월 28일 기록으로 보면, 최상위 키는 세션을 새로 열어야 적용됐다.

떠 있는 세션의 임계를 바꾸고 싶다면 문서가 안내하는 길은 명령이다.

> [Commands](https://code.claude.com/docs/en/commands): "Claude Code saves the value to user settings and applies it to the current session."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-autocompact-command.png" alt="Claude Code Commands 문서의 /autocompact 행에서 값을 사용자 설정에 저장하고 현재 세션에도 적용한다는 설명 캡처" />
	<figcaption>Claude Code Commands 문서 캡처, 확인일 2026-10-15. 명령이 현재 세션에도 적용된다는 설명을 보여주지만, 내 환경에서 그렇게 동작하는지는 증명하지 않는다. 나는 이 동작을 따로 재 보지 않았다.</figcaption>
</figure>

## 7주 동안 남은 압축 300건

집계 대상은 2026-08-26부터 10-15 15시 21분까지의 메인 세션 로그 419개다. 이 기간에 쓴 Claude Code는 2.1.234부터 2.1.290까지다. 서브에이전트 로그는 넣지 않았다. 8월 28일에 본 세션들의 로그는 지금 남아 있지 않아서, 그날의 수치는 그때 남긴 기록을 옮겼다.

집계하다가 측정 오류부터 하나 잡았다. 로그에는 응답 하나가 내용 블록마다 한 줄씩 기록되고, 그 줄마다 같은 토큰 수가 반복된다. 토큰 정보가 있는 줄은 96,679줄이었지만 응답 ID로 중복을 걸러 내면 실제 요청은 39,623건이었다. 처음 압축을 추적하려고 만든 스크립트는 줄을 그대로 세고 있어서 요청 수는 약 2.4배, 컨텍스트 합은 약 2.5배로 부풀렸다. 요청당 평균은 크게 틀리지 않았지만 총량은 쓸 수 없는 값이었다. 아래 숫자는 모두 중복을 걸러 낸 값이다.

압축 기록은 300건이고 모두 자동 압축이었다. 수동 `/compact`는 한 번도 쓰지 않았다. 로그의 압축 경계 기록에는 압축 직전 크기, 직후 크기, 걸린 시간이 남는다. 세션을 시작할 때의 설정값으로 압축을 나눴고, 설정값에서 4만 토큰 안쪽에서 돈 압축을 "설정값 근처"로 셌다.

| 세션 시작 때 임계 | 압축 | 설정값 근처 | 그중 압축 직전 크기 중앙값 | 가장 작은 값 | 설정값과의 차이 |
|---|---|---|---|---|---|
| 250K | 123 | 100 | 218.5K | 214.6K | 약 31.5K |
| 350K | 10 | 10 | 317.9K | 317.0K | 약 32.1K |
| 400K | 55 | 54 | 368.8K | 366.6K | 약 31.2K |
| 500K | 112 | 110 | 468.9K | 466.4K | 약 31.1K |

300건 중 274건이 설정값 근처에서 돌았다. 설정값과의 차이는 묶음별 중앙값으로 3만 1천~3만 2천 토큰이고, 274건 중 201건이 2만 9천~3만 5천 토큰 사이였다. 1M 기본값이 약 967K, 곧 3만 3천 토큰 앞이라는 문서 설명과 같은 모양이다. 응답이 쓸 자리를 남겨 두고 미리 압축하는 것으로 보이지만, 정확한 계산식은 확인하지 않았다. 차이가 2만 9천보다 작은 71건은 압축 지점을 지나친 뒤에 돈 것으로 보인다. 대부분은 조금 지나쳤지만 13건은 차이가 1만 8천 아래였고, 가장 크게 지나친 1건은 500K 설정에서 499.8K, 설정값을 0.2K 남기고 돌았다. 압축 지점을 3만 토큰 넘게 지나친 셈이다.

나머지 26건도 압축이 엉뚱한 때 돈 것은 아니었다.

- **22건**은 9월 22일 세션 네 개(주로 Opus 5, 일부 Fable 5.1)에서 나왔다. 모두 압축 직전 요청의 컨텍스트가 그 앞 요청의 2.01~2.17배로 뛴 직후였다. 컨텍스트가 한 번에 압축 지점을 훌쩍 넘었고, 압축은 넘자마자 돌았다. 토큰 수는 API가 보고한 캐시 읽기 값이라 내 집계 오류는 아니다. 배율이 지나치게 일정해서 대화 기록이 겹쳐 실렸을 가능성을 의심하지만, 왜 두 배가 됐는지는 확인하지 못했다.
- **3건**은 마지막 응답 자체가 6만 토큰 넘게 컸던 경우다(그중 하나는 큰 파일을 한 번에 쓰는 도구 호출이었다). 그 응답이 대화에 붙으며 컨텍스트가 9만 토큰 넘게 뛰었고, 압축은 그 응답이 끝난 뒤에야 돌았다.
- **1건**은 idle 압축이었다. 마지막 요청 뒤 55분 만에 돌았고, 같은 시각에 문서가 말한 "Compacted while idle" 안내가 남아 있었다. 압축 경계 기록의 종류는 다른 압축과 똑같이 `auto`라서, 이 안내가 없으면 로그만으로 둘을 가를 수 없다. 7주 동안 이 안내가 남은 압축은 이것 하나다.

압축이 한 번에 얼마를 줄였는지는 처음에 잘못 읽었다. 경계 기록의 압축 직후 크기는 중앙값 15K였다. 그런데 압축 직후 첫 요청이 실제로 보낸 컨텍스트는 중앙값 80K였다(하위 10% 72K, 상위 10% 93K). 압축 직후 크기에는 요약된 대화만 들어가고, 다음 요청에는 시스템 프롬프트와 도구 정의가 함께 실린다. 압축 뒤에 다시 들어가는 것은 그것만이 아니다.

> [Context window](https://code.claude.com/docs/en/context-window): "Project-root CLAUDE.md and unscoped rules | Re-injected from disk"

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-context-after-compaction.png" alt="Claude Code Context window 문서의 What survives compaction 표에서 시스템 프롬프트는 그대로 적용되고, 프로젝트 루트 CLAUDE.md와 규칙, 자동 메모리, 계획 파일은 디스크에서 다시 넣으며, 읽거나 고친 파일은 최근 수정 순으로 다섯 개까지 다시 읽고, 호출한 스킬 본문도 상한 안에서 다시 넣는다는 행 캡처" />
	<figcaption>Claude Code Context window 문서 캡처, 확인일 2026-10-15. 압축 뒤 무엇이 다시 실리는지 보여주지만, 그 양이 내 환경에서 몇 토큰인지는 증명하지 않는다.</figcaption>
</figure>

지시문 파일과 메모리, 읽거나 고친 파일 최대 5개, 호출했던 스킬 본문이 다시 들어간다. 내 환경에서는 시스템 프롬프트와 도구 정의까지 합쳐 이렇게 다시 실리는 몫이 약 65K였다. 470K 근처에서 압축하면 15K가 아니라 80K로 내려가고, 거기서 다시 자란다.

압축 한 번에 걸린 시간은 중앙값 112초, 상위 10%는 184초였다. 압축하는 동안에는 다음 응답이 나오지 않는다. Opus 5.5와 Fable 5.1에서는 압축할 대화가 클수록 오래 걸렸다. Opus 5.5는 250K 설정에서 77초, 500K에서 103초였고, Fable 5.1은 250K에서 106초, 400K에서 123초, 500K에서 132초였다. 크기가 두 배 남짓일 때 시간은 20~30%대 늘었다. Opus 5는 반대로 250K에서 171초, 400K에서 158초였는데, 각각 12건과 13건뿐이라 방향을 말하기 어렵다.

같은 세션 안에서 설정값 근처 압축과 압축 사이에 오간 요청 수는 250K일 때 중앙값 47건, 400K일 때 90.5건, 500K일 때 122건이었다. 350K는 4쌍뿐이라 117건이 나왔지만 비교에서 뺐다.

<figure>
	<img src="/blog/blog-images/claude-code-autocompact-session.svg" alt="autoCompactWindow 500K로 연 세션 하나의 요청 584건에 대한 컨텍스트 그래프. 실측선은 약 467K에 닿을 때마다 압축돼 약 90K로 내려가 네 번 톱니 모양을 그리고, 압축이 줄인 양을 되돌려 기본값 약 967K로 다시 자른 근사선은 한 번만 내려가며 훨씬 높게 머문다" />
	<figcaption>내 세션 로그 한 개의 요청별 컨텍스트. 파란 실선은 실측이고, 주황 점선은 압축이 줄인 양을 되돌려 기본값으로 다시 자른 근사다. 이 세션의 컨텍스트 합은 실측 162.7M, 근사 274.0M이었다. 근사선은 압축이 없었어도 대화가 똑같이 흘렀다고 가정한 계산이라 실제로 일어난 일을 증명하지는 않는다.</figcaption>
</figure>

## 임계별로 요청 한 번의 무게가 달라졌나

세션을 시작한 시각의 설정값으로 요청을 나눠 요청당 평균 컨텍스트를 비교했다. 모델이 바뀌면 작업 방식도 바뀌므로 같은 모델끼리 묶었다.

| 모델 | 250K | 350K | 400K | 500K |
|---|---|---|---|---|
| Opus 5.5 | 138K (2,482건) | 191K (1,584건) | — | 267K (17,583건) |
| Fable 5.1 | 136K (3,539건) | — | 196K (7,794건) | 275K (1,814건) |

임계가 높을수록 요청 한 번이 무거웠다. 압축 지점이 올라가면 톱니가 더 높이까지 자라므로 예상한 방향이다. 다만 이 표는 시기별 관찰이다. 기간마다 한 일이 달라서 이 차이를 전부 임계 때문이라고 볼 수는 없다.

## 임계만 바꿨다면: 기록을 되돌린 근사

같은 기간을 임계만 바꿔 다시 살 수는 없다. 그래서 로그를 거꾸로 이용했다. 각 압축이 줄인 양(압축 직전 크기에서 압축 직후 첫 요청 크기를 뺀 값)을 그 뒤 요청들에 다시 더해 "압축이 없었다면"의 순서를 만들었다. 그 위에서 임계보다 3만 3천 토큰 앞을 넘을 때마다 80K로 내려 다시 잘랐다. 압축 호출 자체도 그 시점의 대화를 한 번 읽으므로 그 양을 따로 더했다. idle 압축은 이 계산에 넣지 않았다.

이 계산을 각 세션의 실제 설정값으로 돌리면 실제 로그와 맞는지부터 확인했다. 컨텍스트 합은 실측 8,756M에 근사 8,707M(-0.6%), 압축 횟수는 실측 300회에 근사 301회였다. 설정값별로 봐도 차이가 1% 안이었다. 이것은 계산식이 기록을 다시 만들어 낸다는 확인일 뿐이다. 다른 임계에서도 대화가 똑같이 흘렀을 것이라는 가정까지 검증하지는 않는다.

| 임계 | 기본값 대비 처리량 | 압축 횟수 | 압축 대기 시간 근사 |
|---|---|---|---|
| 약 967K (기본값) | 100% | 47 | 약 1.5시간 |
| 700K | 79% | 97 | 약 3.0시간 |
| 500K | 64% | 187 | 약 5.8시간 |
| 400K | 53% | 294 | 약 9.1시간 |
| 350K | 48% | 385 | 약 12.0시간 |
| 300K | 43% | 506 | 약 15.7시간 |
| 250K | 38% | 712 | 약 22.2시간 |
| 200K | 32% | 1,165 | 약 36.2시간 |

처리량은 요청이 보낸 컨텍스트 합에 압축 호출이 읽는 양을 더한 값이다. 대기 시간은 압축 횟수에 중앙값 112초를 곱한 값이며, 419개 세션 전체를 7주 동안 합친 것이다. 112초는 250K~500K 설정에서 잰 값이다. 앞에서 봤듯 작은 압축이 더 빨리 끝난 모델이 많았으므로, 낮은 임계의 대기 시간은 이 표보다 짧고 700K와 기본값 행은 이 표보다 길 가능성이 크다.

이 표에서 볼 것은 수확 체감이다. 기본값에서 500K로 내리면 압축이 140회 늘고 처리량이 36%포인트 준다. 500K에서 250K로 더 내리면 압축이 525회 더 늘고 처리량은 26%포인트 준다. 근사로 보면 압축 한 번이 줄여 주는 몫이 0.26%포인트에서 0.05%포인트로 작아진다. 임계를 낮출수록 같은 절감을 얻으려고 더 자주 멈춰야 한다.

## 토큰이 줄어든 만큼 비용도 줄까

처리량이 줄었다고 비용이 같은 비율로 줄지는 않는다. 쌓인 대화는 대부분 캐시에서 읽히고, 캐시 읽기는 단가가 낮다.

> [Pricing](https://platform.claude.com/docs/en/about-claude/pricing): "Cache read (hit) | 0.1x base input price (0.025x on Claude Fable 5.1 and Claude Mythos 5.1; 0.05x on Claude Opus 5.5 and Claude Sonnet 5.5)"

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-pricing-cache-read-multiplier.png" alt="Claude Pricing 문서의 프롬프트 캐시 배수 표에서 캐시 쓰기 1.25배와 2배, 캐시 읽기 0.1배이며 Fable 5.1은 0.025배, Opus 5.5는 0.05배라는 행 캡처" />
	<figcaption>Claude Pricing 문서 캡처, 확인일 2026-10-15. API 단가의 배수를 보여주지만, 구독 요금제의 사용 한도가 토큰 종류별로 어떻게 차감되는지는 보여주지 않는다.</figcaption>
</figure>

반대로 압축 자체에도 값이 든다.

> [Manage costs effectively](https://code.claude.com/docs/en/costs): "/compact reads the conversation it summarizes, so compacting a large context is itself a large request. When you want a fresh start instead of continuity, /clear costs nothing"

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-costs-compaction.png" alt="Claude Code Manage costs effectively 문서에서 compact가 요약할 대화를 읽으므로 큰 컨텍스트 압축은 그 자체로 큰 요청이며 새로 시작하려면 clear는 비용이 없다는 항목 캡처" />
	<figcaption>Claude Code Manage costs effectively 문서 캡처, 확인일 2026-10-15. 압축 요청도 비용이 든다는 점을 보여주지만, 압축 한 번이 얼마인지는 말하지 않는다.</figcaption>
</figure>

그래서 API 단가로 손익분기를 계산해 봤다. 압축 한 번의 비용은 세 가지를 더했다.

- 압축 직전 대화를 캐시에서 한 번 읽는 값. 설정값 근처 압축의 직전 크기 중앙값(250K 설정 218.5K, 500K 설정 468.9K)을 썼다
- 요약 출력. 압축 직후 크기의 중앙값 15K를 썼다. 다만 이 값은 하한에 가깝다. 이유는 아래에 적었다
- 압축 뒤 첫 요청이 새로 캐시에 쓰는 값. [프롬프트 캐시 문서](https://code.claude.com/docs/en/prompt-caching)는 압축 다음 턴이 짧은 요약만 다시 캐시한다고 설명한다. 하지만 내 로그에서 압축 직후 첫 요청의 캐시 쓰기는 중앙값 48K였고(하위 10% 39K, 상위 10% 63K), 평소 요청은 2K 안팎이었다. 다시 넣는 지시문, 메모리, 파일이 함께 쓰인 것으로 보인다. 평소보다 많은 약 46K를 압축 비용에 넣었다

요약 출력이 15K에서 끝나지 않을 수 있는 이유는 앞의 Context window 캡처 첫 문단에 있다. 2.1.198부터 요약 요청도 세션의 확장 사고 설정을 따른다. 사고에 쓴 토큰은 출력으로 과금된다.

> [Manage costs effectively](https://code.claude.com/docs/en/costs): "Thinking tokens are billed as output tokens, and the default budget can be tens of thousands of tokens per request depending on the model."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-costs-thinking-billed.png" alt="Claude Code Manage costs effectively 문서에서 확장 사고는 기본으로 켜져 있고 사고 토큰은 출력 토큰으로 과금되며 기본 예산이 모델에 따라 요청당 수만 토큰일 수 있다는 문단 캡처" />
	<figcaption>Claude Code Manage costs effectively 문서 캡처, 확인일 2026-10-15. 사고 토큰이 출력으로 과금된다는 점을 보여주지만, 요약 요청이 실제로 사고에 몇 토큰을 썼는지는 증명하지 않는다. 그 값은 메인 세션 로그에 남지 않아 재지 못했다.</figcaption>
</figure>

단가는 가격 문서의 백만 토큰당 값을 썼다. Opus 5.5는 캐시 읽기 $0.20, 출력 $20, 캐시 쓰기 5분 $5, 1시간 $8이고, Fable 5.1은 캐시 읽기 $0.25, 출력 $50, 캐시 쓰기 5분 $12.50, 1시간 $20이다. 요청당 절감은 압축 직전 크기와 압축 직후 바닥 80K의 차이를 캐시 읽기 단가로 곱했다. 압축 뒤에는 그 세션의 모든 요청이 그만큼 가볍게 간다. 압축 간격은 같은 세션에서 설정값 근처 압축 두 번 사이에 오간 요청 수의 중앙값이다. 모델은 그 사이 요청에서 가장 많이 쓴 모델로 정했다.

| 모델 · 임계 | 요청당 절감 | 압축 1회 비용 (5분 / 1시간 캐시) | 회수까지 요청 수 (5분 / 1시간 캐시) | 실측 압축 간격 중앙값 |
|---|---|---|---|---|
| Opus 5.5 · 500K | 약 $0.078 | 약 $0.63 / $0.76 | 약 8 / 10건 | 131건 |
| Opus 5.5 · 250K | 약 $0.028 | 약 $0.58 / $0.71 | 약 21 / 26건 | 45.5건 |
| Fable 5.1 · 500K | 약 $0.097 | 약 $1.45 / $1.80 | 약 15 / 19건 | 89건 |
| Fable 5.1 · 250K | 약 $0.035 | 약 $1.38 / $1.73 | 약 40 / 50건 | 53건 |

구독 요금제의 포함 사용량 안에서는 메인 대화의 기본 캐시가 1시간이므로 내 경우는 1시간 열이 맞다. API 단가로 계산하면 네 칸 중 세 칸은 다음 압축 전에 제 값을 회수하는 셈이었다. Fable 5.1 · 250K는 다르다. 1시간 캐시 기준으로 회수에 약 50건이 들어 압축 간격 53건과 거의 같다. 요약 요청이 사고에 1만 토큰만 더 써도 회수에 약 65건이 들어 간격을 넘는다. 출력 단가는 높고 캐시 읽기는 싼 모델에서 임계를 낮게 잡으면 압축이 손해일 수 있다. 모델이 바뀌면 같은 임계라도 계산이 달라진다.

이 계산은 캐시가 살아 있을 때만 성립한다.

> [Prompt caching](https://code.claude.com/docs/en/prompt-caching): "After a break longer than the cache lifetime, there is no cache left to read, so the summarization request reprocesses the full history as uncached input."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-prompt-caching-cold-compact.png" alt="Claude Code Prompt caching 문서에서 캐시 수명보다 오래 쉬면 읽을 캐시가 없어 요약 요청이 대화 전체를 캐시 없이 다시 처리하며, 압축 다음 턴은 짧은 요약만 다시 캐시한다는 문단 캡처" />
	<figcaption>Claude Code Prompt caching 문서 캡처, 확인일 2026-10-15. 캐시가 식은 뒤의 압축이 대화 전체를 다시 처리한다는 설명을 보여주지만, 그런 압축이 내 로그에 몇 번 있었는지는 증명하지 않는다.</figcaption>
</figure>

오래 쉬었다 돌아온 세션에서 압축이 돌면 이 경우에 해당하고, 이 표보다 훨씬 비싸다. idle 압축이 캐시가 식기 직전을 노리는 것도 이 때문이다.

비용이 회수된다고 압축이 공짜인 것은 아니다. 남는 대가는 두 가지다. 하나는 앞에서 잰 대기다. 한 번에 중앙값 2분 가까이 걸렸고, 상위 10%는 3분을 넘었다. 다른 하나는 요약 손실이다.

> [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works): "Your requests and key code snippets are preserved; detailed instructions from early in the conversation may be lost."

<figure>
	<img src="/blog/blog-images/official-docs/claude-code-autocompact-window/claude-code-context-may-be-lost.png" alt="How Claude Code works 문서에서 컨텍스트가 차면 오래된 도구 출력부터 지우고 대화를 요약하며 요청과 핵심 코드는 남지만 앞쪽의 자세한 지시는 사라질 수 있다는 문단 캡처" />
	<figcaption>How Claude Code works 문서 캡처, 확인일 2026-10-15. 압축에서 무엇이 빠질 수 있는지 보여주지만, 빠진 정보가 작업 품질을 얼마나 떨어뜨리는지는 증명하지 않는다.</figcaption>
</figure>

이 글의 데이터로는 요약 손실을 재지 못했다. 압축 뒤 같은 파일을 다시 읽었는지, 이미 정한 것을 다시 물었는지 같은 흔적을 세면 일부는 볼 수 있겠지만 이번에는 하지 않았다. 임계를 정할 때 가장 무거운 변수가 가장 덜 측정된 채로 남아 있다.

## 대안과 내가 고른 것

압축 임계를 낮추는 것 말고도 쌓인 대화를 덜어 내는 방법이 있다. 어느 쪽이 맞는지는 세션을 어떻게 쓰는지에 달렸다.

- **기본값 그대로 둔다.** 한 작업을 오래 붙잡고 앞쪽 맥락을 끝까지 잃고 싶지 않을 때 맞다. 대신 대화가 길어질수록 요청 한 번이 무거워지고, 한도나 비용이 빨리 찬다. 자리를 오래 비우면 idle 압축은 여전히 돌 수 있다.
- **임계를 낮춘다.** 세션을 하루 종일 열어 두고 여러 일을 이어서 하는 사람에게 효과가 크다. 위 근사로는 500K만 해도 처리량이 기본값의 64%였다. 대신 압축이 잦아지고, 압축할 때마다 기다려야 하고, 요약에서 무엇이 빠질지 고를 수 없다.
- **작업 경계에서 직접 `/compact`를 쓴다.** 한 작업이 끝나고 다음 작업이 이어질 때 쓰면 요약 시점을 내가 고를 수 있고, 요약에 남길 초점도 줄 수 있다. 내 로그에는 이 방법을 쓴 기록이 없어서 효과는 재지 않았다.
- **무관한 일로 넘어갈 때 `/clear`로 새로 시작한다.** 이전 대화가 필요 없다면 가장 싸다. 위 문서 인용대로 비용이 들지 않는다. 다만 이어서 해야 할 맥락이 있으면 그 맥락을 따로 적어 둬야 한다.

나는 400K에서 시작했다. 3주 뒤 압축 비용이 처리량에 비해 작다는 계산을 근거로 250K로 낮췄다. 200K는 압축이 너무 자주 걸릴 것 같아 한 단계 위를 골랐다. 9월 하순 기본 모델을 Opus 5.5로 바꾼 뒤에는 상한을 450~500K로 올리는 안을 검토했다. 단가를 비교해 보니 출력은 Fable 5.1보다 60% 쌌지만 캐시 읽기는 20%만 쌌다. 상한을 두 배로 올리면 요청 한 번의 값도 커진다는 계산이 나와서 350K로 한 단계만 올렸다. 다음 날 500K로 한 번 더 올렸는데, 이때는 비교 데이터를 모으기 전에 정했다.

이번 근사로 보면 500K는 기본값보다 처리량을 3분의 1 넘게 줄이면서, 같은 Opus 5.5에서 압축 간격이 250K의 약 2.9배다. 지금 기준으로는 납득할 만한 자리지만, 요약 손실을 재지 않은 상태의 판단이다.

## 직접 재 보는 방법

스크립트는 Python 3 표준 라이브러리만 쓴다. 자기 로그를 읽어 요청 수, 컨텍스트 분포, 압축 분포, 임계별 근사를 출력한다. 대화 내용이나 세션 ID, 경로는 출력하지 않는다. 설정을 언제 바꿨는지는 로그에 남지 않으므로, 이 글의 설정별 표와 같은 모델 비교, 손익분기는 자기 설정 이력과 맞춰 직접 나눠야 한다.

1. [compact_report.py](/blog/blog-examples/autocompact/compact_report.py)와 [make_fixture.py](/blog/blog-examples/autocompact/make_fixture.py)를 받는다. 먼저 합성 로그 세 개를 만들어 돌려 보고, 출력이 [expected-output.txt](/blog/blog-examples/autocompact/expected-output.txt)와 같은지 확인한다. 합성 로그에는 임계 압축 세션, 압축 없는 세션, idle 압축 세션이 하나씩 들어 있다.

```bash
python3 make_fixture.py ./fixture-logs
python3 compact_report.py ./fixture-logs --sweep 300000,500000,1000000 > out.txt
diff out.txt expected-output.txt && echo "같음"
```

2. 자기 로그로 돌린다. 인자를 주지 않으면 `~/.claude/projects` 아래의 메인 세션 로그를 읽는다. 지금 쓰고 있는 세션도 로그가 계속 늘어나므로, 같은 숫자를 다시 내려면 `--until`로 끝을 고정한다. `--since`와 `--until`은 오프셋 없이 주면 UTC로 읽고, `2026-10-15T15:00+09:00`처럼 오프셋을 붙이면 그 시각으로 읽는다. 임계 값은 `500000`과 `500k`를 모두 받는다.

```bash
python3 compact_report.py
python3 compact_report.py ~/.claude/projects --since 2026-10-01 --until 2026-10-15T06:00 --sweep 250000,400000,500000,1000000
```

3. 출력에서 다음 순서로 본다.
   - "usage가 있는 로그 줄"과 "요청"의 차이를 확인한다. 줄 수를 그대로 세는 집계를 쓰고 있었다면 그 배수만큼 틀렸던 것이다.
   - "압축: 0건"이면 그 기간에 압축 지점에 한 번도 닿지 않았거나 자동 압축이 꺼져 있던 것이다. 임계를 정하지 않았다면 시뮬레이션 표의 가장 큰 임계 행이 지금 상태에 가깝다.
   - 압축이 있다면 "압축 직전 크기" 묶음을 자기 설정과 대조한다. 설정값보다 약 3만 토큰 앞에 몰려 있지 않다면 `--offset`으로 차이를 바꿔 다시 돌린다. "idle 압축 안내가 함께 남은 압축"은 크기 기준이 아니라서, 스크립트가 크기 분포 · 간격 · 압축 뒤 바닥 계산에서 뺀다.
   - "압축 직후 첫 요청의 실제 컨텍스트"가 압축 뒤의 바닥이다. 이 값이 크면 임계를 낮춰도 절감이 작다.
   - 시뮬레이션 표는 근사다. 처리량 비율과 압축 횟수를 함께 보고, 자기가 몇 번의 대기를 감수할지로 판단한다.

시뮬레이션의 가장 큰 임계는 모델의 컨텍스트 창으로 둔다. 200K 창 모델이라면 `--sweep 150000,200000`처럼 준다. 압축 지점(임계에서 3만 3천을 뺀 값)이 압축 직후 바닥보다 낮은 임계는 계산이 성립하지 않아서, 스크립트가 건너뛰고 그렇게 알려 준다. 내 바닥 80K라면 100K는 건너뛴다. 로그가 오래 남지 않을 수도 있다. Claude Code는 `cleanupPeriodDays` 설정에 따라 오래된 세션 로그를 지우고, 문서상 기본값은 30일이다. 길게 비교하려면 이 값을 먼저 확인한다.

## 확인 범위와 한계

이 글의 숫자는 한 사람이 7주 동안 쓴 로그에서 나왔다. 세션을 오래 열어 두고, 지시문과 도구가 많아 압축 뒤에도 다시 실리는 몫이 큰 환경이다. 그 몫과 압축 소요 시간은 환경과 모델에 따라 다를 것이다.

임계별 비교는 실험이 아니라 시기별 관찰이다. 기간마다 모델과 작업이 달랐다. 같은 모델끼리 묶었지만 작업 내용은 통제하지 못했다. 시뮬레이션은 압축이 대화의 흐름을 바꾸지 않는다고 가정하고, idle 압축을 넣지 않았다. 실제로는 압축 뒤에 맥락을 다시 읽거나 같은 질문을 다시 하면서 요청이 늘었을 수 있다.

압축이 설정값보다 약 3만 토큰 앞에서 도는 이유와 정확한 계산식은 확인하지 않았다. 9월 22일 22건에서 컨텍스트가 한 번에 두 배가 된 원인도 찾지 못했다. idle 압축은 안내 문구로만 가렸기 때문에, 그 안내를 남기지 않는 버전에서 일어난 idle 압축이 있었다면 크기 기준 압축으로 섞였을 수 있다.

손익분기는 API 단가로 계산했다. 요약 출력의 크기는 압축 직후 크기의 중앙값으로 잡았는데, 요약 요청이 사고에 쓴 토큰은 재지 못해 실제 출력은 이보다 클 수 있다. 압축 뒤 캐시 쓰기는 압축 직후 첫 요청의 실측 중앙값으로 넣었고, 캐시가 살아 있는 경우만 계산했다. 구독 요금제의 한도가 토큰 종류별로 어떻게 차감되는지는 확인하지 못했다. 요약 손실은 재지 않았다.

8월 28일 무렵의 수치는 그때 남긴 기록을 옮긴 것이다. 637K까지 압축 0회, 로그 408개에 압축 기록 0건, 설정 변경 뒤 528,954에서 571,303까지 압축이 없었다는 관찰이 여기에 해당하고, 원본 로그는 지금 남아 있지 않다.

## 결론

1M 컨텍스트 모델에서 크기 기준 자동 압축은 임계를 정하지 않으면 약 967K, 창이 거의 찰 때 돈다. 대화형 터미널에서 20만 토큰을 넘긴 대화를 1시간 캐시(구독 요금제의 기본)로 쓰다가 54분쯤 비우면, 그 전에 idle 압축이 돌 수 있다. 임계를 정하면 압축은 그 값보다 약 3만 토큰 앞에서 돌았고, 설정 파일을 고친 값은 새로 연 세션부터 적용됐다.

임계를 낮추면 요청 한 번의 무게가 줄고, API 단가로 계산하면 압축 비용도 대체로 다음 압축 전에 회수되는 셈이었다. 다만 출력 단가가 높은 모델에서 임계를 낮게 잡으면 회수가 경계에 걸린다. 내주는 것은 압축할 때마다 기다리는 2분 안팎과 요약에서 빠지는 맥락이다. 근사로 보면 임계를 낮출수록 압축 한 번이 줄여 주는 몫은 작아진다. 그래서 임계는 자기 로그에서 세 가지를 보고 정하는 것이 맞다고 본다. 압축 직후 바닥이 얼마인지, 압축 사이에 요청이 몇 번 오가는지, 그 간격의 대기를 몇 번까지 감수할 수 있는지다.

## 확인 기준

- Claude Code 문서: [Model configuration](https://code.claude.com/docs/en/model-config), [All settings](https://code.claude.com/docs/en/settings-reference), [Environment variables](https://code.claude.com/docs/en/env-vars), [Settings files and precedence](https://code.claude.com/docs/en/settings), [Commands](https://code.claude.com/docs/en/commands), [Manage costs effectively](https://code.claude.com/docs/en/costs), [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works), [Context window](https://code.claude.com/docs/en/context-window), [Prompt caching](https://code.claude.com/docs/en/prompt-caching)
- Claude 문서: [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- 공식 문서 확인·캡처일: 2026-10-15. 문서는 확인 시점의 최신판이고, 로컬 설치 버전은 2.1.290이다
- 로그 집계: 2026-08-26~10-15 15:21(KST) 메인 세션 로그 419개, 요청 39,623건, 자동 압축 300건(2026-09-03~10-15), Claude Code 2.1.234~2.1.290. 2026-10-15에 다시 집계
- 공개 실행 자산: [autocompact 예제 폴더의 compact_report.py](/blog/blog-examples/autocompact/compact_report.py)와 같은 폴더의 fixture 생성기·예상 출력
