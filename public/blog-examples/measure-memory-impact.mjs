import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const conditions = ['memory_off', 'memory_on'];
const defaultDataset = fileURLToPath(new URL('./memory-impact-sample.json', import.meta.url));
const datasetPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultDataset;
const rows = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

if (!Array.isArray(rows) || rows.length === 0) {
	throw new Error('Dataset must be a non-empty JSON array.');
}

const pairs = new Map();
for (const row of rows) {
	if (typeof row.task_id !== 'string' || row.task_id.trim() === '' || !conditions.includes(row.condition)) {
		throw new Error('Each row needs a task_id and a supported condition.');
	}
	for (const field of ['repeated_instruction', 'required_checks', 'performed_checks', 'recovery_steps']) {
		if (!Number.isInteger(row[field]) || row[field] < 0) {
			throw new Error(`Invalid ${field}: ${row.task_id}/${row.condition}`);
		}
	}
	for (const field of ['known_risk', 'risk_recurred', 'override_error']) {
		if (typeof row[field] !== 'boolean') {
			throw new Error(`Invalid ${field}: ${row.task_id}/${row.condition}`);
		}
	}
	if (row.performed_checks > row.required_checks) {
		throw new Error(`Invalid check counts: ${row.task_id}/${row.condition}`);
	}
	if (row.risk_recurred && !row.known_risk) {
		throw new Error(`A risk cannot recur when no known risk exists: ${row.task_id}/${row.condition}`);
	}

	const pair = pairs.get(row.task_id) ?? new Map();
	if (pair.has(row.condition)) {
		throw new Error(`Duplicate condition in pair: ${row.task_id}/${row.condition}`);
	}
	pair.set(row.condition, row);
	pairs.set(row.task_id, pair);
}

for (const [taskId, pair] of pairs) {
	for (const condition of conditions) {
		if (!pair.has(condition)) {
			throw new Error(`Missing paired condition: ${taskId}/${condition}`);
		}
	}
}

function round1(value) {
	return Math.round(value * 10) / 10;
}

function percentageOrNull(numerator, denominator) {
	return denominator === 0 ? null : round1((numerator / denominator) * 100);
}

function deltaOrNull(after, before) {
	return after === null || before === null ? null : round1(after - before);
}

function median(values) {
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function summarize(condition) {
	const selected = rows.filter((row) => row.condition === condition);
	const requiredChecks = selected.reduce((sum, row) => sum + row.required_checks, 0);
	const performedChecks = selected.reduce((sum, row) => sum + row.performed_checks, 0);
	const knownRiskRows = selected.filter((row) => row.known_risk);
	const recurredRisks = knownRiskRows.filter((row) => row.risk_recurred).length;

	return {
		tasks: selected.length,
		repeated_instructions: selected.reduce((sum, row) => sum + row.repeated_instruction, 0),
		required_check_rate: percentageOrNull(performedChecks, requiredChecks),
		risk_recurrence_rate: percentageOrNull(recurredRisks, knownRiskRows.length),
		median_recovery_steps: median(selected.map((row) => row.recovery_steps)),
		override_errors: selected.filter((row) => row.override_error).length,
	};
}

const memoryOff = summarize('memory_off');
const memoryOn = summarize('memory_on');

console.log(JSON.stringify({
	synthetic_fixture: true,
	memory_off: memoryOff,
	memory_on: memoryOn,
	paired_delta: {
		repeated_instructions: memoryOn.repeated_instructions - memoryOff.repeated_instructions,
		required_check_rate_points: deltaOrNull(memoryOn.required_check_rate, memoryOff.required_check_rate),
		risk_recurrence_rate_points: deltaOrNull(memoryOn.risk_recurrence_rate, memoryOff.risk_recurrence_rate),
		median_recovery_steps: memoryOn.median_recovery_steps - memoryOff.median_recovery_steps,
		override_errors: memoryOn.override_errors - memoryOff.override_errors,
	},
}, null, 2));
