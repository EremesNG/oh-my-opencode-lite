---
name: sdd-tasks
description: Generate phased `tasks.md` checklists from specs and design.
---

# SDD Tasks Skill

Translate the approved spec and design into an implementation checklist.

## Shared Conventions

- Repository-source references: `../../_shared/...`
- `../_shared/openspec-convention.md`
- `../_shared/persistence-contract.md`
- `../_shared/thoth-mem-convention.md`

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
2. Recover `proposal`, `spec`, and `design` via
   `thoth_mem_mem_search` → `thoth_mem_mem_get_observation`.
3. If a task plan already exists, recover `sdd/{change-name}/tasks` before
   rewriting it.
4. Build a phased checklist at
   `openspec/changes/{change-name}/tasks.md`.
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

6. Reference concrete file paths and specific spec scenarios in the tasks.
7. Persist the full checklist with:

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
- Retrieve all dependencies through the thoth-mem two-step recovery flow.
- Never reference engram.
