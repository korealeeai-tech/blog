import assert from "node:assert/strict";

const transitions = Object.freeze({
  candidate: {
    submit_for_review: "review",
  },
  review: {
    approve: "promoted",
    hold: "held",
  },
  promoted: {
    stale_signal: "reverify",
  },
  held: {
    add_evidence: "review",
  },
  reverify: {
    reconfirm: "promoted",
    hold: "held",
  },
});

function hasRequiredApprovalRecordShape(approval) {
  return Boolean(
    approval &&
      approval.actorType === "human" &&
      typeof approval.actor === "string" &&
      approval.actor.trim() !== "" &&
      approval.decision === "approve" &&
      typeof approval.timestamp === "string" &&
      !Number.isNaN(Date.parse(approval.timestamp)),
  );
}

function createMemory(id) {
  return {
    id,
    state: "candidate",
    initial: {
      state: "candidate",
      reason: "candidate_created",
    },
    history: [],
  };
}

function transition(memory, event, context = {}) {
  const nextState = transitions[memory.state]?.[event];

  if (!nextState) {
    return {
      ok: false,
      memory,
      reason: `illegal transition: ${memory.state} -> ${event}`,
    };
  }

  if (
    event === "approve" &&
    (!context.evidenceVerified || !context.scopeDefined)
  ) {
    return {
      ok: false,
      memory,
      reason: "promotion requires verified evidence and a defined scope",
    };
  }

  if (
    event === "approve" &&
    !hasRequiredApprovalRecordShape(context.approvalRecord)
  ) {
    return {
      ok: false,
      memory,
      reason:
        "promotion requires an approval record with actorType=human, actor, decision=approve, and timestamp",
    };
  }

  if (event === "reconfirm" && !context.currentEvidence) {
    return {
      ok: false,
      memory,
      reason: "reverification requires current evidence",
    };
  }

  if (typeof context.reason !== "string" || context.reason.trim() === "") {
    return {
      ok: false,
      memory,
      reason: "accepted transitions require an audit reason",
    };
  }

  const nextMemory = {
    ...memory,
    state: nextState,
    ...(event === "approve"
      ? { approval: structuredClone(context.approvalRecord) }
      : {}),
    history: [
      ...memory.history,
      {
        from: memory.state,
        event,
        to: nextState,
        reason: context.reason,
      },
    ],
  };

  return { ok: true, memory: nextMemory };
}

function mustTransition(memory, event, context) {
  const result = transition(memory, event, context);
  assert.equal(result.ok, true, result.reason);
  return result.memory;
}

function promote(id) {
  let memory = createMemory(id);
  memory = mustTransition(memory, "submit_for_review", {
    reason: "candidate submitted for review",
  });
  memory = mustTransition(memory, "approve", {
    evidenceVerified: true,
    scopeDefined: true,
    approvalRecord: {
      actorType: "human",
      actor: "synthetic-reviewer",
      decision: "approve",
      timestamp: "2026-07-21T09:00:00Z",
    },
    reason: "verified evidence and scope passed review",
  });
  return memory;
}

function assertAudit(memory) {
  assert.deepEqual(memory.initial, {
    state: "candidate",
    reason: "candidate_created",
  });

  let expectedFrom = memory.initial.state;
  for (const entry of memory.history) {
    assert.deepEqual(Object.keys(entry), ["from", "event", "to", "reason"]);
    assert.equal(entry.from, expectedFrom);
    assert.equal(typeof entry.reason, "string");
    assert.notEqual(entry.reason.trim(), "");
    expectedFrom = entry.to;
  }
  assert.equal(memory.state, expectedFrom);

  if (memory.history.some((entry) => entry.event === "approve")) {
    assert.equal(hasRequiredApprovalRecordShape(memory.approval), true);
  }
}

const normal = promote("status-check-proof");
assert.equal(normal.state, "promoted");
assert.deepEqual(normal.history, [
  {
    from: "candidate",
    event: "submit_for_review",
    to: "review",
    reason: "candidate submitted for review",
  },
  {
    from: "review",
    event: "approve",
    to: "promoted",
    reason: "verified evidence and scope passed review",
  },
]);
assert.deepEqual(normal.approval, {
  actorType: "human",
  actor: "synthetic-reviewer",
  decision: "approve",
  timestamp: "2026-07-21T09:00:00Z",
});
assertAudit(normal);

const illegal = transition(createMemory("unreviewed-preference"), "approve", {
  evidenceVerified: true,
  scopeDefined: true,
  reason: "attempted to bypass review",
});
assert.equal(illegal.ok, false);
assert.equal(illegal.memory.state, "candidate");
assert.deepEqual(illegal.memory.history, []);
assertAudit(illegal.memory);

let missingApproval = createMemory("missing-final-approval");
missingApproval = mustTransition(missingApproval, "submit_for_review", {
  reason: "candidate submitted for review",
});
const missingApprovalResult = transition(missingApproval, "approve", {
  evidenceVerified: true,
  scopeDefined: true,
  reason: "attempted approval without an approval record",
});
assert.equal(missingApprovalResult.ok, false);
assert.equal(missingApprovalResult.memory.state, "review");
assert.equal("approval" in missingApprovalResult.memory, false);
assert.equal(missingApprovalResult.memory.history.length, 1);
assertAudit(missingApprovalResult.memory);

const automationActorTypeResult = transition(missingApproval, "approve", {
  evidenceVerified: true,
  scopeDefined: true,
  approvalRecord: {
    actorType: "automation",
    actor: "synthetic-automation",
    decision: "approve",
    timestamp: "2026-07-21T09:00:00Z",
  },
  reason: "approval record declared actorType=automation",
});
assert.equal(automationActorTypeResult.ok, false);
assert.equal(automationActorTypeResult.memory.state, "review");
assert.equal("approval" in automationActorTypeResult.memory, false);
assert.equal(automationActorTypeResult.memory.history.length, 1);
assertAudit(automationActorTypeResult.memory);

let stale = promote("renderer-setting");
stale = mustTransition(stale, "stale_signal", {
  reason: "renderer configuration may have changed",
});
stale = mustTransition(stale, "reconfirm", {
  currentEvidence: true,
  reason: "current configuration reconfirmed from fresh evidence",
});
assert.deepEqual(stale.history.slice(-2), [
  {
    from: "promoted",
    event: "stale_signal",
    to: "reverify",
    reason: "renderer configuration may have changed",
  },
  {
    from: "reverify",
    event: "reconfirm",
    to: "promoted",
    reason: "current configuration reconfirmed from fresh evidence",
  },
]);
assertAudit(stale);

function evaluateApplication(memory, { currentRequestConflict = false } = {}) {
  if (memory.state !== "promoted") {
    return {
      applied: false,
      notAppliedReason: "record_not_promoted",
    };
  }

  if (currentRequestConflict) {
    return {
      applied: false,
      notAppliedReason: "current_request_conflict",
    };
  }

  return {
    applied: true,
    notAppliedReason: null,
  };
}

const conflict = promote("default-publish-action");
const conflictHistoryBeforeApplication = structuredClone(conflict.history);
const conflictApplication = evaluateApplication(conflict, {
  currentRequestConflict: true,
});
assert.equal(conflict.state, "promoted");
assert.deepEqual(conflict.history, conflictHistoryBeforeApplication);
assert.deepEqual(conflictApplication, {
  applied: false,
  notAppliedReason: "current_request_conflict",
});
assertAudit(conflict);

const output = [
  {
    scenario: "normal_promotion",
    ok: true,
    initial: normal.initial,
    final_state: normal.state,
    approval: normal.approval,
    history: normal.history,
  },
  {
    scenario: "illegal_transition",
    ok: illegal.ok,
    initial: illegal.memory.initial,
    final_state: illegal.memory.state,
    history: illegal.memory.history,
    reason: illegal.reason,
  },
  {
    scenario: "missing_approval_record",
    ok: missingApprovalResult.ok,
    initial: missingApprovalResult.memory.initial,
    final_state: missingApprovalResult.memory.state,
    history: missingApprovalResult.memory.history,
    reason: missingApprovalResult.reason,
  },
  {
    scenario: "automation_actor_type",
    ok: automationActorTypeResult.ok,
    initial: automationActorTypeResult.memory.initial,
    final_state: automationActorTypeResult.memory.state,
    history: automationActorTypeResult.memory.history,
    reason: automationActorTypeResult.reason,
  },
  {
    scenario: "stale_reverification",
    ok: true,
    initial: stale.initial,
    final_state: stale.state,
    approval: stale.approval,
    history: stale.history,
  },
  {
    scenario: "current_request_conflict",
    ok: true,
    initial: conflict.initial,
    final_state: conflict.state,
    approval: conflict.approval,
    applicationDisposition: conflictApplication,
    history: conflict.history,
  },
  {
    note:
      "Synthetic transitions and approval-record shape checks only; this fixture assumes a trusted external approval boundary and does not authenticate human identity, provenance, or authorization.",
  },
];

for (const line of output) {
  console.log(JSON.stringify(line));
}
