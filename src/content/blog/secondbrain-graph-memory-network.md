---
title: "SecondBrain Graph: 기억을 연결해야 의도가 보인다"
description: "SecondBrain Graph를 통해 기억을 날짜순 로그가 아니라 선호, 검증 기준, 위험, 맥락의 관계망으로 보는 방식을 정리합니다."
pubDate: 2026-06-29T18:45:00+09:00
category: "secondbrain"
heroImage: "../../assets/blog/secondbrain-graph-overview-redacted.png"
---

SecondBrain을 의도 라이브러리로 본다면, 다음 질문은 자연스럽다.

그 라이브러리는 어떻게 보여야 할까?

단순히 날짜순으로 쌓인 기록 목록이라면 AI가 다시 읽기 어렵다. 언제 어떤 일이 있었는지는 알 수 있지만, 어떤 기준이 반복됐고 어떤 위험이 다시 등장했는지 바로 보이지 않는다. 그래서 나는 SecondBrain을 Graph로 보는 방식이 필요하다고 생각한다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-graph-overview-redacted.png" alt="SecondBrain Graph 실제 화면에서 민감한 좌우 패널을 블러 처리하고 중앙 노드 연결 구조만 보여주는 캡처" />
	<figcaption>실제 Graph 화면은 구조를 보여주되, 내부 지식 이름과 원문 경로가 노출될 수 있는 영역은 블러 처리했다.</figcaption>
</figure>

## 로그는 쌓이고, 그래프는 연결한다

날짜순 로그는 작업을 보존하는 데 좋다. 하지만 의도를 이해하기에는 부족하다.

예를 들어 어떤 사용자가 여러 번 "근거를 확인해줘", "추측하지 마", "검증 결과를 분리해줘"라고 말했다고 하자. 날짜순 로그에서는 이 말들이 서로 다른 날의 문장으로 흩어진다. 반면 Graph에서는 이 신호들을 하나의 검증 기준으로 묶을 수 있다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-graph-log-vs-network.png" alt="날짜순 로그는 작업 기록을 순서대로 쌓고, 연결된 기억은 선호, 검증, 위험, 맥락을 의도 중심으로 연결하는 비교 다이어그램" />
	<figcaption>SecondBrain Graph의 핵심은 더 많이 저장하는 것이 아니라 반복 기준을 연결하는 것이다.</figcaption>
</figure>

이 차이는 작아 보이지만 실제 작업에서는 크다. AI가 현재 요청을 받았을 때 "이전에 비슷한 말을 했는가"보다 "이번 요청과 연결되는 기준이 무엇인가"를 봐야 하기 때문이다.

## 노드는 기억이고, 엣지는 판단 경로다

Graph에서 중요한 것은 노드 개수가 아니다. 어떤 기준들이 어떤 관계로 연결되는지가 더 중요하다.

내가 생각하는 공개 가능한 Graph 모델은 대략 이런 구조다.

```js
const graph = {
	nodes: [
		{ id: "preference:korean-evidence", type: "preference", label: "한국어와 근거 중심 응답" },
		{ id: "rule:verify-before-done", type: "validation", label: "완료 전 검증 결과 분리" },
		{ id: "risk:path-guessing", type: "risk", label: "경로와 식별자 추측 금지" },
		{ id: "strategy:answer-with-limits", type: "strategy", label: "한계와 미확인 항목을 함께 답변" },
	],
	edges: [
		{ from: "preference:korean-evidence", to: "strategy:answer-with-limits", relation: "guides" },
		{ from: "rule:verify-before-done", to: "strategy:answer-with-limits", relation: "requires" },
		{ from: "risk:path-guessing", to: "rule:verify-before-done", relation: "protects" },
	],
};
```

이 코드는 실제 내부 데이터를 옮긴 것이 아니라 공개 설명용으로 단순화한 예시다. 그래도 방향은 분명하다. 기억은 문장 하나가 아니라, 선호와 검증 규칙과 위험 기준이 서로 연결된 구조로 다뤄져야 한다.

## Graph는 source proof가 아니다

여기서 조심해야 할 점이 있다. Graph가 어떤 기준을 보여준다고 해서 그것이 곧바로 결론이 되면 안 된다.

Graph는 "이 기준을 확인해봐야 한다"는 신호에 가깝다. 실제 판단은 현재 요청과 원문 근거를 다시 확인한 뒤에 해야 한다. 오래된 기억일 수 있고, 이번 작업에는 맞지 않을 수도 있기 때문이다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-graph-proof-boundary.png" alt="그래프 신호가 근거 확인, 판단 기준, 응답 전략으로 이어지며 연결은 힌트이고 결론은 근거 확인 뒤에만 낸다는 흐름 다이어그램" />
	<figcaption>Graph는 탐색 지도다. 결론을 대신 내는 장치가 아니다.</figcaption>
</figure>

그래서 Graph를 사용하는 흐름은 보통 이렇게 되어야 한다.

```js
function planWithGraph(currentRequest, graphHints) {
	const relatedCriteria = findRelatedCriteria(currentRequest, graphHints);
	const assumptions = relatedCriteria.map((item) => ({
		criterion: item,
		status: "확인 필요",
	}));

	return {
		nextStep: "현재 요청과 실제 근거로 기준이 맞는지 확인한다",
		assumptions,
		decisionBoundary: "근거 확인 전에는 결론으로 쓰지 않는다",
	};
}
```

이 흐름이 중요한 이유는 개인화 memory가 쉽게 과신으로 바뀔 수 있기 때문이다. "사용자는 항상 이렇게 원한다"라고 단정하는 순간 SecondBrain은 도움이 아니라 위험이 된다. 좋은 Graph는 단정하지 않는다. 대신 확인해야 할 기준을 빠르게 보여준다.

## 왜 시각화가 필요한가

SecondBrain이 커질수록 목록만으로는 현재 상태를 이해하기 어렵다. 어떤 기준이 너무 고립되어 있는지, 어떤 위험 기준이 여러 작업과 연결되어 있는지, 어떤 검증 규칙이 반복해서 강화됐는지 한눈에 보기 어렵다.

Graph 시각화는 이 문제를 줄인다.

- 고립된 기억을 찾을 수 있다.
- 반복해서 연결되는 핵심 기준을 볼 수 있다.
- 최근 바뀐 기억과 오래된 기억을 구분할 수 있다.
- 근거가 부족한 기준을 다시 검토할 수 있다.
- 작업 전에 어떤 기준을 먼저 확인해야 할지 정할 수 있다.

다만 Graph가 화려할수록 더 정확한 것은 아니다. 중요한 것은 보기 좋은 그림이 아니라, 사용자의 의도와 검증 기준을 안전하게 회수하는 것이다.

## 공개할 때는 더 강하게 가린다

SecondBrain Graph는 실제 개인화 memory와 연결되기 때문에 공개할 때 주의해야 한다. 노드 이름, 원문 경로, 작업 제목, 세부 로그에는 개인이나 조직, 비공개 업무 맥락을 유추할 수 있는 정보가 들어갈 수 있다.

그래서 실제 화면을 보여줄 때도 전체를 그대로 올리면 안 된다. 이 글의 캡처처럼 구조를 설명하는 데 필요한 중앙 Graph만 남기고, 구체적 노드명과 원문 패널은 블러 처리하는 편이 안전하다.

내가 공개하고 싶은 것은 내부 데이터가 아니라 구조다.

SecondBrain Graph는 기억을 더 많이 보여주는 화면이 아니다. AI가 현재 요청을 해석할 때 어떤 기준을 확인해야 하는지, 그 기준들이 서로 어떻게 연결되어 있는지 보여주는 탐색 지도다.

결국 좋은 SecondBrain Graph는 이렇게 말해야 한다.

"이 사용자는 이런 사람이다"가 아니라, "이번 작업 전에 이 기준들을 확인하라."
