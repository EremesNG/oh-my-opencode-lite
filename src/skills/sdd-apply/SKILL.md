---
name: sdd-apply
description: Execute `tasks.md`, update progress, and persist implementation state.
---

# SDD Apply Skill

Implement assigned SDD tasks while keeping task state durable in both OpenSpec
and thoth-mem.

## Shared Conventions

- Repository-source references: `../../_shared/...`
- `../_shared/openspec-convention.md`
- `../_shared/persistence-contract.md`
- `../_shared/thoth-mem-convention.md`

## When to Use

- A change has a task plan and implementation should begin or resume
- A batch of checklist items must be marked complete after coding work

## Prerequisites

- `change-name`
- Assigned task numbers or phase range
- Spec, design, and task artifacts

## Workflow

1. Read the shared conventions.
2. Recover `spec`, `design`, and `tasks` with
   `thoth_mem_mem_search` → `thoth_mem_mem_get_observation`.
3. Read the affected code before editing anything.
4. Execute only the assigned checklist items.
5. Update `openspec/changes/{change-name}/tasks.md` by changing completed items
   from `- [ ]` to `- [x]`.
6. Re-persist the updated task list with the same topic key:

   ```text
   thoth_mem_mem_save(
     title: "sdd/{change-name}/tasks",
     topic_key: "sdd/{change-name}/tasks",
     type: "architecture",
     project: "{project}",
     scope: "project",
     content: "{updated tasks markdown}"
   )
   ```

7. Persist an implementation progress report with:

   ```text
   thoth_mem_mem_save(
     title: "sdd/{change-name}/apply-progress",
     topic_key: "sdd/{change-name}/apply-progress",
     type: "architecture",
     project: "{project}",
     scope: "project",
     content: "{progress report markdown}"
   )
   ```

8. In `hybrid` mode, the checkbox update and both thoth-mem saves must succeed.

## Output Format

Return:

- `Change`
- `Completed Tasks`: checklist of finished items
- `Files Changed`: concise table or bullets
- `Task Artifact`: `openspec/changes/{change-name}/tasks.md`
- `Progress Topic Key`: `sdd/{change-name}/apply-progress`
- `Remaining Work`: next pending tasks

## Rules

- Read specs before implementing; they are the acceptance contract.
- Follow the design unless you explicitly report a justified deviation.
- Update only the tasks assigned in the current batch.
- Persist both the updated tasks artifact and the progress artifact.
- Retrieve every SDD dependency with `thoth_mem_mem_search` →
  `thoth_mem_mem_get_observation`.
- Never reference engram.
