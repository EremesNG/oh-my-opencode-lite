---
name: sdd-design
description: Create `design.md` with architecture decisions and file changes.
---

# SDD Design Skill

Create the technical design that explains how the approved spec will be built.

## Shared Conventions

- Repository-source references: `../../_shared/...`
- `../_shared/openspec-convention.md`
- `../_shared/persistence-contract.md`
- `../_shared/thoth-mem-convention.md`

## When to Use

- Proposal and specs exist and implementation planning needs technical depth
- A prior design needs to be revised after spec changes

## Prerequisites

- `change-name`
- Proposal artifact
- Spec artifact
- Access to the repository code that will change

## Workflow

1. Read the shared conventions.
2. Recover `sdd/{change-name}/proposal` and `sdd/{change-name}/spec` through
   `thoth_mem_mem_search` → `thoth_mem_mem_get_observation`.
3. If revising work, recover `sdd/{change-name}/design` the same way.
4. Read the actual code paths affected by the change before deciding on an
   approach.
5. Write `openspec/changes/{change-name}/design.md` using this structure:

   ```md
   # Design: {Change Title}

   ## Technical Approach
   ## Architecture Decisions
   ### Decision: {Title}
   **Choice**:
   **Alternatives considered**:
   **Rationale**:
   ## Data Flow
   ## File Changes
   ## Interfaces / Contracts
   ## Testing Strategy
   ## Migration / Rollout
   ## Open Questions
   ```

6. Persist the design with:

   ```text
   thoth_mem_mem_save(
     title: "sdd/{change-name}/design",
     topic_key: "sdd/{change-name}/design",
     type: "architecture",
     project: "{project}",
     scope: "project",
     content: "{full design markdown}"
   )
   ```

## Output Format

Return:

- `Change`
- `Artifact`: `openspec/changes/{change-name}/design.md`
- `Topic Key`: `sdd/{change-name}/design`
- `Key Decisions`: concise bullet list
- `Files Planned`: created, modified, deleted paths
- `Next Step`: `sdd-tasks`

## Rules

- Base the design on the actual codebase, not generic assumptions.
- Every architecture decision must include rationale.
- Use concrete file paths and interfaces.
- Keep implementation details aligned with the spec and repository patterns.
- Retrieve full dependencies with `thoth_mem_mem_search` →
  `thoth_mem_mem_get_observation`.
- Never reference engram.
