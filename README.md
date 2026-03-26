<div align="center">
  <img src="img/team.png" alt="oh-my-opencode-lite agents" width="420">
  <p><i>Seven specialized agents, one orchestrator — delegate any task to the right specialist and ship faster.</i></p>
  <p><b>oh-my-opencode-lite</b> · Delegate-first orchestration · Thoth-mem persistence · Bundled SDD pipeline</p>
</div>

---

Delegate-first OpenCode plugin with a seven-agent roster, root-session
`thoth_mem` persistence, disk-backed delegation records, bundled brainstorming,
and a full SDD workflow.

oh-my-opencode-lite keeps the `orchestrator` lean, pushes discovery into
specialists, persists important context, and ships the planning skills needed
to move from ambiguous requests to verified implementation.

## 📦 Installation

### Quick start

```bash
bunx oh-my-opencode-lite@latest install
opencode auth login
opencode
```

Then ask OpenCode to verify the roster:

```text
ping all agents
```

### Non-interactive install

```bash
bunx oh-my-opencode-lite@latest install --no-tui --tmux=no --skills=yes
```

### Reset an existing generated config

```bash
bunx oh-my-opencode-lite@latest install --reset
```

When skills are enabled, the installer adds the recommended external skills and
copies the bundled brainstorming, cartography, plan-reviewer,
executing-plans, and SDD skills into your OpenCode skills directory.

### For LLM agents

Use the installer directly:

```bash
bunx oh-my-opencode-lite@latest install --no-tui --tmux=no --skills=yes
```

Or hand another coding agent this README:

```text
Install and configure oh-my-opencode-lite by following:
https://raw.githubusercontent.com/EremesNG/oh-my-opencode-lite/refs/heads/master/README.md
```

### JSON Schema

The package ships `oh-my-opencode-lite.schema.json` for editor autocomplete and
validation:

```jsonc
{
  "$schema": "https://unpkg.com/oh-my-opencode-lite@latest/oh-my-opencode-lite.schema.json"
}
```

See [docs/installation.md](docs/installation.md) and
[docs/provider-configurations.md](docs/provider-configurations.md) for the full
setup flow.

## 🏛️ Seven-Agent Roster

The delegate-first philosophy is simple: the `orchestrator` coordinates while
specialists execute. Read-only discovery work goes to async specialists for
context isolation. Advisory and write-capable work stays sync so review, undo
safety, and verification remain straightforward.

### 🔑 Primary Agent

<table width="100%">
  <tr>
    <td width="100%" valign="top">
      <img src="img/orchestrator.png" width="100%" alt="Orchestrator">
      <br>
      <b>Orchestrator</b>
      <br>
      <i>Root coordinator and sole primary agent.</i>
      <br><br>
      <b>Role:</b> The root coordinator. Handles delegation, sequencing, memory ownership, and SDD progress tracking. Does not read or modify source files directly.
      <br>
      <b>Mode:</b> primary, non-mutating
      <br>
      <b>Dispatch:</b> sync coordinator
      <br>
      <b>Recommended:</b>
      <br>
      <code>anthropic/claude-opus-4-6</code> · <code>openai/gpt-5.4</code> · <code>kimi-for-coding/k2p5</code>
      <br>
      <b>Personality:</b> Autonomous deep coordinator — multi-agent reasoning, works through delegation
    </td>
  </tr>
</table>

### 🛠️ Specialist Subagents

<table width="100%">
  <tr>
    <td width="33%" valign="top">
      <img src="img/explorer.png" width="100%" alt="Explorer">
      <br>
      <b>Explorer</b>
      <br>
      <i>Speed runner — fast parallel grep, codebase search.</i>
      <br><br>
      <b>Role:</b> Local codebase discovery and navigation. Fast parallel search, file reading, symbol lookup.
      <br>
      <b>Mode:</b> read-only
      <br>
      <b>Dispatch:</b> async via <code>background_task</code>
      <br>
      <b>Recommended:</b>
      <br>
      <code>Grok Code Fast</code> · <code>openai/gpt-5.4-nano</code> · <code>anthropic/claude-haiku-4-5</code>
    </td>
    <td width="33%" valign="top">
      <img src="img/librarian.png" width="100%" alt="Librarian">
      <br>
      <b>Librarian</b>
      <br>
      <i>All-rounder — large context + decent speed for research.</i>
      <br><br>
      <b>Role:</b> External docs and API research. Fetches documentation, finds public examples, validates version-specific behavior.
      <br>
      <b>Mode:</b> read-only
      <br>
      <b>Dispatch:</b> async via <code>background_task</code>
      <br>
      <b>Recommended:</b>
      <br>
      <code>openai/gpt-5.4</code> · <code>anthropic/claude-sonnet-4-6</code> · <code>google/gemini-3.1-pro-preview</code>
    </td>
    <td width="33%" valign="top">
      <img src="img/oracle.png" width="100%" alt="Oracle">
      <br>
      <b>Oracle</b>
      <br>
      <i>Deep reasoner — maximum strategic thinking capability.</i>
      <br><br>
      <b>Role:</b> Strategic advisor for debugging, architecture review, code review, and SDD plan review.
      <br>
      <b>Mode:</b> read-only
      <br>
      <b>Dispatch:</b> sync via <code>task</code>
      <br>
      <b>Recommended:</b>
      <br>
      <code>openai/gpt-5.4</code> · <code>anthropic/claude-opus-4-6</code> · <code>opencode-go/glm-5</code>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="img/designer.png" width="100%" alt="Designer">
      <br>
      <b>Designer</b>
      <br>
      <i>Visual/multimodal — UI/UX reasoning, frontend engineering.</i>
      <br><br>
      <b>Role:</b> UI/UX implementation with visual verification. Owns approach, execution, and browser-based quality checks.
      <br>
      <b>Mode:</b> write-capable
      <br>
      <b>Dispatch:</b> sync via <code>task</code>
      <br>
      <b>Recommended:</b>
      <br>
      <code>google/gemini-3.1-pro-preview</code> · <code>opencode-go/glm-5</code> · <code>kimi-for-coding/k2p5</code>
    </td>
    <td width="33%" valign="top">
      <img src="img/quick.png" width="100%" alt="Quick">
      <br>
      <b>Quick</b>
      <br>
      <i>Speed runner — well-defined tasks, fast turnaround.</i>
      <br><br>
      <b>Role:</b> Fast implementation for well-defined, bounded tasks. Optimized for speed over thoroughness.
      <br>
      <b>Mode:</b> write-capable
      <br>
      <b>Dispatch:</b> sync via <code>task</code>
      <br>
      <b>Recommended:</b>
      <br>
      <code>openai/gpt-5.4-mini</code> · <code>anthropic/claude-haiku-4-5</code> · <code>google/gemini-3-flash-preview</code>
    </td>
    <td width="33%" valign="top">
      <img src="img/deep.png" width="100%" alt="Deep">
      <br>
      <b>Deep</b>
      <br>
      <i>Deep specialist — maximum coding capability for complex tasks.</i>
      <br><br>
      <b>Role:</b> Thorough implementation and verification. Handles correctness-critical, multi-file, edge-case-heavy work.
      <br>
      <b>Mode:</b> write-capable
      <br>
      <b>Dispatch:</b> sync via <code>task</code>
      <br>
      <b>Recommended:</b>
      <br>
      <code>openai/gpt-5.4</code> · <code>anthropic/claude-opus-4-6</code> · <code>google/gemini-3.1-pro-preview</code>
    </td>
  </tr>
</table>

## 🧩 What oh-my-opencode-lite Adds

- Delegate-first orchestration with context isolation across specialists
- `thoth_mem` persistence for root-session memory workflows
- Disk-persisted delegation results that survive compaction and in-memory loss
- Bundled SDD pipeline: `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`,
  `sdd-apply`, `sdd-verify`, `sdd-archive`
- Brainstorming skill with clarification-gate hook for ambiguous work
- `plan-reviewer` for oracle review loops on task plans
- `executing-plans` for task-state ownership and progress tracking
- `cartography` for repository mapping and codemap generation
- Tmux integration for real-time agent monitoring
- Configurable presets, fallback chains, prompt overriding, and artifact-store
  modes

Delegation records persist under:

```text
~/.local/share/opencode/delegations/<project-id>/<root-session-id>/<task-id>.md
```

## SDD Pipeline

The bundled SDD workflow follows this path:

```text
propose -> [spec || design] -> tasks -> apply -> verify -> archive
```

For medium work, brainstorming can route into an accelerated path that starts at
`propose -> tasks`. For complex work, the full path is used.

Artifacts can be persisted in three modes:

| Mode | Writes to | Use when |
| --- | --- | --- |
| `thoth-mem` | Memory only | Fast iteration without repo planning files |
| `openspec` | `openspec/` files only | Reviewable planning artifacts in the repo |
| `hybrid` | Both | Maximum durability; default |

After `sdd-tasks`, the orchestrator can run an oracle review loop with
`plan-reviewer`:

1. Generate `tasks.md`
2. Dispatch oracle with `plan-reviewer`
3. If result is `[REJECT]`, fix only the blocking issues
4. Repeat until `[OKAY]`
5. Continue into execution

During execution, `executing-plans` owns task-state tracking:

- `- [ ]` pending
- `- [~]` in progress
- `- [x]` completed
- `- [-]` skipped with reason

## Brainstorming & Clarification Gate

The bundled `brainstorming` skill is the front door for ambiguous or substantial
work. Its workflow is six phases:

1. Context gathering
2. Interview
3. Scope assessment
4. Approach proposal
5. User approval
6. Handoff

The clarification-gate hook can auto-detect requests that should go through this
flow before implementation. It checks for explicit planning keywords plus scope
signals such as multi-view work, API/data changes, restructuring, multi-layer
impact, business-language requests, open-ended phrasing, and cross-directory
scope. When triggered, it injects a reminder for the `orchestrator` to load the
brainstorming skill, ask one clarifying question at a time, and wait for
explicit approval before coding.

## 🧩 Skills & MCP Servers

### Bundled skills

| Skill | Category | Purpose |
| --- | --- | --- |
| `brainstorming` | Clarification | Clarify intent, assess scope, and choose direct work vs accelerated or full SDD |
| `cartography` | Discovery | Generate and update hierarchical repository codemaps |
| `plan-reviewer` | Review | Validate `tasks.md` for real execution blockers and return `[OKAY]` or `[REJECT]` |
| `sdd-propose` | SDD | Create or update `proposal.md` |
| `sdd-spec` | SDD | Write OpenSpec delta specs with RFC 2119 requirements and scenarios |
| `sdd-design` | SDD | Produce `design.md` with technical decisions and file changes |
| `sdd-tasks` | SDD | Generate phased `tasks.md` checklists |
| `sdd-apply` | SDD | Execute assigned SDD tasks and report structured results |
| `executing-plans` | Execution | Run task lists with durable progress tracking and verification checkpoints |
| `sdd-verify` | Verification | Create compliance-oriented verification reports |
| `sdd-archive` | Archive | Merge verified deltas into main specs and archive the change |

### Recommended external skills

| Skill | Status | Typical use |
| --- | --- | --- |
| `simplify` | Installed by `--skills=yes` | Keep solutions lean and reduce unnecessary complexity |
| `agent-browser` | Installed by `--skills=yes` | Browser automation for `designer` visual checks |
| `test-driven-development` | Optional companion | Useful before implementing bug fixes or features with `deep` |
| `systematic-debugging` | Optional companion | Useful for `oracle` and `deep` when failures need disciplined diagnosis |

### Built-in MCP servers

| MCP | Purpose | Auth / runtime |
| --- | --- | --- |
| `websearch` | Exa-backed web search | Optional `EXA_API_KEY` via env |
| `context7` | Official library and framework docs | Optional `CONTEXT7_API_KEY` via env |
| `grep_app` | Public GitHub code search | No auth required |
| `thoth_mem` | Local persistent memory and artifact storage | Local command, default `npx -y thoth-mem@latest` |

> **🧠 [Thoth-Mem](https://github.com/EremesNG/thoth-mem)** is a persistent
> memory MCP server purpose-built for cross-session context. The orchestrator
> uses it to save architectural decisions, bug-fix learnings, SDD artifacts,
> and session summaries so the next session picks up where the last one left
> off — even after context-window compaction. It is included by default and
> runs locally via `npx`.

Skill and MCP access in this project is prompt-driven. The generated plugin
config focuses on model presets and runtime options rather than per-agent
permission matrices.

## 📚 Documentation

- [docs/installation.md](docs/installation.md)
- [docs/provider-configurations.md](docs/provider-configurations.md)
- [docs/tmux-integration.md](docs/tmux-integration.md)
- [docs/quick-reference.md](docs/quick-reference.md)
- [docs/cartography.md](docs/cartography.md)
- [docs/sdd-pipeline.md](docs/sdd-pipeline.md)
- [docs/skills-and-mcps.md](docs/skills-and-mcps.md)
- [AGENTS.md](AGENTS.md)

## Development

| Command | Purpose |
| --- | --- |
| `bun run build` | Build TypeScript into `dist/` |
| `bun run typecheck` | Run TypeScript type checking without emit |
| `bun test` | Run the Bun test suite |
| `bun run lint` | Run Biome linter |
| `bun run format` | Run Biome formatter |
| `bun run check` | Run Biome check with auto-fix |
| `bun run check:ci` | Run Biome check without writes |
| `bun run dev` | Build and launch the plugin in local dev mode |

## 📄 License

MIT
