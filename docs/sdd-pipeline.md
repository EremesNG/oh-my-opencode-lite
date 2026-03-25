# SDD Pipeline

This document explains the bundled spec-driven development workflow shipped with
oh-my-opencode-lite.

## Overview

The full pipeline is:

```text
propose -> [spec || design] -> tasks -> apply -> verify -> archive
```

Brainstorming runs before this when the request is ambiguous, open-ended, or too
large to implement safely without scope alignment.

## How Brainstorming Feeds into SDD

The bundled `brainstorming` skill decides the handoff route after clarification.

- trivial work (`1-2` files): direct implementation
- medium work (`3-7` files): accelerated SDD, usually `propose -> tasks`
- complex work (`8+` files): full SDD pipeline

Before SDD begins, the user chooses an artifact store mode.

## Artifact Store Policy

The artifact store controls where planning artifacts persist.

| Mode | Writes to | Use when |
| --- | --- | --- |
| `thoth-mem` | thoth memory only | You want lightweight planning with no repo files |
| `openspec` | `openspec/` files only | You want reviewable repo artifacts |
| `hybrid` | both | You want maximum durability and recovery |

Config:

```json
{
  "artifactStore": {
    "mode": "hybrid"
  }
}
```

Default mode is `hybrid`.

## Phase-by-Phase Flow

### 1. `sdd-propose`

Creates or updates `proposal.md` for a named change.

Typical output:

- intent
- scope
- affected areas
- risks
- rollback plan
- success criteria

Canonical file path when OpenSpec files are enabled:

```text
openspec/changes/{change-name}/proposal.md
```

### 2. `sdd-spec`

Turns the proposal into requirements and Given/When/Then scenarios.

Typical output:

- ADDED requirements
- MODIFIED requirements
- REMOVED requirements
- RFC 2119 wording
- scenario-based acceptance criteria

Canonical file path:

```text
openspec/changes/{change-name}/specs/{domain}/spec.md
```

### 3. `sdd-design`

Explains how the approved spec will be built.

Typical output:

- technical approach
- architecture decisions
- data flow
- file changes
- interfaces or contracts
- testing strategy

Canonical file path:

```text
openspec/changes/{change-name}/design.md
```

### 4. `sdd-tasks`

Generates an executable checklist from the proposal, spec, and design.

Typical output:

- phased checklist
- concrete file references
- explicit verification steps
- dependency-respecting order

Canonical file path:

```text
openspec/changes/{change-name}/tasks.md
```

### 5. `sdd-apply`

Implements assigned tasks and reports structured results back to the
`orchestrator`.

Typical output:

- status: completed, failed, or partial
- what changed
- files changed
- verification evidence
- blockers or remaining work

`sdd-apply` executes assigned work. It does not own task checkbox updates.

### 6. `sdd-verify`

Builds a verification report against specs and execution evidence.

Typical output:

- completeness summary
- build and test evidence
- scenario compliance matrix
- issues found
- verdict

Canonical file path:

```text
openspec/changes/{change-name}/verify-report.md
```

### 7. `sdd-archive`

Closes the loop by merging verified deltas into main specs and archiving the
change.

Typical output:

- merged domains
- archive path
- verification lineage
- audit summary

Archive path pattern:

```text
openspec/changes/archive/YYYY-MM-DD-{change-name}/
```

## Plan Reviewer Oracle Loop

After `sdd-tasks`, the `orchestrator` can run an oracle review loop with the
bundled `plan-reviewer` skill.

Flow:

1. Generate `tasks.md`
2. Dispatch oracle with `plan-reviewer`
3. If result is `[OKAY]`, continue to execution
4. If result is `[REJECT]`, fix only the blocking issues
5. Re-run review until `[OKAY]`

`plan-reviewer` is intentionally narrow. It checks executability, not style.

## Task Progress Tracking

The `executing-plans` skill defines the task-state model used during execution.

| State | Meaning |
| --- | --- |
| `- [ ]` | Pending |
| `- [~]` | In progress |
| `- [x]` | Completed |
| `- [-]` | Skipped with explicit reason |

Rules:

1. Mark a task `- [~]` before dispatching work
2. Mark a task `- [x]` only after verification succeeds
3. Mark a task `- [-]` only with a clear skip or escalation reason
4. Do not batch-flip multiple tasks at once
5. Re-read `tasks.md` after each update to confirm persistence

## Executing-Plans Ownership Model

`executing-plans` makes the `orchestrator` the owner of progress tracking.

- The `orchestrator` updates checkbox state
- Sub-agents return structured results
- Verification happens before completion is recorded
- Escalation occurs after repeated failures instead of silent skipping

## Thoth Topic Keys

When the selected mode includes thoth memory, SDD artifacts use deterministic
topic keys:

```text
sdd/{change-name}/proposal
sdd/{change-name}/spec
sdd/{change-name}/design
sdd/{change-name}/design-brief
sdd/{change-name}/tasks
sdd/{change-name}/apply-progress
sdd/{change-name}/verify-report
sdd/{change-name}/archive-report
```

## Related Docs

- [Quick Reference](quick-reference.md)
- [Skills and MCPs](skills-and-mcps.md)
- [Installation Guide](installation.md)
