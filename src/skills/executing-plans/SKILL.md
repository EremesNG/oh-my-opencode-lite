---
name: executing-plans
description: Execute SDD task lists with real-time progress tracking, sub-agent dispatch, and verification checkpoints.
metadata:
  author: oh-my-opencode-lite
  version: '1.0'
---

# Executing Plans Skill

Use this skill to execute an existing SDD task list end to end while keeping
task progress durable, ordered, and verifiable.

## Shared Conventions

- `~/.config/opencode/skills/_shared/openspec-convention.md`
- `~/.config/opencode/skills/_shared/persistence-contract.md`
- `~/.config/opencode/skills/_shared/thoth-mem-convention.md`

## Progress Tracking Invariants

The orchestrator owns task progress tracking.

- The orchestrator marks `- [ ]` to `- [~]` before dispatching execution work.
- The orchestrator marks `- [~]` to `- [x]` only after successful results are
  received and verified.
- The orchestrator marks `- [-]` with a clear reason when a task is skipped or
  fails after escalation.
- Sub-agents execute assigned work and return structured results. They do not
  own checkbox updates.
- Never batch-update multiple checkboxes at once.
- Never proceed without updating the current task state first.
- Re-read the canonical tasks artifact after each edit to confirm persistence.
- Persistence mode determines target stores: `openspec` → file only,
  `thoth-mem` → memory only, `hybrid` → both. Never skip a store that the
  active mode requires.
- `openspec/` files are coordination artifacts, not source code. The
  orchestrator may read and edit them directly for progress tracking and state
  management only when the active mode includes openspec artifacts.
- Task state updates are NOT optional and NOT deferred — they happen in
  real-time as execution proceeds.
- Every state transition (pending→in-progress, in-progress→completed,
  in-progress→skipped) MUST be persisted BEFORE moving on.
- Real-time tracking is a hard invariant, not a best practice. Deferred or
  batched updates are a protocol violation.

## When to Use

- Executing an SDD task list
- Resuming work from a previous session
- Multi-task implementation with an existing change already defined

## Workflow

### Phase 1: Load

1. Determine the artifact store mode from config before reading or writing any
   SDD artifacts.
2. Load task artifacts using mode-aware retrieval:
   - `openspec`/`hybrid`: scan `openspec/changes/` for active changes and read
     `tasks.md`.
   - `thoth-mem`: recover tasks via 3-layer recall
     (`search` → `timeline` → `get_observation`) using topic key
     `sdd/{change-name}/tasks`.
3. Find the first unchecked task in state `- [ ]` or `- [~]`.
4. Build a mental model of the plan: total tasks, remaining work,
   parallelizable work, and dependency order.
5. Load remaining SDD context using mode-aware retrieval in
   `~/.config/opencode/skills/_shared/persistence-contract.md`.

### Phase 2: Execute Each Task

#### A. Mark In-Progress

Before dispatching a task:

1. Edit the canonical tasks artifact and change the current task from
   `- [ ]` to `- [~]`.
2. If the mode is `thoth-mem` or `hybrid`, re-persist the updated tasks
   artifact with topic key `sdd/{change-name}/tasks`.
3. Re-read `tasks.md` after the edit to confirm the change persisted.

#### B. Dispatch

Choose the execution agent based on task type:

| Need | Agent |
| --- | --- |
| Broad codebase discovery | `@explorer` |
| External docs or APIs | `@librarian` |
| Architecture or debugging | `@oracle` |
| UI or UX work | `@designer` |
| Simple, precise changes | `@quick` |
| Complex, multi-file changes | `@deep` |

Every dispatch prompt MUST include these 6 parts:

1. `TASK` — exact task number and title
2. `CONTEXT` — relevant proposal, spec, design, and prior-task state
3. `REQUIREMENTS` — concrete outcomes and constraints
4. `BOUNDARIES` — files, scope limits, and non-goals
5. `VERIFICATION` — checks the sub-agent must run or report
6. `RETURN ENVELOPE` — the exact structured response contract in this skill

#### C. Receive and Verify

Read the sub-agent return envelope and respond by status:

- `completed`: inspect the reported file changes, run verification checks, and
  confirm the task acceptance criteria were actually met.
- `failed`: assess the blocker, decide whether to retry with sharper guidance,
  switch agents, or escalate.
- `partial`: assess what is already done, preserve that context, and dispatch a
  focused follow-up for the remainder.

#### D. Mark Complete

After verified completion:

1. Edit the canonical tasks artifact and change the task from `- [~]` to
   `- [x]`.
2. If the mode is `thoth-mem` or `hybrid`, re-persist the updated tasks
   artifact under `sdd/{change-name}/tasks`.
3. Persist a progress checkpoint under `sdd/{change-name}/apply-progress` when
   the mode includes thoth-mem.
4. Re-read `tasks.md` after the edit to confirm the completed state persisted.

#### E. Auto-Continue

Immediately proceed to the next task.

Do not ask the user whether execution should continue unless one of these is
true:

- the work is truly blocked
- a critical failure prevents safe continuation
- the current task has failed 3 consecutive times

### Phase 3: Between Tasks

Between every task:

1. Re-read `tasks.md` because later tasks may depend on earlier outputs.
2. Re-check that assumptions still hold.
3. If a prior task introduced breakage, fix that before starting the next task.

### Phase 4: Escalation Policy

- Attempt 1: re-dispatch the same task with explicit fix instructions and the
  missing evidence called out.
- Attempt 2: switch to a different agent or fix directly when appropriate.
- Attempt 3: make one final targeted attempt with narrowed scope.
- After 3 consecutive failures, mark the task `- [-]` with a clear reason and
  escalate to the user.

### Phase 5: Completion

After the task list is complete:

1. Run full verification: build, typecheck, tests, and lint using the project's
   configured commands.
2. Report a completion summary with evidence.
3. If the work is SDD-backed, suggest `sdd-verify` as the next step.

## Return Envelope Contract

Every execution sub-agent MUST return this exact structure:

```markdown
## Task Result

**Status**: completed | failed | partial
**Task**: {task number and name}

### What was done
- {concrete change 1}
- {concrete change 2}

### Files changed
- `path/to/file.ts` — {what changed}

### Verification
- {check 1}: passed | failed
- {check 2}: passed | failed

### Issues (if any)
- {issue description} — {severity: critical | important | minor}

### Failure reason (if failed)
{Why it failed, what was attempted, what blocked progress}

### Skip reason (if skipped)
{Why it was skipped, what prerequisite is missing}
```

Treat missing sections or vague summaries as incomplete execution results.

## Recovery Protocol

To resume safely:

1. Determine the artifact store mode from config.
2. Recover task state using mode-aware retrieval:
   - `openspec`: read `openspec/changes/{change-name}/tasks.md`.
   - `thoth-mem`: recover `sdd/{change-name}/tasks` and
     `sdd/{change-name}/apply-progress` via 3-layer recall
     (`search` → `timeline` → `get_observation`).
   - `hybrid`: do both recovery paths and prefer thoth-mem as the source of
     truth if state diverges.
3. Resume from the first task marked `- [ ]` or `- [~]`.

## Guardrails

- Do not execute tasks out of dependency order.
- Do not mark a task complete without verification evidence.
- Do not skip SDD context recovery.
- Do not modify task-list structure; only update checkbox state and explicit skip
  reasons.
- Do not continue past a blocked task without escalation.
- Do not claim completion without evidence.
