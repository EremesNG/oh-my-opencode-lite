# Writing Plans

Create structured implementation plans that persist across sessions.

## When to Use
- Multi-task features (3+ tasks)
- Work that spans multiple files or components
- When you need to hand off execution to another session or agent

## Plan Location
Save plans to: .omolite/plans/YYYY-MM-DD-<feature-name>.md

## Plan Document Format

Every plan MUST follow this structure:

---
# [Feature Name]

**Goal:** [One sentence]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies involved]

## Tasks

### Task 1: [Component/Feature Name]

**Files:**
- Create: exact/path/to/new-file.ts
- Modify: exact/path/to/existing.ts (lines ~42-60)
- Test: exact/path/to/test-file.test.ts

**Description:**
What to do and why, with enough detail that someone with zero context can execute.

**Verification:**
- Run: [exact test/build command]
- Expected: [what success looks like]

- [ ] Task 1

### Task 2: [Next Component]
...
- [ ] Task 2
---

## Principles

### Bite-Sized Tasks
Each task should take 5-15 minutes to implement. If it takes longer, split it.

### Self-Contained
Each task must include:
- Exact file paths (not "the config file" but src/config/schema.ts)
- What to change (not "add validation" but "add Zod schema for X with fields Y, Z")
- How to verify (exact command + expected output)

### Dependency Order
Tasks are ordered by dependency. Task N should not depend on Task N+1.
If tasks are independent, note they can be parallelized.

### DRY, YAGNI, TDD
- Don't plan features that aren't needed
- Don't duplicate logic across tasks
- Include test verification in every task

## Checkbox Convention
- [ ] Pending
- [~] In progress
- [x] Complete
- [-] Skipped (with reason)

## After Writing the Plan
Present it to the user for review. Iterate on feedback until approved.
