const tasks = [
	{ id: 'T01', label: '오탈자 한 글자 수정', failure_cost: 0, ambiguity: 0, dependencies: 0, verification_gap: 1 },
	{ id: 'T02', label: '파일 존재 여부 확인', failure_cost: 1, ambiguity: 0, dependencies: 0, verification_gap: 1 },
	{ id: 'T03', label: '정해진 형식의 제목 수정', failure_cost: 0, ambiguity: 1, dependencies: 0, verification_gap: 1 },
	{ id: 'T04', label: '단일 파일 구조 보완', failure_cost: 1, ambiguity: 1, dependencies: 1, verification_gap: 1 },
	{ id: 'T05', label: '최신 문서에 맞춘 안내 수정', failure_cost: 1, ambiguity: 1, dependencies: 0, verification_gap: 2 },
	{ id: 'T06', label: '작은 API 계약 변경', failure_cost: 1, ambiguity: 1, dependencies: 2, verification_gap: 1 },
	{ id: 'T07', label: '재현되지 않는 테스트 실패 진단', failure_cost: 1, ambiguity: 2, dependencies: 1, verification_gap: 1 },
	{ id: 'T08', label: '보안 경계 검토', failure_cost: 2, ambiguity: 2, dependencies: 2, verification_gap: 2 },
	{ id: 'T09', label: '운영 데이터 삭제 계획', failure_cost: 2, ambiguity: 1, dependencies: 1, verification_gap: 2 },
	{ id: 'T10', label: '여러 저장소 설정 이전', failure_cost: 2, ambiguity: 2, dependencies: 2, verification_gap: 1 },
];

function riskBased(score) {
	if (score <= 2) return 'low';
	if (score <= 5) return 'medium';
	return 'high';
}

const routedTasks = tasks.map((task) => {
	const score = task.failure_cost + task.ambiguity + task.dependencies + task.verification_gap;
	return {
		...task,
		score,
		policies: {
			always_high: 'high',
			always_low: 'low',
			risk_based: riskBased(score),
		},
	};
});

function summarize(policy) {
	const counts = { low: 0, medium: 0, high: 0 };
	for (const task of routedTasks) counts[task.policies[policy]] += 1;
	return counts;
}

console.log(JSON.stringify({
	simulation_only: true,
	score_definition: 'failure_cost + ambiguity + dependencies + verification_gap',
	tasks: routedTasks,
	summary: {
		always_high: summarize('always_high'),
		always_low: summarize('always_low'),
		risk_based: summarize('risk_based'),
	},
}, null, 2));
