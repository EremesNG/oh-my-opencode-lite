# thoth-mem Convention

## Tool Names

Use the thoth-mem tool names exactly as exposed by the plugin:

- `thoth_mem_mem_search`
- `thoth_mem_mem_get_observation`
- `thoth_mem_mem_save`
- `thoth_mem_mem_update` (optional when you already have an observation ID)

## Topic Key Format

All SDD artifacts use this deterministic pattern:

```text
sdd/{change-name}/{artifact}
```

Supported artifact names:

- `proposal`
- `spec`
- `design`
- `tasks`
- `apply-progress`
- `verify-report`
- `archive-report`

Use the same value for `title` and `topic_key` unless there is a strong reason
not to.

## Two-Step Recovery

1. Search by exact topic key:

```text
thoth_mem_mem_search(
  query: "sdd/{change-name}/{artifact}",
  project: "{project}"
)
```

2. Retrieve the full artifact:

```text
thoth_mem_mem_get_observation(id: {observation-id})
```

`thoth_mem_mem_search` returns previews only. Full SDD dependencies require the
second call.

## Save Contract

Persist SDD artifacts with a stable topic key so repeated saves upsert instead
of creating duplicates:

```text
thoth_mem_mem_save(
  title: "sdd/{change-name}/{artifact}",
  topic_key: "sdd/{change-name}/{artifact}",
  type: "architecture",
  project: "{project}",
  scope: "project",
  content: "{full artifact markdown}"
)
```

For `sdd-apply`, save the progress report under `apply-progress` and re-save the
updated task list under `tasks` after checkboxes change.
