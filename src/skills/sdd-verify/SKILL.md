---
name: sdd-verify
description: Verify implementation against specs and persist a compliance report.
---

# SDD Verify Skill

Act as the quality gate for a change by turning specs and test evidence into a
verification report.

## Shared Conventions

- Repository-source references: `../../_shared/...`
- `../_shared/openspec-convention.md`
- `../_shared/persistence-contract.md`
- `../_shared/thoth-mem-convention.md`

## Persistence Mode

The orchestrator passes the artifact store mode (`thoth-mem`, `openspec`, or
`hybrid`). Follow `../_shared/persistence-contract.md` for read/write rules per
mode.

- `thoth-mem`: persist to thoth-mem only — do NOT create or modify
  `openspec/` files.
- `openspec`: write files only — do NOT call thoth-mem save tools.
- `hybrid`: persist to both (default).

## When to Use

- Implementation work is complete enough to validate
- A prior verification report must be refreshed after more code changes

## Prerequisites

- `change-name`
- Spec artifact
- Design artifact
- Tasks artifact
- Ability to run the relevant checks or tests

## Workflow

1. Read the shared conventions.
2. Recover `spec`, `design`, and `tasks` with the retrieval protocol in
   `../_shared/persistence-contract.md`.
3. Optionally recover `apply-progress` with the same mode-aware rules if it
   exists and helps explain task coverage.
4. Read the changed code and run the required verification commands.
5. If the selected mode includes OpenSpec, create
   `openspec/changes/{change-name}/verify-report.md` with at least:

   In `thoth-mem` mode, produce the same report content without creating the
   file:

   ```md
   # Verification Report: {Change Title}

   ## Completeness
   ## Build and Test Evidence
   ## Spec Compliance Matrix
   ## Design Coherence
   ## Issues Found
   ## Verdict
   ```

6. Build a compliance matrix that maps each Given/When/Then scenario to the test
   or execution evidence that proved it.
7. If the selected mode includes thoth-mem, persist the report with:

   ```text
   thoth_mem_mem_save(
     title: "sdd/{change-name}/verify-report",
     topic_key: "sdd/{change-name}/verify-report",
     type: "architecture",
     project: "{project}",
     scope: "project",
     content: "{full verify report markdown}"
   )
   ```

## Output Format

Return:

- `Change`
- `Artifact`: `openspec/changes/{change-name}/verify-report.md`
- `Topic Key`: `sdd/{change-name}/verify-report`
- `Verdict`: pass, pass with warnings, or fail
- `Compliance Summary`: compliant vs total scenarios
- `Critical Issues`: bullets or `None`

## Rules

- Verification requires real evidence, not only static inspection.
- Every spec scenario must appear in the compliance matrix.
- Distinguish blockers from warnings clearly.
- Do not fix issues inside this phase; report them.
- Recover full artifacts with the protocol in
  `../_shared/persistence-contract.md`.
- Never reference engram.
