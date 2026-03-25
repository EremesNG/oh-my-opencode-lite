# Persistence Contract

## Supported Persistence Modes

| Mode | Read order | Write targets | Use when |
| --- | --- | --- | --- |
| `thoth-mem` | thoth-mem only | thoth-mem only | The user wants no repo artifact changes |
| `hybrid` | thoth-mem, then filesystem fallback | thoth-mem and OpenSpec files | The change should survive compaction and exist in the repo |

SDD skills MUST use thoth-mem for durable persistence. Do not reference or rely
on engram.

## Hybrid Rules

When running in `hybrid` mode:

1. Write the canonical OpenSpec artifact to the filesystem.
2. Persist the same full artifact to thoth-mem with a deterministic `topic_key`.
3. Treat the operation as complete only when both writes succeed.
4. If filesystem and memory diverge, repair them immediately by rewriting the
   stale copy from the freshest full artifact.

## Retrieval Protocol

Always recover SDD dependencies in this order:

1. `thoth_mem_mem_search` with the exact SDD topic key.
2. `thoth_mem_mem_get_observation` using the returned observation ID.
3. If nothing is found and the mode includes files, read the canonical OpenSpec
   path from the filesystem.
4. If filesystem recovery succeeds, re-save the artifact to thoth-mem so the
   two stores converge again.

Never treat the preview returned by `thoth_mem_mem_search` as full source
material.

## Artifact Ownership

- `sdd-propose` persists `sdd/{change-name}/proposal`
- `sdd-spec` persists `sdd/{change-name}/spec`
- `sdd-design` persists `sdd/{change-name}/design`
- `sdd-tasks` persists `sdd/{change-name}/tasks`
- `sdd-apply` persists `sdd/{change-name}/apply-progress` and re-persists
  updated `sdd/{change-name}/tasks`
- `sdd-verify` persists `sdd/{change-name}/verify-report`
- `sdd-archive` persists `sdd/{change-name}/archive-report`

## Recovery Notes

- Prefer exact topic-key queries over fuzzy natural-language search.
- If multiple observations match, choose the exact topic-key match for the
  current project.
- In hybrid mode, use the filesystem copy only as fallback or repair input.
