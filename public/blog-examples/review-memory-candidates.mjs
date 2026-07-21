import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const selfTest = args.includes("--self-test");
const unknownFlags = args.filter(
  (arg) => arg.startsWith("--") && arg !== "--self-test",
);
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));
const inputPath = positionalArgs[0];

if (!inputPath || positionalArgs.length !== 1 || unknownFlags.length > 0) {
  console.error(
    "Usage: node public/blog-examples/review-memory-candidates.mjs [--self-test] <candidates.json>",
  );
  process.exit(1);
}

const candidates = JSON.parse(readFileSync(resolve(inputPath), "utf8"));

if (!Array.isArray(candidates) || candidates.length === 0) {
  throw new Error("Input must be a non-empty JSON array.");
}

const requiredFields = [
  "id",
  "statement",
  "evidence",
  "scope",
  "sensitivity",
  "changeability",
  "invalidationEvents",
  "actionValue",
  "currentRequestConflict",
  "scopeReviewComplete",
  "autoScore",
];

function validateCandidate(candidate) {
  for (const field of requiredFields) {
    if (!(field in candidate)) {
      throw new Error(`${candidate.id ?? "unknown"}: missing ${field}`);
    }
  }

  if (!Array.isArray(candidate.evidence) || !Array.isArray(candidate.invalidationEvents)) {
    throw new Error(`${candidate.id}: evidence and invalidationEvents must be arrays`);
  }

  if (
    typeof candidate.autoScore !== "number" ||
    candidate.autoScore < 0 ||
    candidate.autoScore > 1
  ) {
    throw new Error(`${candidate.id}: autoScore must be between 0 and 1`);
  }

  if (typeof candidate.scopeReviewComplete !== "boolean") {
    throw new Error(`${candidate.id}: scopeReviewComplete must be boolean`);
  }

  if (typeof candidate.currentRequestConflict !== "boolean") {
    throw new Error(`${candidate.id}: currentRequestConflict must be boolean`);
  }
}

function reviewCandidate(candidate) {
  validateCandidate(candidate);

  if (["personal", "secret", "identifying"].includes(candidate.sensitivity)) {
    return {
      id: candidate.id,
      recommendation: "reject",
      reasons: ["sensitive source material is outside this memory store"],
    };
  }

  if (!candidate.actionValue) {
    return {
      id: candidate.id,
      recommendation: "reject",
      reasons: ["candidate does not change a future task action"],
    };
  }

  const reasons = [];
  const verifiedEvidence = candidate.evidence.filter((item) => item.verified);

  if (verifiedEvidence.length === 0) {
    reasons.push("no verified evidence");
  }

  if (!candidate.scope.taskKinds?.length || candidate.scope.taskKinds.includes("unspecified")) {
    reasons.push("scope is not specific enough");
  }

  if (candidate.changeability === "high" && candidate.invalidationEvents.length === 0) {
    reasons.push("high-change candidate has no invalidation event");
  }

  if (!candidate.scopeReviewComplete) {
    reasons.push("scope pre-review is incomplete");
  }

  return {
    id: candidate.id,
    recommendation: reasons.length === 0 ? "promote" : "hold",
    reasons: reasons.length === 0 ? ["all explicit review gates passed"] : reasons,
  };
}

function applicationDisposition(candidate, recommendation) {
  if (recommendation !== "promote") {
    return {
      applied: false,
      notAppliedReason: "promotion_recommendation_not_ready",
    };
  }

  if (candidate.currentRequestConflict) {
    return {
      applied: false,
      notAppliedReason: "current_request_conflict",
    };
  }

  return {
    applied: false,
    notAppliedReason: "final_human_approval_required",
  };
}

const results = candidates.map((candidate) => {
  const review = reviewCandidate(candidate);
  return {
    ...review,
    auto_score: candidate.autoScore,
    scope_review_complete: candidate.scopeReviewComplete,
    applicationDisposition: applicationDisposition(
      candidate,
      review.recommendation,
    ),
  };
});

const summary = results.reduce(
  (counts, result) => {
    counts[result.recommendation] += 1;
    return counts;
  },
  { promote: 0, hold: 0, reject: 0 },
);

if (selfTest) {
  assert.deepEqual(summary, { promote: 2, hold: 2, reject: 2 });
  assert.equal(
    results.find((result) => result.id === "high-score-scope-unreviewed")
      ?.recommendation,
    "hold",
  );
  assert.equal(
    results.find((result) => result.id === "raw-access-credential")
      ?.recommendation,
    "reject",
  );

  const conflict = results.find(
    (result) => result.id === "current-request-conflict",
  );
  assert.equal(conflict?.recommendation, "promote");
  assert.deepEqual(conflict?.applicationDisposition, {
    applied: false,
    notAppliedReason: "current_request_conflict",
  });
}

for (const result of results) {
  console.log(JSON.stringify(result));
}

console.log(
  JSON.stringify({
    mode: selfTest ? "sample_self_test" : "ordinary",
    summary,
    warning:
      "Automation only recommends; promotion requires an externally authenticated and authorized human approval record. The separate state-machine fixture validates record shape only, and current-task application is evaluated independently.",
  }),
);
