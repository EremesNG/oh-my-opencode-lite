# Quick Reference Guide

Fast reference for oh-my-opencode-lite configuration, workflow, skills, and MCP
integration.

## Table of Contents

- [Agent Roster](#agent-roster)
- [Presets](#presets)
- [Bundled Skills](#bundled-skills)
- [Recommended External Skills](#recommended-external-skills)
- [SDD Pipeline](#sdd-pipeline)
- [Artifact Store Policy](#artifact-store-policy)
- [MCP Servers](#mcp-servers)
- [Background Tasks](#background-tasks)
- [Tmux Integration](#tmux-integration)
- [Prompt Overriding](#prompt-overriding)
- [Key Configuration Fields](#key-configuration-fields)

---

## Agent Roster

| Agent | Role | Mode | Dispatch |
| --- | --- | --- | --- |
| `orchestrator` | Root coordinator and memory owner | primary, non-mutating | sync coordinator |
| `explorer` | Local repository discovery | read-only | async via `background_task` |
| `librarian` | External docs and example lookup | read-only | async via `background_task` |
| `oracle` | Diagnosis, review, architecture, plan review | read-only | sync via `task` |
| `designer` | UX/UI implementation and browser verification | write-capable | sync via `task` |
| `quick` | Narrow implementation work | write-capable | sync via `task` |
| `deep` | Thorough multi-file implementation and verification | write-capable | sync via `task` |

The project is delegate-first: discovery and research go to specialists, while
the `orchestrator` keeps root-session state and durable memory.

## Presets

The installer generates an OpenAI preset by default. Presets map models and
variants to agents.

```json
{
  "preset": "openai",
  "presets": {
    "openai": {
      "orchestrator": { "model": "openai/gpt-5.4" },
      "oracle": { "model": "openai/gpt-5.4", "variant": "high" },
      "librarian": { "model": "openai/gpt-5.4-mini", "variant": "low" },
      "explorer": { "model": "openai/gpt-5.4-mini", "variant": "low" },
      "designer": { "model": "openai/gpt-5.4-mini", "variant": "medium" },
      "quick": { "model": "openai/gpt-5.4-mini", "variant": "low" },
      "deep": { "model": "openai/gpt-5.4", "variant": "high" }
    }
  }
}
```

Switch presets with either:

- the `preset` field in config
- `OH_MY_OPENCODE_LITE_PRESET` in the environment

For provider-specific examples, see
[Provider Configurations](provider-configurations.md).

### Fallback / Failover

Runtime failover is configured separately from presets:

```jsonc
{
  "fallback": {
    "enabled": true,
    "timeoutMs": 15000,
    "retryDelayMs": 500,
    "chains": {
      "orchestrator": [
        "openai/gpt-5.4",
        "anthropic/claude-sonnet-4-6",
        "google/gemini-3.1-pro"
      ],
      "deep": [
        "openai/gpt-5.4",
        "github-copilot/claude-opus-4.6"
      ]
    }
  }
}
```

Available chain keys are:

- `orchestrator`
- `oracle`
- `designer`
- `explorer`
- `librarian`
- `quick`
- `deep`

## Bundled Skills

Bundled skills are copied from `src/skills/` into the OpenCode skills directory
when skills are installed.

### Requirements Interview

`requirements-interview` is step-0 in the orchestrator prompt. It clarifies ambiguous
work before implementation through a six-phase discovery interview.

Core phases:

1. Context gathering
2. Interview
3. Scope assessment
4. Approach proposal
5. User approval
6. Handoff

Use it when the work is open-ended, spans multiple parts of the system, or needs
scope calibration before coding.

### SDD Pipeline Skills

| Skill | Purpose |
| --- | --- |
| `sdd-propose` | Create or update `proposal.md` |
| `sdd-spec` | Write OpenSpec delta specs with RFC 2119 requirements |
| `sdd-design` | Produce `design.md` with technical decisions |
| `sdd-tasks` | Generate phased `tasks.md` checklists |
| `sdd-apply` | Execute assigned checklist items and report progress |
| `sdd-verify` | Build verification and compliance reports |
| `sdd-archive` | Merge verified deltas into main specs and archive the change |

### Plan Reviewer

`plan-reviewer` is used after `sdd-tasks` to validate whether a task plan is
actually executable.

- Returns `[OKAY]` when the plan is executable
- Returns `[REJECT]` only for real blockers
- Limits rejections to at most 3 blocking issues

### Executing-Plans

`executing-plans` owns progress tracking during task execution.

Recognized task states:

- `- [ ]` pending
- `- [~]` in progress
- `- [x]` completed
- `- [-]` skipped with reason

The `orchestrator` updates task state; execution sub-agents report structured
results back but do not edit checkboxes themselves.

### Cartography

`cartography` generates and updates hierarchical codemaps so agents can work
from architectural summaries instead of re-reading everything.

See [Cartography](cartography.md).

## Recommended External Skills

These are not bundled in `src/skills/`, but they pair well with the workflow.

| Skill | Status | Typical use |
| --- | --- | --- |
| `simplify` | Installed by `--skills=yes` | Keep implementations lean |
| `agent-browser` | Installed by `--skills=yes` | Browser automation for `designer` |
| `test-driven-development` | Optional | Useful before `deep` implements fixes or features |
| `systematic-debugging` | Optional | Useful for `oracle` and `deep` bug diagnosis |

## SDD Pipeline

Primary flow:

```text
propose -> [spec || design] -> tasks -> apply -> verify -> archive
```

Routing is based on 6 complexity dimensions (logic depth, contract
sensitivity, context span, discovery need, failure cost, concern
coupling), not file count:

- low complexity: direct implementation
- moderate complexity: accelerated SDD, typically `propose -> tasks`
- high complexity: full SDD pipeline

Plan review happens after `sdd-tasks` and before execution. Progress tracking is
handled through `executing-plans`.

See [SDD Pipeline](sdd-pipeline.md) for the full workflow.

## Artifact Store Policy

Use `artifactStore.mode` to control where SDD artifacts persist.

| Mode | Writes to | Best for |
| --- | --- | --- |
| `thoth-mem` | thoth memory only | Fast planning with no repo artifact files |
| `openspec` | `openspec/` only | Reviewable spec files in the repository |
| `hybrid` | both | Maximum durability and recovery |

```json
{
  "artifactStore": {
    "mode": "hybrid"
  }
}
```

Default mode is `hybrid`.

## MCP Servers

Built-in MCPs:

| MCP | Purpose | Auth / runtime |
| --- | --- | --- |
| `websearch` | Exa-backed web search | Optional `EXA_API_KEY` |
| `context7` | Official library documentation lookup | Optional `CONTEXT7_API_KEY` |
| `grep_app` | Public GitHub code search | No auth required |
| `thoth_mem` | Local persistent memory and SDD artifact storage | Local `npx -y thoth-mem@latest` |

Disable any built-in MCP globally with `disabled_mcps`:

```json
{
  "disabled_mcps": ["websearch"]
}
```

## Background Tasks

oh-my-opencode-lite uses OpenCode background task primitives for async
specialists such as `explorer` and `librarian`.

| Tool | Purpose |
| --- | --- |
| `background_task` | Launch a read-only specialist asynchronously |
| `background_output` | Fetch or wait for a background result |
| `background_cancel` | Cancel pending or running background work |

Background delegation results are also persisted to disk so they can survive
compaction and in-memory loss.

## Tmux Integration

Enable live pane spawning for delegated work:

```json
{
  "tmux": {
    "enabled": true,
    "layout": "main-vertical",
    "main_pane_size": 60
  }
}
```

Run OpenCode with a matching port:

```bash
tmux
export OPENCODE_PORT=4096
opencode --port 4096
```

See [Tmux Integration](tmux-integration.md).

## Prompt Overriding

Override or extend agent prompts from:

```text
~/.config/opencode/oh-my-opencode-lite/
```

Supported files:

| File | Effect |
| --- | --- |
| `{agent}.md` | Replace the default prompt |
| `{agent}_append.md` | Append to the default prompt |

If `preset` is set, the loader checks the preset subdirectory first:

```text
~/.config/opencode/oh-my-opencode-lite/{preset}/
```

## Key Configuration Fields

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `preset` | string | unset | Selects a preset under `presets` |
| `presets` | object | unset | Named agent model maps |
| `presets.<name>.<agent>.model` | string or array | unset | Model ID or priority model array |
| `presets.<name>.<agent>.variant` | string | unset | Reasoning effort hint |
| `tmux.enabled` | boolean | `false` | Enables pane spawning |
| `tmux.layout` | string | `main-vertical` | `main-horizontal`, `main-vertical`, `tiled`, `even-horizontal`, `even-vertical` |
| `tmux.main_pane_size` | number | `60` | Main pane size percent |
| `background.maxConcurrentStarts` | number | `10` | Parallel background launch limit |
| `background.timeoutMs` | number | `300000` | Background task timeout |
| `fallback.enabled` | boolean | `true` | Runtime model failover |
| `fallback.timeoutMs` | number | `15000` | Timeout before trying next fallback |
| `fallback.retryDelayMs` | number | `500` | Delay between failover attempts |
| `delegation.storage_dir` | string | platform default | Delegation artifact location |
| `delegation.timeout` | number | `900000` | Delegation timeout |
| `thoth.command` | string[] | `['npx', '-y', 'thoth-mem@latest']` | Local thoth MCP command |
| `thoth.data_dir` | string | unset | Custom thoth data directory |
| `artifactStore.mode` | string | `hybrid` | SDD artifact persistence target |
| `disabled_mcps` | string[] | `[]` | Globally disable built-in MCPs |

## Related Docs

- [Installation Guide](installation.md)
- [Provider Configurations](provider-configurations.md)
- [SDD Pipeline](sdd-pipeline.md)
- [Skills and MCPs](skills-and-mcps.md)
