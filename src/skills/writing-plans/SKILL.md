---
name: writing-plans
description: Use when a multi-task feature needs a structured implementation plan before coding, especially for work spanning multiple files, components, or sessions
---

# Writing Plans

Create structured implementation plans that persist across sessions.

## When to Use
- Multi-task features (3+ tasks)
- Work that spans multiple files or components
- When you need to hand off execution to another session or agent

## Plan Location
Save plans to: .omolite/plans/YYYY-MM-DD-<feature-name>.md

## Workflow

### 1. Explore Before Planning
Before writing a single task, understand the codebase:
- Delegate to @explorer to map relevant parts of the codebase
- Delegate to @librarian if external docs/APIs are involved
- Parallelize exploration when possible
- Synthesize findings: current state, patterns, conventions, relevant files
- Note the tech stack, naming conventions, and testing patterns already in use

Planning without exploration leads to plans that conflict with existing code.

### 2. Scope Check
If the request covers multiple independent subsystems, suggest breaking into separate plans — one per subsystem, each producing working/testable software. A single 30-task plan is harder to execute and debug than three 10-task plans.

### 3. Write the Plan
Map out the file structure (which files will be created/modified and what each is responsible for), then write the plan document following the format below.

### 4. Plan Review Loop
After completing each chunk of the plan, self-review before finalizing:

| Check | What to look for |
|-------|-----------------|
| Completeness | TODOs, placeholders, incomplete tasks, missing steps |
| Spec Alignment | Plan covers all requirements, no scope creep |
| Task Decomposition | Tasks are atomic, clear boundaries, steps are actionable |
| File Structure | Files have clear single responsibilities |
| File Size | Would any file grow too large to reason about as a whole? |
| Task Syntax | Checkbox syntax (- [ ]) on every task |
| Verification | Every task has a concrete verification command and expected output |

Look especially hard for:
- Any TODO markers or placeholder text
- Steps that say "similar to X" without actual content
- Missing verification steps or expected outputs

Loop: write chunk → review → fix issues → re-review → proceed. If the loop exceeds 5 iterations on a chunk, surface to user for guidance.

### 5. Present and Iterate
Present the final plan to the user for approval. Iterate on feedback until approved.

### 6. Execution Handoff
After saving the plan and receiving user approval, always end with:

"Plan saved to `.omolite/plans/<filename>.md`. You can now ask **Architect** in a new session to execute the plan `<plan-name>`."

This tells the user exactly what to do next — never skip the handoff message.

## Plan Document Format

Every plan follows this structure:

---
# [Feature Name]

> **For agentic workers:** Use Architect agent to execute this plan. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** [One sentence]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies involved]

---

### Task N: [Component/Feature Name]

**Files:**
- Create: exact/path/to/new-file.ts
- Modify: exact/path/to/existing.ts (lines ~42-60)
- Test: exact/path/to/test-file.test.ts

**Description:**
What to do and why, with enough detail for someone with zero context.

**Verification:**
- Run: [exact command]
- Expected: [what success looks like]

- [ ] Task N

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

### File Structure
- Each file should have one clear responsibility
- Prefer smaller, focused files over large ones
- Files that change together should live together
- In existing codebases, follow established patterns

### DRY, YAGNI, TDD
- Don't plan features that aren't needed
- Don't duplicate logic across tasks
- Include test verification in every task

## Checkbox Convention
- [ ] Pending
- [~] In progress
- [x] Complete
- [-] Skipped (with reason)
