---
name: brainstorming
description: Clarify ambiguous work, assess scope, and choose the right planning path before implementation.
metadata:
  author: oh-my-opencode-lite
  version: '1.0'
---

# Brainstorming Skill

Use this skill to understand what should be built before implementation starts.
The goal is clarity, scope calibration, and a user-approved handoff.

## Shared Conventions

- `../_shared/thoth-mem-convention.md`
- `../_shared/persistence-contract.md`

## HARD GATE

- Do not implement during brainstorming.
- Do not write code.
- Do not patch files.
- Do not create formal SDD artifacts until the user approves the route.

## Workflow

### Phase 1: Context Gathering

1. Dispatch `@explorer` and `@librarian` in parallel for codebase and external
   context.
2. Collect only the minimum context needed to improve questions and reduce user
   repetition.
3. Prefer facts from the codebase and known references over asking the user for
   information the environment can answer.

### Phase 2: Interview

1. Ask 1 question at a time.
2. Ask at most 5 total questions.
3. Prefer multiple-choice questions when practical.
4. Stop early when clarity is already sufficient.
5. Do not ask for details that the codebase, task artifacts, or gathered
   context already answer.

### Phase 3: Scope Assessment

Evaluate these 7 scope signals:

1. Multiple views, pages, or user flows
2. New or modified API endpoints, queries, or data models
3. Restructuring existing functionality
4. Affects multiple layers such as frontend and backend, or UI and logic and
   data
5. Described in business or UX terms instead of specific code changes
6. Scope is ambiguous or open-ended
7. Would likely touch 3 or more files across different directories

Signal mapping:

- `0-1` = trivial
- `2-4` = medium
- `5+` = complex

### Phase 4: Approach Proposal

1. Present 2-3 viable options.
2. For each option, give the main trade-offs.
3. Mark one option as the recommendation.
4. Ask the user to confirm the preferred approach before moving on.

### Phase 5: User Approval

Present:

- Summary of understanding
- Scope classification and why
- Recommended approach
- Proposed handoff path

Then wait for explicit user approval.

The user is the sole approver during brainstorming. Do not request oracle
review here.

### Phase 6: Handoff

Recommend a route based on complexity, then wait for the user to confirm it:

- Trivial (`1-2` files): direct implementation
- Medium (`3-7` files): accelerated SDD (`propose -> tasks`)
- Complex (`8+` files): full SDD (`propose -> spec -> design -> tasks`)

Before any SDD generation starts, present the artifact store policy choice:

```text
How would you like to persist planning artifacts?
1. thoth-mem — Memory only. Lightest token cost. No repo files.
2. openspec — Repo files only. Visible and reviewable.
3. hybrid — Both. Maximum durability, higher token cost.
Default: hybrid
```

Do not silently choose the handoff route or artifact store mode. Recommend, ask,
and wait.

## Guardrails

- Maximum 5 interview questions.
- Ask only one question at a time.
- Do not ask what codebase context can answer.
- Do not skip explicit user approval.
- Do not auto-select the handoff route.

## Anti-Patterns

- Question dumping
- Option inflation
- Premature implementation
- Silent route selection
