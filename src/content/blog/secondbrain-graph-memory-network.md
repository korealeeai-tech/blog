---
title: "SecondBrain Graph는 목록 검색보다 언제 도움이 될까"
description: "합성 node·edge 데이터에서 직접 tag 검색과 1-hop graph 확장을 실행해 후보 범위 차이, stale edge 위험, source gate가 필요한 이유를 비교합니다."
pubDate: 2026-06-29T18:45:00+09:00
updatedDate: 2026-07-21T16:42:37+09:00
category: "secondbrain"
heroImage: "../../assets/blog/secondbrain-graph-overview-redacted.png"
---

기억을 Graph로 연결하면 의도를 더 잘 찾을 수 있다는 말은 그럴듯하다. 하지만 node와 edge가 많다는 사실만으로 list보다 좋은 retrieval이 되는 것은 아니다. 관계가 틀렸거나 오래됐다면 Graph는 관련 없는 기억까지 자신 있게 끌어올 수 있다.

그래서 질문을 좁혔다. **직접 tag가 맞는 항목만 찾는 list filter와, 그 항목에서 관계를 한 단계 확장하는 Graph는 같은 query에서 무엇을 다르게 회수하는가?** 그리고 확장된 후보 중 무엇을 버려야 하는가?

아래 예제는 공개 설명용으로 만든 5개 node와 3개 edge를 사용한다. 실제 개인 memory, 원문 경로, 업무 이름, 내부 Graph data는 포함하지 않는다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-graph-overview-redacted.png" alt="식별 가능한 문구 없이 node와 edge의 연결 구조만 남긴 Graph 화면" />
	<figcaption>이 캡처는 node 연결 형태만 보여준다. 연결이 정확하거나 Graph retrieval이 실제 작업 품질을 높인다는 증거는 아니다.</figcaption>
</figure>

## 비교할 세 가지 retrieval 방식

기억을 회수하는 방식은 Graph 하나만 있는 것이 아니다.

### 날짜순 log

최근 기록을 다시 읽는 가장 단순한 방식이다. 어떤 일이 언제 있었는지 추적하기 쉽고, 새로운 구조를 유지할 비용이 적다. 대신 같은 기준이 여러 날짜에 흩어져 있으면 현재 query와 연결되는 항목을 사람이 다시 묶어야 한다.

### tag와 filter

각 기억에 `publication`, `validation`, `safety` 같은 tag를 붙이고 query tag가 직접 일치하는 항목을 찾는다. 구현과 설명이 단순하고, 잘못된 관계가 전파되는 범위가 작다. 반면 다른 tag를 가진 관련 위험이나 필수 검증은 직접 match하지 않으면 빠질 수 있다.

### Graph expansion

직접 match한 seed에서 `requires`, `protects_against`, `guided_by` 같은 edge를 따라 관련 후보를 확장한다. seed의 tag와 다른 항목도 관계를 통해 회수할 수 있다. 대신 오래된 edge, 근거 없는 관계, 과도하게 연결된 hub가 noise를 늘린다.

Graph가 유리하려면 “더 많이 찾음”이 아니라 “직접 검색에서 놓칠 관련 후보를 회수하고, 위험한 후보는 gate에서 버림”이 함께 성립해야 한다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-graph-log-vs-network.png" alt="날짜순 log와 관계 기반 memory network의 retrieval 차이를 보여주는 합성 다이어그램" />
	<figcaption>날짜순 log는 시간 흐름을, Graph는 관계 확장을 돕는다. 어느 쪽이 더 낫다는 결론은 query와 유지 비용에 따라 달라진다.</figcaption>
</figure>

## 최소 데이터 계약

합성 예제의 node는 네 필드만 가진다.

```js
{
  id: "rule:build-output",
  tags: ["validation"],
  freshness: "current",
  source_status: "verified"
}
```

edge는 출발점, 도착점, 관계를 가진다.

```js
{
  from: "workflow:public-release",
  to: "rule:build-output",
  relation: "requires",
  freshness: "current",
  source_status: "verified"
}
```

node와 edge 양쪽의 `freshness`와 `source_status`가 중요하다. 현재 node끼리 연결돼 있어도 relation 자체가 오래됐거나 근거가 없다면 그 경로를 판단에 쓰면 안 되기 때문이다. 관계는 retrieval candidate를 만드는 신호이고, node와 edge가 모두 현재성·근거 gate를 통과해야 실제 판단 후보가 된다.

## 같은 query를 list와 Graph에 넣는다

실행 예제는 [graph-retrieval.mjs](/blog/blog-examples/graph-retrieval.mjs)에 있다.

```bash
node public/blog-examples/graph-retrieval.mjs
```

query tag는 `publication`이다. 직접 tag filter 결과는 하나다.

```json
{
  "direct": ["workflow:public-release"]
}
```

그 seed에서 1-hop을 확장하면 세 후보가 나온다.

```json
{
  "expanded": [
    "preference:old-short-report",
    "risk:image-metadata",
    "rule:build-output"
  ]
}
```

`risk:image-metadata`와 `rule:build-output`은 직접 `publication` tag를 갖지 않는다. 하지만 공개 workflow가 요구하는 검증과 방어할 위험으로 연결되어 있어 Graph가 추가로 회수했다.

이것이 이 fixture에서 관계 확장이 만든 직접적인 차이다. query의 표면 단어와 다르지만 seed와 의미 있는 관계를 가진 후보를 찾는다. 다만 5개 node를 의도적으로 배치한 예제이므로 실제 query 집합의 recall 향상을 측정한 결과는 아니다.

## 더 많이 찾은 결과에는 실패도 포함된다

세 번째 후보 `preference:old-short-report` node 자체는 current·verified지만, seed와 잇는 `guided_by` edge가 `freshness: stale`, `source_status: unverified`다. 과거에는 짧은 완료 보고를 선호했다는 관계가 등록됐다는 가정이지만, 그 연결을 현재도 적용할 근거가 없다.

gate를 적용하면 결과가 갈린다.

```json
{
  "accepted": [
    "risk:image-metadata",
    "rule:build-output"
  ],
  "rejected": [
    "preference:old-short-report"
  ],
  "rejection_reasons": {
    "preference:old-short-report": [
      "edge:freshness",
      "edge:source_status"
    ]
  }
}
```

Graph expansion만 보고 세 후보를 모두 prompt에 넣었다면, 오래된 relation이 현재 node를 답변 전략에 끌어들일 수 있었다. list filter는 두 관련 후보를 놓쳤지만 stale edge를 따라간 후보도 끌어오지 않았다.

따라서 이 합성 결과는 Graph가 list보다 항상 낫다는 증거가 아니다. Graph는 **관계 기반 candidate coverage를 늘리는 대신 stale relation noise도 늘릴 수 있다**는 양면을 보여준다.

## 1-hop에서 멈추는 이유

edge를 여러 단계 따라가면 더 많은 후보를 찾는다. 동시에 query와의 거리는 멀어진다.

예를 들어 public release → image metadata risk → image tool → editor preference까지 세 단계를 확장하면, 처음 query와 약하게 관련된 항목이 계속 늘어날 수 있다. 고차수 hub가 있으면 거의 모든 기억이 후보가 된다.

초기 구현에서는 다음 제한이 유용하다.

- 직접 match를 seed로 고정한다.
- 1-hop만 확장한다.
- 허용할 relation type을 제한한다.
- current·verified gate를 적용한다.
- 채택·거절 이유를 결과에 남긴다.
- 회수 후보 수 상한을 둔다.

2-hop 이상이 필요하다면 실제 query set에서 relevant candidate가 늘어나는지와 noise가 얼마나 늘어나는지 따로 평가해야 한다. 단순히 Graph가 크다는 이유로 traversal 깊이를 늘리지 않는다.

## 세 방식의 trade-off

| 방식 | 강점 | 주요 위험 | 적합한 상황 |
|---|---|---|---|
| 날짜순 log | provenance와 시간 흐름이 선명함 | 같은 기준이 여러 기록에 흩어짐 | 사건 회고, 최근 변경 추적 |
| tag/filter | 단순하고 설명 가능함 | 다른 tag의 관련 후보를 놓침 | 작은 memory set, 명확한 분류 |
| Graph expansion | 관계를 통해 숨은 후보 회수 | stale edge, hub noise, 유지 비용 | 관계가 반복 query에 실제 가치가 있을 때 |

실무에서는 셋 중 하나만 선택할 필요가 없다. log는 source provenance를 보존하고, tag는 직접 retrieval을 제공하며, Graph는 제한된 관계 확장에 쓸 수 있다. Graph node가 원문 근거를 대체하면 안 되는 이유도 여기에 있다. 원문과 최신 상태는 log나 source에서 다시 확인해야 한다.

## Graph가 source proof가 아닌 이유

Graph에 `rule:build-output` node가 있다고 해서 현재 프로젝트가 실제로 build됐다는 뜻은 아니다. 그 node는 “이 workflow에서 build 결과를 확인해야 한다”는 기준을 회수했을 뿐이다.

<figure>
	<img src="/blog/blog-images/secondbrain/secondbrain-graph-proof-boundary.png" alt="Graph 신호가 현재 source 확인과 검증을 거쳐 판단으로 이어지는 합성 흐름" />
	<figcaption>Graph는 확인할 기준을 찾는 탐색 지도다. 현재 파일, 공식 문서, 실행 결과를 대신하는 proof가 아니다.</figcaption>
</figure>

안전한 흐름은 다음과 같다.

```text
현재 요청
→ 직접 match seed
→ 제한된 관계 확장
→ freshness/source gate
→ 현재 source와 실행 결과 확인
→ 판단과 한계 기록
```

Graph가 반환한 문장을 바로 사실로 쓰면 memory의 stale 문제를 retrieval 단계에서 판단 단계로 그대로 옮길 뿐이다.

## 공개할 때 지켜야 할 경계

실제 개인화 Graph에는 node 이름, 원문 경로, 작업 제목, 계정, 시간 정보가 들어갈 수 있다. blur한 전체 화면보다 합성 node와 edge를 먼저 쓰는 편이 안전하다.

실제 화면이 꼭 필요하다면 원본 크기에서 문구를 확인하고, 구조 설명에 필요하지 않은 panel은 crop한다. blur 뒤에도 글자 길이와 위치로 맥락을 유추할 수 있으면 redaction이나 합성 diagram으로 바꾼다. 이 글의 실행 결과도 실제 Graph export가 아니라 5개 합성 node로 만들었다.

## 결론

SecondBrain Graph가 list보다 도움이 되는 지점은 직접 tag가 다른 관련 기준을 관계로 회수할 때다. 이 예제에서는 `publication` seed에서 build 검증과 image metadata 위험을 추가로 찾았다.

동시에 current·verified node가 오래되고 검증되지 않은 relation을 통해 같이 확장됐다. node와 edge 양쪽의 freshness·source gate가 없으면 Graph의 넓은 후보 범위는 더 많은 오판 후보가 된다.

그래서 Graph 도입 조건은 “기억이 많아졌다”가 아니다. 직접 filter가 반복해서 놓치는 관계가 있고, 그 관계를 유지할 근거와 stale gate가 있으며, 채택·거절 결과를 검토할 수 있어야 한다. 그 조건이 없다면 단순한 log와 tag가 더 싸고 더 설명 가능한 선택일 수 있다.

## 확인 범위와 한계

- 합성 retrieval example은 Node.js v22.12.0에서 실행해 direct 1개, expanded 3개, accepted 2개, rejected 1개를 확인했다.
- 이 결과는 5개 node의 deterministic 예제이며 실제 retrieval precision·recall이나 업무 품질을 측정하지 않았다.
- 실제 Graph 구조와 화면은 source proof로 사용하지 않았고, 공개 예제에는 실제 개인 memory나 내부 경로가 없다.
- 대규모 Graph의 traversal 비용, relation 학습, embedding 검색 결합은 이 글에서 검증하지 않았다.
