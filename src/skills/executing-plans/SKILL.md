---
name: executing-plans
description: Use when resuming work from a previous session or executing an existing implementation plan from .omolite/plans/ task by task with real-time progress tracking, subagent dispatch, and verification checkpoints
---

# Executing Plans

Execute an implementation plan from .omolite/plans/ task by task with real-time progress tracking.

## When to Use
- Resuming work from a previous session
- Architect or Engineer executing a Planner's plan
- Any multi-task implementation with an existing plan

## Workflow

### 1. Load Plan
1. Read the plan file from .omolite/plans/
2. Find the first unchecked task: - [ ]
3. If a task is marked - [~] (in progress), verify its actual state before assuming incomplete
4. Build a mental model: total tasks, remaining, parallelizable groups, dependencies

### 2. Execute Each Task

#### A. Mark In-Progress First
Before doing ANY work on a task, edit the plan file to change `- [ ]` → `- [~]`. This way, if execution is interrupted, the plan reflects exactly what was in progress.

#### B. Dispatch or Execute
Choose the right approach based on task complexity:

| Need | Agent | When to use |
|------|-------|-------------|
| Broad codebase discovery | @explorer | Unknown structure, pattern hunting |
| External docs/APIs | @librarian | Unfamiliar libraries, version-specific behavior |
| Architecture or persistent debugging | @oracle | High-stakes design, 2+ failed fix attempts |
| UI/UX/styling work | @designer | User-facing flows, visual quality |
| Simple, precise code changes | @quick | Well-defined, low-ambiguity changes |
| Complex, multi-file changes | @deep | Ambiguous, correctness-critical work |

Every delegation prompt must contain five parts:
1. **TASK**: Atomic, specific goal
2. **CONTEXT**: Relevant paths, patterns, constraints, line numbers from the plan
3. **REQUIREMENTS**: Explicit acceptance criteria — leave nothing implicit
4. **BOUNDARIES**: What NOT to do — prevent scope creep
5. **VERIFICATION**: Concrete checks that confirm success

#### C. Verify (see Verification section below)

#### D. Mark Complete
After verification passes, edit the plan file to change `- [~]` → `- [x]`. Then re-read the plan file to confirm the checkbox update persisted.

### 3. Between Tasks
- Re-read the plan after each task (it may reference prior task outputs)
- Check if the next task's assumptions still hold
- If something from a previous task broke, fix it before proceeding
- **Auto-continue**: immediately dispatch the next task after verified completion — never ask "should I continue?" or "proceed to next task?"

Only pause if:
- Truly blocked by missing information or external dependency
- Critical failure that prevents further progress
- Task failed 3 times and needs user decision

### 4. Completion
After all tasks are checked:
1. Run the full project verification (build, typecheck, tests, lint)
2. If all pass: report completion summary
3. If failures: identify which task introduced the issue and fix it

## Verification Protocol

After each task completes, run the full verification protocol:

### Automated Checks
1. lsp_diagnostics on ALL changed files → zero new errors
2. Run the task's specified verification command → passes
3. Build/typecheck succeeds (if applicable)

### Manual Code Review (do not skip this)
1. Read EVERY file created or modified
2. For each file, check:
   - Does the logic actually implement the task requirement?
   - Are there stubs, TODOs, placeholders, or hardcoded values?
   - Are there logic errors or missing edge cases?
   - Does it follow existing codebase patterns?
   - Are imports correct and complete?
3. Cross-reference: compare what was claimed vs what the code actually does
4. If anything doesn't match → dispatch a fix immediately

### Issue Severity
- **CRITICAL**: Must fix before proceeding (bugs, security, data loss)
- **IMPORTANT**: Should fix (conventions, maintainability)
- **MINOR**: Note for later (style, optimization)

## Escalation Policy
- Attempt 1: dispatch subagent with specific fix instructions
- Attempt 2: fix it directly
- After 3 consecutive failures on the same task: mark it `- [-]` with a reason, then escalate to user with full details

## Progress Tracking Rules
1. BEFORE dispatching any task: change `- [ ]` → `- [~]`
2. AFTER verified completion: change `- [~]` → `- [x]`
3. After each checkbox edit: re-read the plan file to confirm the update persisted
4. Never batch-update checkboxes — update one task at a time
5. Never proceed to the next task before updating the current task's checkbox
6. If a task fails after 3 retries: mark `- [-]` with a reason and escalate

This ensures that if execution is interrupted at any point, the plan file reflects exactly what was completed and what was in progress, making recovery straightforward.

## Recovery
If you're in a new session and don't know the prior state:
1. Read the plan file — checkboxes show what's done
2. Run the project's test suite to see current state
3. Resume from the first unchecked task
