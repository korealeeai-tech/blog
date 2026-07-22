import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { baseline, mutants, suites } from './mutation-testing-fixture.mjs';

function assertResultShape(result, context) {
	if (!result || typeof result !== 'object' || Array.isArray(result)) {
		throw new Error(`${context}: result must be an object`);
	}
	if (typeof result.approved !== 'boolean') {
		throw new Error(`${context}: result.approved must be boolean`);
	}
	if (!Array.isArray(result.reasons) || result.reasons.some((reason) => typeof reason !== 'string')) {
		throw new Error(`${context}: result.reasons must be an array of strings`);
	}
}

function assertImplementation(implementation, kind) {
	if (!implementation || typeof implementation !== 'object') {
		throw new Error(`${kind} must be an object`);
	}
	if (typeof implementation.id !== 'string' || implementation.id.length === 0) {
		throw new Error(`${kind} id must be a non-empty string`);
	}
	if (typeof implementation.execute !== 'function') {
		throw new Error(`${kind} ${implementation.id} must provide execute()`);
	}
}

export function validateExperiment(experiment) {
	assertImplementation(experiment?.baseline, 'baseline');

	if (!Array.isArray(experiment.mutants) || experiment.mutants.length === 0) {
		throw new Error('experiment requires at least one mutant');
	}

	const implementationIds = new Set([experiment.baseline.id]);
	for (const mutant of experiment.mutants) {
		assertImplementation(mutant, 'mutant');
		if (implementationIds.has(mutant.id)) {
			throw new Error(`duplicate mutant id: ${mutant.id}`);
		}
		implementationIds.add(mutant.id);
	}

	if (!experiment.suites || typeof experiment.suites !== 'object' || Array.isArray(experiment.suites)) {
		throw new Error('experiment.suites must be an object');
	}

	const suiteEntries = Object.entries(experiment.suites);
	if (suiteEntries.length === 0) {
		throw new Error('experiment requires at least one suite');
	}

	for (const [suiteName, tests] of suiteEntries) {
		if (!Array.isArray(tests) || tests.length === 0) {
			throw new Error(`suite ${suiteName} must contain at least one test`);
		}

		const testIds = new Set();
		for (const test of tests) {
			if (!test || typeof test !== 'object' || typeof test.id !== 'string' || test.id.length === 0) {
				throw new Error(`suite ${suiteName} contains a test without a valid id`);
			}
			if (testIds.has(test.id)) {
				throw new Error(`duplicate test id in suite ${suiteName}: ${test.id}`);
			}
			testIds.add(test.id);
			if (!test.input || typeof test.input !== 'object' || Array.isArray(test.input)) {
				throw new Error(`test ${test.id} input must be an object`);
			}
			assertResultShape(test.expected, `test ${test.id} expected`);

			let baselineResult;
			try {
				baselineResult = experiment.baseline.execute(test.input);
				assertResultShape(baselineResult, `baseline test ${test.id}`);
			} catch (error) {
				throw new Error(`baseline failed test ${test.id}: ${error.message}`);
			}

			if (!isDeepStrictEqual(baselineResult, test.expected)) {
				throw new Error(`baseline failed test ${test.id}: output mismatch`);
			}
		}
	}
}

function runMutantTest(mutant, test) {
	try {
		const actual = mutant.execute(test.input);
		assertResultShape(actual, `mutant ${mutant.id} test ${test.id}`);
		return isDeepStrictEqual(actual, test.expected);
	} catch {
		return false;
	}
}

export function evaluateSuite(experiment, suiteName) {
	validateExperiment(experiment);

	if (!Object.hasOwn(experiment.suites, suiteName)) {
		throw new Error(`Unknown suite: ${suiteName}`);
	}
	const tests = experiment.suites[suiteName];

	const killedIds = [];
	const survivedIds = [];

	for (const mutant of experiment.mutants) {
		const survived = tests.every((test) => runMutantTest(mutant, test));
		if (survived) {
			survivedIds.push(mutant.id);
		} else {
			killedIds.push(mutant.id);
		}
	}

	killedIds.sort();
	survivedIds.sort();
	const mutationScore = Number(((killedIds.length / experiment.mutants.length) * 100).toFixed(1));

	return {
		test_count: tests.length,
		killed: killedIds.length,
		survived: survivedIds.length,
		mutation_score: mutationScore,
		killed_ids: killedIds,
		survived_ids: survivedIds,
	};
}

export function runExperiment(experiment, suiteName) {
	validateExperiment(experiment);

	const selectedSuites = suiteName ? [suiteName] : Object.keys(experiment.suites);
	const results = {};
	for (const selectedSuite of selectedSuites) {
		results[selectedSuite] = evaluateSuite(experiment, selectedSuite);
	}

	return {
		synthetic_fixture: true,
		mutant_count: experiment.mutants.length,
		suites: results,
	};
}

function parseSuiteArgument(argumentsList) {
	if (argumentsList.length === 0) {
		return undefined;
	}
	if (argumentsList.length !== 2 || argumentsList[0] !== '--suite' || !argumentsList[1]) {
		throw new Error('Usage: node run-mutation-score.mjs [--suite weak|strengthened|diagnostic]');
	}
	return argumentsList[1];
}

function main() {
	try {
		const suiteName = parseSuiteArgument(process.argv.slice(2));
		const output = runExperiment({ baseline, mutants, suites }, suiteName);
		process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}

const invokedUrl = process.argv[1]
	? pathToFileURL(path.resolve(process.argv[1])).href
	: undefined;

if (import.meta.url === invokedUrl) {
	main();
}
