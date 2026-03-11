<div align="center">
  <img src="img/team.png" alt="Pantheon agents" width="420">
  <p><i>Nine specialized beings emerged from the dawn of code, each an immortal master of their craft awaiting your command to forge order from chaos and build what was once thought impossible.</i></p>
  <p><b>Open Multi Agent Suite</b> · Mix any models · Auto delegate tasks</p>
  <p><a href="https://moltfounders.com/jobs/09d1c6e7-9e0e-4683-8d78-e2376aaa2333"><img src="https://moltfounders.com/badges/4.png" alt="MoltFounders" height="30"></a></p>
</div>

---

## 📦 Installation

### Quick Start

```bash
bunx oh-my-opencode-lite@latest install
```

The installer can refresh and use OpenCode free models directly:

```bash
bunx oh-my-opencode-lite@latest install --no-tui --kimi=yes --openai=yes --antigravity=yes --chutes=yes --opencode-free=yes --opencode-free-model=auto --tmux=no --skills=yes
```

Then authenticate:

```bash
opencode auth login
```

Run `ping all agents` to verify everything works.

OpenCode free-model mode uses `opencode models --refresh --verbose`, filters to free `opencode/*` models, and applies coding-first selection:
- OpenCode-only mode can use multiple OpenCode free models across agents.
- Hybrid mode can combine OpenCode free models with OpenAI, Kimi, and/or Antigravity.
- In hybrid mode, `designer` stays on the external provider mapping.
- Chutes mode auto-selects primary/support models with daily-cap awareness (300/2000/5000).

> **💡 Models are fully customizable.** Edit `~/.config/opencode/omolite.json` (or `.jsonc` for comments support) to assign any model to any agent.

Plugin config can be defined at both levels:
- User: `~/.config/opencode/omolite.json` or `~/.config/opencode/omolite.jsonc`
- Project: `.opencode/omolite.json` or `.opencode/omolite.jsonc` (overrides user config)

Supported agent keys in `agents`/`fallback.chains`/`manualPlan`:
- `planner`, `architect`, `engineer`, `explorer`, `librarian`, `oracle`, `designer`, `quick`, `deep`

### For LLM Agents

Paste this into any coding agent:

```
Install and configure by following the instructions here:
https://raw.githubusercontent.com/EremesNG/oh-my-opencode-lite/refs/heads/master/README.md
```

**Detailed installation guide:** [docs/installation.md](docs/installation.md)

**Additional guides:**
- **[Antigravity Setup](docs/antigravity.md)** - Complete guide for Antigravity provider configuration  
- **[Tmux Integration](docs/tmux-integration.md)** - Real-time agent monitoring with tmux

---

## 🏛️ Meet the Pantheon

### Primary Agents

| Agent | Role | Prompt | Default Model |
|---|---|---|---|
| `planner` | Requirements analyst and plan writer (`.omolite/plans/`) | [`src/agents/planner.ts`](src/agents/planner.ts) | Runtime-resolved (preset/fallback) |
| `architect` | Plan execution orchestrator | [`src/agents/architect.ts`](src/agents/architect.ts) | Runtime-resolved (preset/fallback) |
| `engineer` (Orchestrator) | Main development orchestrator and delegator | [`src/agents/engineer.ts`](src/agents/engineer.ts) | Runtime-resolved (preset/fallback) |

### Specialist Subagents

| Agent | Role | Prompt | Default Model |
|---|---|---|---|
| `explorer` | Codebase discovery and navigation | [`src/agents/explorer.ts`](src/agents/explorer.ts) | `openai/gpt-5.1-codex-mini` |
| `librarian` | External docs and API research | [`src/agents/librarian.ts`](src/agents/librarian.ts) | `openai/gpt-5.1-codex-mini` |
| `oracle` | Strategic advisor for hard decisions/debugging | [`src/agents/oracle.ts`](src/agents/oracle.ts) | `openai/gpt-5.2-codex` |
| `designer` | UI/UX specialist | [`src/agents/designer.ts`](src/agents/designer.ts) | `kimi-for-coding/k2p5` |
| `quick` | Fast implementation specialist | [`src/agents/junior.ts`](src/agents/junior.ts) | `openai/gpt-5.1-codex-mini` |
| `deep` | Thorough implementation specialist | [`src/agents/junior.ts`](src/agents/junior.ts) | `openai/gpt-5.3-codex` |

### Aliases (Backward Compatibility)

- `explore` -> `explorer`
- `plan` -> `planner`
- `arch` -> `architect`
- `eng` -> `engineer`
- `fix` -> `quick`
- `junior` -> `quick`
- `frontend-ui-ux-engineer` -> `designer`

---

## 📚 Documentation

- **[Quick Reference](docs/quick-reference.md)** - Presets, Skills, MCPs, Tools, Configuration
- **[Installation Guide](docs/installation.md)** - Detailed installation and troubleshooting
- **[Cartography Skill](docs/cartography.md)** - Custom skill for repository mapping + codemap generation
- **[Antigravity Setup](docs/antigravity.md)** - Complete guide for Antigravity provider configuration
- **[Tmux Integration](docs/tmux-integration.md)** - Real-time agent monitoring with tmux

---

## 📄 License

MIT

---

<!-- MoltFounders Banner -->
<a href="https://moltfounders.com/jobs/09d1c6e7-9e0e-4683-8d78-e2376aaa2333">
  <img src="img/moltfounders-banner.png" alt="MoltFounders - The Agent Co-Founder Network">
</a>
