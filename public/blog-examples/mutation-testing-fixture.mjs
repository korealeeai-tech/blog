function collectReasons(input, options = {}) {
	const reasons = [];

	if (!options.skipTestsCheck && input.testsPassed !== true) {
		reasons.push('tests_not_passed');
	}

	if (!options.skipRollbackCheck && input.rollbackReady !== true) {
		reasons.push('rollback_not_ready');
	}

	const invalidSecretCount = options.allowNegativeSecretCount
		? !Number.isInteger(input.exposedSecrets) || input.exposedSecrets > 0
		: !Number.isInteger(input.exposedSecrets) || input.exposedSecrets !== 0;
	if (invalidSecretCount) {
		reasons.push('secret_count_invalid');
	}

	let invalidChangedFiles;
	if (options.rejectUpperBoundary) {
		invalidChangedFiles = !Number.isInteger(input.changedFiles)
			|| input.changedFiles < 1
			|| input.changedFiles >= 5;
	} else if (options.allowZeroChanges) {
		invalidChangedFiles = !Number.isInteger(input.changedFiles)
			|| input.changedFiles < 0
			|| input.changedFiles > 5;
	} else if (options.allowFractionalChanges) {
		invalidChangedFiles = input.changedFiles < 1 || input.changedFiles > 5;
	} else {
		invalidChangedFiles = !Number.isInteger(input.changedFiles)
			|| input.changedFiles < 1
			|| input.changedFiles > 5;
	}

	if (invalidChangedFiles) {
		reasons.push('scope_invalid');
	}

	return reasons;
}

export function assessRelease(input) {
	const reasons = collectReasons(input);
	return { approved: reasons.length === 0, reasons };
}

function assessWithoutTestsCheck(input) {
	const reasons = collectReasons(input, { skipTestsCheck: true });
	return { approved: reasons.length === 0, reasons };
}

function assessWithoutRollbackCheck(input) {
	const reasons = collectReasons(input, { skipRollbackCheck: true });
	return { approved: reasons.length === 0, reasons };
}

function assessAllowingNegativeSecretCount(input) {
	const reasons = collectReasons(input, { allowNegativeSecretCount: true });
	return { approved: reasons.length === 0, reasons };
}

function assessRejectingUpperBoundary(input) {
	const reasons = collectReasons(input, { rejectUpperBoundary: true });
	return { approved: reasons.length === 0, reasons };
}

function assessAllowingZeroChanges(input) {
	const reasons = collectReasons(input, { allowZeroChanges: true });
	return { approved: reasons.length === 0, reasons };
}

function assessAllowingFractionalChanges(input) {
	const reasons = collectReasons(input, { allowFractionalChanges: true });
	return { approved: reasons.length === 0, reasons };
}

function assessApprovingOneFailure(input) {
	const reasons = collectReasons(input);
	return { approved: reasons.length <= 1, reasons };
}

function assessTruncatingMultipleReasons(input) {
	const reasons = collectReasons(input);
	return {
		approved: reasons.length === 0,
		reasons: reasons.slice(0, 1),
	};
}

const validInput = Object.freeze({
	testsPassed: true,
	rollbackReady: true,
	exposedSecrets: 0,
	changedFiles: 2,
});

function defineTest(id, input, expected) {
	return Object.freeze({
		id,
		input: Object.freeze({ ...input }),
		expected: Object.freeze({
			approved: expected.approved,
			reasons: Object.freeze([...expected.reasons]),
		}),
	});
}

const allTests = Object.freeze([
	defineTest('valid-reference', validInput, { approved: true, reasons: [] }),
	defineTest(
		'tests-failed',
		{ ...validInput, testsPassed: false },
		{ approved: false, reasons: ['tests_not_passed'] },
	),
	defineTest(
		'rollback-missing',
		{ ...validInput, rollbackReady: false },
		{ approved: false, reasons: ['rollback_not_ready'] },
	),
	defineTest(
		'negative-secret-count',
		{ ...validInput, exposedSecrets: -1 },
		{ approved: false, reasons: ['secret_count_invalid'] },
	),
	defineTest(
		'upper-boundary-five',
		{ ...validInput, changedFiles: 5 },
		{ approved: true, reasons: [] },
	),
	defineTest(
		'zero-changed-files',
		{ ...validInput, changedFiles: 0 },
		{ approved: false, reasons: ['scope_invalid'] },
	),
	defineTest(
		'fractional-changed-files',
		{ ...validInput, changedFiles: 1.5 },
		{ approved: false, reasons: ['scope_invalid'] },
	),
	defineTest(
		'combined-four-failures',
		{
			testsPassed: false,
			rollbackReady: false,
			exposedSecrets: 1,
			changedFiles: 0,
		},
		{
			approved: false,
			reasons: [
				'tests_not_passed',
				'rollback_not_ready',
				'secret_count_invalid',
				'scope_invalid',
			],
		},
	),
]);

export const baseline = Object.freeze({
	id: 'baseline',
	description: 'All four release conditions and complete reason output',
	execute: assessRelease,
});

export const mutants = Object.freeze([
	Object.freeze({
		id: 'skip-tests-check',
		description: 'Removes the testsPassed condition',
		execute: assessWithoutTestsCheck,
	}),
	Object.freeze({
		id: 'skip-rollback-check',
		description: 'Removes the rollbackReady condition',
		execute: assessWithoutRollbackCheck,
	}),
	Object.freeze({
		id: 'allow-negative-secret-count',
		description: 'Treats negative exposedSecrets values as safe',
		execute: assessAllowingNegativeSecretCount,
	}),
	Object.freeze({
		id: 'reject-upper-boundary',
		description: 'Rejects changedFiles equal to the valid upper boundary',
		execute: assessRejectingUpperBoundary,
	}),
	Object.freeze({
		id: 'allow-zero-changes',
		description: 'Allows changedFiles equal to zero',
		execute: assessAllowingZeroChanges,
	}),
	Object.freeze({
		id: 'allow-fractional-changes',
		description: 'Drops the integer requirement for changedFiles',
		execute: assessAllowingFractionalChanges,
	}),
	Object.freeze({
		id: 'approve-one-failure',
		description: 'Approves an input with exactly one failure reason',
		execute: assessApprovingOneFailure,
	}),
	Object.freeze({
		id: 'truncate-multiple-reasons',
		description: 'Returns only the first failure reason',
		execute: assessTruncatingMultipleReasons,
	}),
]);

export const suites = Object.freeze({
	weak: Object.freeze(allTests.slice(0, 2)),
	strengthened: Object.freeze(allTests.slice(0, 7)),
	diagnostic: allTests,
});
