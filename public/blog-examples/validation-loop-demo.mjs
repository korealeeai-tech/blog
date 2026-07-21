import assert from "node:assert/strict";

const baselineArtifact = Object.freeze({
  title: "합성 검증 루프",
  metadata: {
    pubDate: "2026-07-21",
  },
  heroImage: "/blog/blog-images/synthetic-loop.svg",
  assetExists: false,
});

const repairedArtifact = Object.freeze({
  ...baselineArtifact,
  metadata: {
    ...baselineArtifact.metadata,
    updatedDate: "2026-07-21",
  },
  assetExists: true,
});

function weakTitleCheck(artifact) {
  return {
    passed: typeof artifact.title === "string" && artifact.title.trim() !== "",
    inspected: ["title"],
  };
}

function focusedPublishCheck(artifact) {
  const failures = [];

  if (typeof artifact.metadata?.updatedDate !== "string") {
    failures.push("metadata.updatedDate is missing");
  }

  if (!artifact.heroImage?.startsWith("/blog/blog-images/")) {
    failures.push("heroImage is outside the public image path");
  }

  if (artifact.assetExists !== true) {
    failures.push("heroImage asset does not exist");
  }

  return {
    passed: failures.length === 0,
    inspected: ["metadata.updatedDate", "heroImage", "assetExists"],
    failures,
  };
}

const weakCheck = weakTitleCheck(baselineArtifact);
const focusedCheck = focusedPublishCheck(baselineArtifact);
const repairedCheck = focusedPublishCheck(repairedArtifact);

assert.equal(weakCheck.passed, true, "the title-only check should produce a false green");
assert.equal(focusedCheck.passed, false, "the focused check should reject the baseline");
assert.deepEqual(focusedCheck.failures, [
  "metadata.updatedDate is missing",
  "heroImage asset does not exist",
]);
assert.equal(repairedCheck.passed, true, "the repaired artifact should satisfy the focused contract");

console.log(JSON.stringify({
  synthetic_fixture: true,
  baseline: baselineArtifact,
  weak_check: {
    ...weakCheck,
    interpretation: "false green: title exists, but publish requirements were not inspected",
  },
  focused_check: focusedCheck,
  repaired_artifact: repairedArtifact,
  repaired_check: repairedCheck,
  stop_reason: "focused publish contract passed for the repaired synthetic artifact",
}, null, 2));
