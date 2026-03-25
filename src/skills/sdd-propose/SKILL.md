---
name: sdd-propose
description: Create or update `proposal.md` for an OpenSpec change.
---

# SDD Propose Skill

Create the proposal artifact for a change and persist it with thoth-mem.

## Shared Conventions

- Repository-source references: `../../_shared/...`
- `../_shared/openspec-convention.md`
- `../_shared/persistence-contract.md`
- `../_shared/thoth-mem-convention.md`

## When to Use

- A change needs its first `proposal.md`
- An existing proposal must be refined after new requirements

## Prerequisites

- A `change-name`
- User intent, problem statement, or prior exploration notes
- Project name for thoth-mem persistence

## Workflow

1. Read the shared conventions before drafting.
2. If the change already exists, recover the latest proposal with
   `thoth_mem_mem_search` → `thoth_mem_mem_get_observation` and read the current
   `openspec/changes/{change-name}/proposal.md` when filesystem artifacts exist.
3. Review relevant main specs under `openspec/specs/` to avoid proposing
   contradictions.
4. Write `openspec/changes/{change-name}/proposal.md` using this shape:

   ```md
   # Proposal: {Change Title}

   ## Intent
   ## Scope
   ### In Scope
   ### Out of Scope
   ## Approach
   ## Affected Areas
   ## Risks
   ## Rollback Plan
   ## Success Criteria
   ```

5. Persist the full proposal with:

   ```text
   thoth_mem_mem_save(
     title: "sdd/{change-name}/proposal",
     topic_key: "sdd/{change-name}/proposal",
     type: "architecture",
     project: "{project}",
     scope: "project",
     content: "{full proposal markdown}"
   )
   ```

6. In `hybrid` mode, both the filesystem artifact and thoth-mem save must
   succeed.

## Output Format

Return a short report with:

- `Change`: change name
- `Artifact`: `openspec/changes/{change-name}/proposal.md`
- `Topic Key`: `sdd/{change-name}/proposal`
- `Summary`: 2-4 bullets covering intent, scope, and major risks
- `Next Step`: usually `sdd-spec` or `sdd-design`

## Rules

- Use canonical OpenSpec filenames only.
- Keep the proposal focused on why, scope, and success criteria.
- Always include rollback guidance and explicit out-of-scope items.
- Never reference engram.
- Never rely on a `thoth_mem_mem_search` preview without calling
  `thoth_mem_mem_get_observation` when continuing existing work.
