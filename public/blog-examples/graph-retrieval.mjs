const nodes = [
	{ id: 'workflow:public-release', tags: ['publication'], freshness: 'current', source_status: 'verified' },
	{ id: 'rule:build-output', tags: ['validation'], freshness: 'current', source_status: 'verified' },
	{ id: 'risk:image-metadata', tags: ['safety'], freshness: 'current', source_status: 'verified' },
	{ id: 'preference:old-short-report', tags: ['style'], freshness: 'current', source_status: 'verified' },
	{ id: 'note:unrelated-editor-tip', tags: ['editor'], freshness: 'current', source_status: 'verified' },
];

const edges = [
	{ from: 'workflow:public-release', to: 'rule:build-output', relation: 'requires', freshness: 'current', source_status: 'verified' },
	{ from: 'workflow:public-release', to: 'risk:image-metadata', relation: 'protects_against', freshness: 'current', source_status: 'verified' },
	{ from: 'workflow:public-release', to: 'preference:old-short-report', relation: 'guided_by', freshness: 'stale', source_status: 'unverified' },
];

const queryTag = 'publication';
const direct = nodes.filter((node) => node.tags.includes(queryTag)).map((node) => node.id).sort();
const seedIds = new Set(direct);
const expandedIds = new Set();
const candidateEdges = new Map();

function addCandidate(nodeId, edge) {
	expandedIds.add(nodeId);
	const connectedEdges = candidateEdges.get(nodeId) ?? [];
	connectedEdges.push(edge);
	candidateEdges.set(nodeId, connectedEdges);
}

for (const edge of edges) {
	if (seedIds.has(edge.from)) addCandidate(edge.to, edge);
	if (seedIds.has(edge.to)) addCandidate(edge.from, edge);
}

const expandedNodes = nodes.filter((node) => expandedIds.has(node.id));
function rejectionReasons(node) {
	const reasons = [];
	if (node.freshness !== 'current') reasons.push('node:freshness');
	if (node.source_status !== 'verified') reasons.push('node:source_status');

	const connectedEdges = candidateEdges.get(node.id) ?? [];
	if (!connectedEdges.some((edge) => edge.freshness === 'current' && edge.source_status === 'verified')) {
		if (connectedEdges.every((edge) => edge.freshness !== 'current')) reasons.push('edge:freshness');
		if (connectedEdges.every((edge) => edge.source_status !== 'verified')) reasons.push('edge:source_status');
		if (!reasons.some((reason) => reason.startsWith('edge:'))) reasons.push('edge:combined_gate');
	}
	return reasons;
}

const evaluated = expandedNodes.map((node) => ({ node, reasons: rejectionReasons(node) }));
const accepted = evaluated
	.filter(({ reasons }) => reasons.length === 0)
	.map(({ node }) => node.id)
	.sort();
const rejected = evaluated
	.filter(({ reasons }) => reasons.length > 0)
	.map(({ node }) => node.id)
	.sort();
const rejectionReasonsByNode = Object.fromEntries(
	evaluated
		.filter(({ reasons }) => reasons.length > 0)
		.map(({ node, reasons }) => [node.id, reasons]),
);

console.log(JSON.stringify({
	synthetic_fixture: true,
	query_tag: queryTag,
	direct,
	expanded: [...expandedIds].sort(),
	accepted,
	rejected,
	rejection_reasons: rejectionReasonsByNode,
}, null, 2));
