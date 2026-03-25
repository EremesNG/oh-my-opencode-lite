# OpenSpec Convention

## Mode Scope

This convention applies only when the artifact store mode includes OpenSpec:
`openspec` and `hybrid`.

- In `thoth-mem` mode, skip canonical `openspec/` file writes.
- In `thoth-mem` mode, skip filesystem artifact recovery.

## Directory Structure

```text
openspec/
├── config.yaml
├── specs/
│   └── {domain}/spec.md
└── changes/
    ├── archive/
    └── {change-name}/
        ├── proposal.md
        ├── specs/
        │   └── {domain}/spec.md
        ├── design.md
        ├── tasks.md
        └── verify-report.md
```

## Canonical Artifacts

| Artifact | Canonical path | Notes |
| --- | --- | --- |
| Proposal | `openspec/changes/{change-name}/proposal.md` | Intent, scope, approach |
| Delta specs | `openspec/changes/{change-name}/specs/{domain}/spec.md` | Use one file per domain |
| Main specs | `openspec/specs/{domain}/spec.md` | Source of truth after archive |
| Design | `openspec/changes/{change-name}/design.md` | Architecture and file plan |
| Tasks | `openspec/changes/{change-name}/tasks.md` | Checkbox checklist updated by apply |
| Verify report | `openspec/changes/{change-name}/verify-report.md` | Compliance matrix and evidence |

`apply-progress` and `archive-report` are durable SDD artifacts, but they are
primarily persisted through thoth-mem topic keys when the mode includes
thoth-mem.

## Writing Rules

- Preserve canonical filenames and locations.
- Read an existing artifact before rewriting it.
- Keep change-specific artifacts under
  `openspec/changes/{change-name}/...`.
- Keep long-lived specs under `openspec/specs/{domain}/spec.md`.
- Archive completed changes under
  `openspec/changes/archive/YYYY-MM-DD-{change-name}/`.

## Artifact Content Rules

- `proposal.md` explains why the change exists.
- `spec.md` uses RFC 2119 keywords and Given/When/Then scenarios.
- `design.md` explains how the change will be implemented.
- `tasks.md` is phase-based and uses Markdown checkboxes.
- `verify-report.md` maps spec scenarios to executed evidence.

## `config.yaml` Shape

```yaml
schema: spec-driven

context: |
  Project background, stack, and constraints.

rules:
  proposal:
    - Proposal-specific guidance
  specs:
    - Require RFC 2119 keywords
    - Require Given/When/Then scenarios
  design:
    - Document architecture decisions with rationale
  tasks:
    - Use phased checklists with hierarchical numbering
  apply:
    - Match repository conventions
    tdd: false
    test_command: ''
  verify:
    test_command: ''
    build_command: ''
    coverage_threshold: 0
  archive:
    - Warn before destructive merges
```

Treat `rules` entries as mandatory phase-specific constraints whenever present.
