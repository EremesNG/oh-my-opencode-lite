<div align="center">
  <img src="img/team.png" alt="Pantheon agents" width="420">
  <p><i>Nine specialized beings emerged from the dawn of code, each an immortal master of their craft awaiting your command to forge order from chaos and build what was once thought impossible.</i></p>
  <p><b>Open Multi Agent Suite</b> · Mix any models · Auto delegate tasks</p>
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

> ⚠️ **Note on Antigravity:** Please read the [Antigravity Setup Guide](docs/antigravity.md) carefully before installing, as it contains important information regarding Google's Terms of Service and account safety.

---

## 🏛️ Meet the Pantheon

The suite is powered by three primary agents that drive the development lifecycle, supported by a team of specialized subagents. The v2 scoring engine automatically matches **model personality** (communicator, deep-specialist, speed-runner) to each agent's role.

### 🔑 Primary Agents

<table width="100%">
  <tr>
    <td width="33%" valign="top">
      <img src="img/planner.png" width="100%" alt="Planner">
      <br>
      <b>Planner</b>
      <br>
      <i>Requirements analyst and plan architect.</i>
      <br><br>
      <b>Role:</b> Interviews users, explores codebase, and creates structured implementation plans in <code>.omolite/plans/</code>.
      <br>
      <b>Prompt:</b> <a href="src/agents/planner.ts">planner.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>claude-opus</code>, <code>kimi-k2.5</code>, <code>gemini-pro</code>
      <br>
      <b>Personality:</b> Communicator — follows complex orchestration prompts
    </td>
    <td width="33%" valign="top">
      <img src="img/architect.png" width="100%" alt="Architect">
      <br>
      <b>Architect</b>
      <br>
      <i>Plan execution orchestrator.</i>
      <br><br>
      <b>Role:</b> Breaks down approved plans into actionable tasks and coordinates their execution across the team.
      <br>
      <b>Prompt:</b> <a href="src/agents/architect.ts">architect.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>claude-opus</code>, <code>kimi-k2.5</code>, <code>gemini-pro</code>
      <br>
      <b>Personality:</b> Communicator — structured delegation and coordination
    </td>
    <td width="33%" valign="top">
      <img src="img/engineer.png" width="100%" alt="Engineer">
      <br>
      <b>Engineer</b>
      <br>
      <i>Main development orchestrator.</i>
      <br><br>
      <b>Role:</b> The primary interface for coding tasks. Handles implementation, debugging, and direct codebase modifications.
      <br>
      <b>Prompt:</b> <a href="src/agents/engineer.ts">engineer.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>gpt-5-codex</code>, <code>claude-opus</code>
      <br>
      <b>Personality:</b> Autonomous deep coder — multi-file reasoning, works independently
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
      <b>Role:</b> Codebase discovery and navigation.
      <br>
      <b>Prompt:</b> <a href="src/agents/explorer.ts">explorer.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>gemini-flash</code>, <code>claude-haiku</code>, <code>grok-code-fast</code>
      <br>
      <b>Personality:</b> Speed runner — fast parallel grep, codebase search
    </td>
    <td width="33%" valign="top">
      <img src="img/librarian.png" width="100%" alt="Librarian">
      <br>
      <b>Librarian</b>
      <br>
      <b>Role:</b> External docs and API research.
      <br>
      <b>Prompt:</b> <a href="src/agents/librarian.ts">librarian.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>gemini-flash</code>, <code>claude-haiku</code>, <code>minimax-m2</code>
      <br>
      <b>Personality:</b> Speed runner / all-rounder — large context + decent speed
    </td>
    <td width="33%" valign="top">
      <img src="img/oracle.png" width="100%" alt="Oracle">
      <br>
      <b>Oracle</b>
      <br>
      <b>Role:</b> Strategic advisor for hard decisions.
      <br>
      <b>Prompt:</b> <a href="src/agents/oracle.ts">oracle.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>gpt-5.4</code>, <code>gemini-pro</code>, <code>claude-opus</code>
      <br>
      <b>Personality:</b> Deep reasoner — maximum strategic thinking capability
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="img/designer.png" width="100%" alt="Designer">
      <br>
      <b>Designer</b>
      <br>
      <b>Role:</b> UI/UX specialist.
      <br>
      <b>Prompt:</b> <a href="src/agents/designer.ts">designer.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>gemini-pro</code>, <code>kimi-k2.5</code>, <code>claude-sonnet</code>
      <br>
      <b>Personality:</b> Visual/multimodal — UI/UX reasoning, frontend engineering
    </td>
    <td width="33%" valign="top">
      <img src="img/quick.png" width="100%" alt="Quick">
      <br>
      <b>Quick</b>
      <br>
      <b>Role:</b> Fast implementation specialist.
      <br>
      <b>Prompt:</b> <a href="src/agents/junior.ts">junior.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>gemini-flash</code>, <code>claude-haiku</code>, <code>grok-code-fast</code>
      <br>
      <b>Personality:</b> Speed runner — well-defined tasks, fast turnaround
    </td>
    <td width="33%" valign="top">
      <img src="img/deep.png" width="100%" alt="Deep">
      <br>
      <b>Deep</b>
      <br>
      <b>Role:</b> Thorough implementation specialist.
      <br>
      <b>Prompt:</b> <a href="src/agents/junior.ts">junior.ts</a>
      <br>
      <b>Default:</b> Runtime-resolved
      <br>
      <b>Recommended:</b> <code>gpt-5-codex</code>, <code>claude-opus</code>, <code>kimi-k2.5</code>
      <br>
      <b>Personality:</b> Deep specialist — maximum coding capability for complex tasks
    </td>
  </tr>
</table>

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
