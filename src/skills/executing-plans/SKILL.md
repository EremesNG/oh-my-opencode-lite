# Executing Plans

Follow an implementation plan from .omolite/plans/ task by task.

## When to Use
- Resuming work from a previous session
- Architect or Engineer executing a Planner's plan
- Any multi-task implementation with an existing plan

## Workflow

### 1. Load Plan
1. Read the plan file from .omolite/plans/
2. Find the first unchecked task: - [ ]
3. If a task is marked - [~] (in progress), check its state first

### 2. Execute Each Task
For each pending task:
1. Read the task description completely
2. Understand the files involved and what needs to change
3. Execute the implementation (yourself or via subagent)
4. Run the verification command specified in the task
5. If verification passes: update checkbox to - [x]
6. If verification fails: fix and re-verify before moving on

### 3. Between Tasks
- After completing a task, re-read the plan (it may reference prior task outputs)
- Check if the next task's assumptions still hold
- If something from a previous task broke, fix it before proceeding

### 4. Completion
After all tasks are checked:
1. Run the full project verification (build, typecheck, tests, lint)
2. If all pass: report completion
3. If failures: identify which task introduced the issue and fix it

## Rules
- Follow the plan's task order (they're dependency-ordered)
- Don't skip tasks without marking them - [-] with a reason
- Don't modify the plan's scope without user approval
- If blocked on a task, stop and ask the user - don't guess
- Update checkboxes in the plan file as you complete tasks

## Recovery
If you're in a new session and don't know the prior state:
1. Read the plan file - checkboxes show what's done
2. Run the project's test suite to see current state
3. Resume from the first unchecked task
