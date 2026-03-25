---
name: sdd-archive
description: Merge completed deltas into main specs and archive the change.
---

# SDD Archive Skill

Close the SDD loop by promoting verified change specs into main specs and
recording an audit trail.

## Shared Conventions

- Repository-source references: `../../_shared/...`
- `../_shared/openspec-convention.md`
- `../_shared/persistence-contract.md`
- `../_shared/thoth-mem-convention.md`

## When to Use

- The change has an acceptable verification report and is ready to close
- An archive attempt must be retried after an interrupted move or merge

## Prerequisites

- `change-name`
- Spec artifact
- Design artifact
- Tasks artifact
- Verify report artifact

## Workflow

1. Read the shared conventions.
2. Recover `spec`, `design`, `tasks`, and `verify-report` through
   `thoth_mem_mem_search` → `thoth_mem_mem_get_observation`.
3. Refuse to archive if the verification report still contains unresolved
   critical failures.
4. Merge every change spec from
   `openspec/changes/{change-name}/specs/{domain}/spec.md` into
   `openspec/specs/{domain}/spec.md`.
5. Move the completed change directory to
   `openspec/changes/archive/YYYY-MM-DD-{change-name}/`.
6. Create an audit trail report summarizing merged domains, archive location,
   and verification lineage.
7. Persist the audit trail with:

   ```text
   thoth_mem_mem_save(
     title: "sdd/{change-name}/archive-report",
     topic_key: "sdd/{change-name}/archive-report",
     type: "architecture",
     project: "{project}",
     scope: "project",
     content: "{full archive report markdown}"
   )
   ```

## Output Format

Return:

- `Change`
- `Archive Path`: `openspec/changes/archive/YYYY-MM-DD-{change-name}/`
- `Topic Key`: `sdd/{change-name}/archive-report`
- `Merged Specs`: list of domains updated in `openspec/specs/`
- `Audit Summary`: concise bullets
- `Status`: archived or blocked

## Rules

- Archive only after verification is acceptable.
- Merge delta specs before moving the change folder.
- Preserve canonical spec structure and untouched requirements.
- Persist the final audit trail through thoth-mem.
- Use the thoth-mem two-step recovery flow for every dependency.
- Never reference engram.
