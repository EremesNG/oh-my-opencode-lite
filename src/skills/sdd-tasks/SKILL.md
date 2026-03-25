---
name: sdd-tasks
description: Generate phased `tasks.md` checklists from specs and design.
---

# SDD Tasks Skill

Translate the approved spec and design into an implementation checklist.

## Shared Conventions

- Shared references:
- `~/.config/opencode/skills/_shared/openspec-convention.md`
- `~/.config/opencode/skills/_shared/persistence-contract.md`
- `~/.config/opencode/skills/_shared/thoth-mem-convention.md`

## Persistence Mode

The orchestrator passes the artifact store mode (`thoth-mem`, `openspec`, or
`hybrid`). Follow
`~/.config/opencode/skills/_shared/persistence-contract.md` for read/write
rules per mode.

- `thoth-mem`: persist to thoth-mem only — do NOT create or modify
  `openspec/` files.
- `openspec`: write files only — do NOT call thoth-mem save tools.
- `hybrid`: persist to both (default).

## When to Use

- Proposal, spec, and design are ready for execution planning
- A task plan must be refreshed after design or scope changes

## Prerequisites

- `change-name`
- Proposal artifact
- Spec artifact
- Design artifact

## Workflow

1. Read the shared conventions.
2. Recover `proposal`, `spec`, and `design` via the retrieval protocol in
   `~/.config/opencode/skills/_shared/persistence-contract.md`.
3. If a task plan already exists, recover `sdd/{change-name}/tasks` with the
   same mode-aware retrieval rules before rewriting it.
4. Build a phased checklist for `openspec/changes/{change-name}/tasks.md`. In
   `thoth-mem` mode, produce the same canonical checklist content without
   creating the file.
5. Use hierarchical numbering and Markdown checkboxes:

   ```md
   # Tasks: {Change Title}

   ## Phase 1: Foundation
   - [ ] 1.1 ...

   ## Phase 2: Core Implementation
   - [ ] 2.1 ...

   ## Phase 3: Integration
   - [ ] 3.1 ...

   ## Phase 4: Verification
   - [ ] 4.1 ...
   ```

   Recognized task states:

   - `- [ ]` pending
   - `- [~]` in progress
   - `- [x]` completed
   - `- [-]` skipped with reason

6. Reference concrete file paths and specific spec scenarios in the tasks.
7. If the selected mode includes thoth-mem, persist the full checklist with:

   ```text
   thoth_mem_mem_save(
     title: "sdd/{change-name}/tasks",
     topic_key: "sdd/{change-name}/tasks",
     type: "architecture",
     project: "{project}",
     scope: "project",
     content: "{full tasks markdown}"
   )
   ```

8. After generating `tasks.md`, the orchestrator should offer the user an
   optional oracle plan review with the bundled `plan-reviewer` skill before
   execution begins.
9. If the user wants plan review, run the `[OKAY]` / `[REJECT]` loop until the
   review returns `[OKAY]`. On each `[REJECT]`, fix only blocking issues,
   limit each rejection to max 3 issues, then re-run the review.

## Output Format

Return:

- `Change`
- `Artifact`: `openspec/changes/{change-name}/tasks.md`
- `Topic Key`: `sdd/{change-name}/tasks`
- `Phase Summary`: task counts per phase
- `Execution Order`: one short paragraph
- `Next Step`: `sdd-apply`

## Rules

- Tasks must be small, actionable, and verifiable.
- Order tasks by dependency.
- Include testing and verification work explicitly.
- Do not create vague tasks such as “implement feature”.
- Retrieve all dependencies through the mode-aware protocol in
  `~/.config/opencode/skills/_shared/persistence-contract.md`.
- Never reference engram.
