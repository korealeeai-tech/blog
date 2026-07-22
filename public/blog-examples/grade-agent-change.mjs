import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const datasetArgument = process.argv[2];

if (!datasetArgument) {
  console.error(
    "Usage: node grade-agent-change.mjs public/blog-examples/failure-to-eval-cases.json",
  );
  process.exit(2);
}

function isPlainObject(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype,
  );
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be a plain object`);
  }
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
}

function validateCase(candidateCase, index) {
  const label = `case ${index}`;
  requirePlainObject(candidateCase, label);

  if (typeof candidateCase.id !== "string" || candidateCase.id.trim() === "") {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (
    typeof candidateCase.description !== "string" ||
    candidateCase.description.trim() === ""
  ) {
    throw new Error(`${candidateCase.id}.description must be a non-empty string`);
  }

  requirePlainObject(candidateCase.task, `${candidateCase.id}.task`);
  requirePlainObject(candidateCase.task.before, `${candidateCase.id}.task.before`);
  requirePlainObject(
    candidateCase.task.requestedChange,
    `${candidateCase.id}.task.requestedChange`,
  );
  requireStringArray(
    candidateCase.task.protectedFields,
    `${candidateCase.id}.task.protectedFields`,
  );

  if (
    !Array.isArray(candidateCase.task.forbiddenStates) ||
    candidateCase.task.forbiddenStates.some(
      (state) =>
        !isPlainObject(state) ||
        typeof state.field !== "string" ||
        state.field.trim() === "" ||
        !Object.hasOwn(state, "value"),
    )
  ) {
    throw new Error(
      `${candidateCase.id}.task.forbiddenStates must contain field/value objects`,
    );
  }

  if (Object.keys(candidateCase.task.requestedChange).length === 0) {
    throw new Error(`${candidateCase.id}.task.requestedChange must not be empty`);
  }
  for (const field of candidateCase.task.protectedFields) {
    if (!Object.hasOwn(candidateCase.task.before, field)) {
      throw new Error(`${candidateCase.id}.task.before is missing protected field ${field}`);
    }
  }

  requirePlainObject(candidateCase.candidate, `${candidateCase.id}.candidate`);
  requirePlainObject(
    candidateCase.candidate.after,
    `${candidateCase.id}.candidate.after`,
  );
  requireStringArray(
    candidateCase.candidate.reportedChecks,
    `${candidateCase.id}.candidate.reportedChecks`,
  );
  requireStringArray(
    candidateCase.candidate.observedChecks,
    `${candidateCase.id}.candidate.observedChecks`,
  );

  requirePlainObject(candidateCase.expected, `${candidateCase.id}.expected`);
  if (typeof candidateCase.expected.expectedPass !== "boolean") {
    throw new Error(`${candidateCase.id}.expected.expectedPass must be boolean`);
  }
  requireStringArray(
    candidateCase.expected.expectedFailureCodes,
    `${candidateCase.id}.expected.expectedFailureCodes`,
  );
}

function validateDataset(dataset) {
  requirePlainObject(dataset, "dataset");
  if (dataset.syntheticFixture !== true) {
    throw new Error("dataset.syntheticFixture must be true");
  }
  if (!Array.isArray(dataset.cases) || dataset.cases.length === 0) {
    throw new Error("dataset.cases must be a non-empty array");
  }

  const ids = new Set();
  for (const [index, candidateCase] of dataset.cases.entries()) {
    validateCase(candidateCase, index);
    if (ids.has(candidateCase.id)) {
      throw new Error(`duplicate case id: ${candidateCase.id}`);
    }
    ids.add(candidateCase.id);
  }

  if (!dataset.cases.some((candidateCase) => candidateCase.expected.expectedPass)) {
    throw new Error("dataset requires at least one expected passing case");
  }
  if (!dataset.cases.some((candidateCase) => !candidateCase.expected.expectedPass)) {
    throw new Error("dataset requires at least one expected failing case");
  }
}

function gradeCase(candidateCase) {
  const { task, candidate } = candidateCase;
  const failureCodes = [];

  if (
    Object.entries(task.requestedChange).some(
      ([field, value]) => !Object.is(candidate.after[field], value),
    )
  ) {
    failureCodes.push("required_change_missing");
  }

  const forbiddenFields = new Set(
    task.forbiddenStates
      .filter(({ field, value }) => Object.is(candidate.after[field], value))
      .map(({ field }) => field),
  );

  if (forbiddenFields.size > 0) {
    failureCodes.push("forbidden_state_reached");
  }

  if (
    task.protectedFields.some(
      (field) =>
        !forbiddenFields.has(field) &&
        !Object.is(candidate.after[field], task.before[field]),
    )
  ) {
    failureCodes.push("protected_field_changed");
  }

  if (
    candidate.reportedChecks.some(
      (check) => !candidate.observedChecks.includes(check),
    )
  ) {
    failureCodes.push("reported_check_not_observed");
  }

  failureCodes.sort();
  return {
    passed: failureCodes.length === 0,
    failureCodes,
  };
}

function weakKeywordCheck(candidateCase) {
  return JSON.stringify(candidateCase.candidate.after).includes('"retryLimit":3');
}

function rigidSnapshotCheck(candidateCase, referenceAfter) {
  return JSON.stringify(candidateCase.candidate.after) === JSON.stringify(referenceAfter);
}

try {
  const datasetPath = path.resolve(datasetArgument);
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  validateDataset(dataset);

  const results = dataset.cases.map((candidateCase) => {
    const graded = gradeCase(candidateCase);
    const expectedFailureCodes = [
      ...candidateCase.expected.expectedFailureCodes,
    ].sort();

    assert.equal(
      graded.passed,
      candidateCase.expected.expectedPass,
      `${candidateCase.id}: pass expectation mismatch`,
    );
    assert.deepEqual(
      graded.failureCodes,
      expectedFailureCodes,
      `${candidateCase.id}: failure code expectation mismatch`,
    );

    return {
      id: candidateCase.id,
      expected_pass: candidateCase.expected.expectedPass,
      actual_pass: graded.passed,
      failure_codes: graded.failureCodes,
    };
  });

  const reference = dataset.cases.find(
    (candidateCase) => candidateCase.expected.expectedPass,
  );
  if (!reference) {
    throw new Error("dataset requires a passing reference case");
  }

  const validVariation = dataset.cases.find(
    (candidateCase) =>
      candidateCase !== reference &&
      candidateCase.expected.expectedPass &&
      !rigidSnapshotCheck(candidateCase, reference.candidate.after),
  );
  if (!validVariation) {
    throw new Error(
      "dataset requires a passing representation variation rejected by rigid snapshot",
    );
  }

  const protectedMutation = dataset.cases.find(
    (candidateCase) =>
      candidateCase.expected.expectedFailureCodes.includes(
        "protected_field_changed",
      ) && weakKeywordCheck(candidateCase),
  );
  if (!protectedMutation) {
    throw new Error(
      "dataset requires a protected-field failure accepted by the weak keyword check",
    );
  }

  const weakPassed = weakKeywordCheck(protectedMutation);
  const protectedSemanticPassed = gradeCase(protectedMutation).passed;
  const rigidPassed = rigidSnapshotCheck(
    validVariation,
    reference.candidate.after,
  );
  const variationSemanticPassed = gradeCase(validVariation).passed;

  assert.equal(weakPassed, true);
  assert.equal(protectedSemanticPassed, false);
  assert.equal(rigidPassed, false);
  assert.equal(variationSemanticPassed, true);

  const output = {
    synthetic_fixture: true,
    summary: {
      cases: results.length,
      expected_pass: results.filter((result) => result.expected_pass).length,
      expected_fail: results.filter((result) => !result.expected_pass).length,
      actual_pass: results.filter((result) => result.actual_pass).length,
      actual_fail: results.filter((result) => !result.actual_pass).length,
    },
    demonstrations: {
      weak_keyword_false_green: {
        case_id: protectedMutation.id,
        weak_passed: weakPassed,
        semantic_passed: protectedSemanticPassed,
      },
      rigid_snapshot_false_reject: {
        case_id: validVariation.id,
        rigid_passed: rigidPassed,
        semantic_passed: variationSemanticPassed,
      },
    },
    results,
    note:
      "Deterministic synthetic fixture only; this output does not measure model quality or production reliability.",
  };

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
