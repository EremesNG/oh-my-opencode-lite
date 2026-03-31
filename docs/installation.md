# Installation Guide

Complete installation instructions for oh-my-opencode-lite.

## Table of Contents

- [For Humans](#for-humans)
- [For LLM Agents](#for-llm-agents)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

---

## For Humans

### Prerequisites

- [OpenCode](https://opencode.ai/docs)
- [Bun](https://bun.sh)

### Quick Install

Run the interactive installer:

```bash
bunx oh-my-opencode-lite@latest install
```

Or use non-interactive mode:

```bash
bunx oh-my-opencode-lite@latest install --no-tui --tmux=no --skills=yes
```

### What the Installer Sets Up

The installer generates an OpenAI-based config by default and prepares the
delegate-first seven-agent roster for OpenCode.

When skills are enabled, it also installs or copies:

- Bundled `requirements-interview`
- Bundled `cartography`
- Bundled `plan-reviewer`
- Bundled `executing-plans`
- Bundled SDD pipeline skills:
  `sdd-init`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`,
  `sdd-verify`, `sdd-archive`
- Recommended external skills such as `simplify` and `agent-browser`

In other words, requirements-interview and the SDD pipeline are included as part of the
standard oh-my-opencode-lite workflow rather than something you assemble by
hand later.

### Configuration Options

| Option | Description |
| --- | --- |
| `--tmux=yes|no` | Enable tmux integration |
| `--skills=yes|no` | Install recommended external skills and bundled repo skills |
| `--no-tui` | Run without the interactive installer UI |
| `--dry-run` | Simulate install without writing files |
| `--reset` | Overwrite an existing generated configuration |

### Non-Destructive Behavior

By default, the installer is non-destructive. If an
`oh-my-opencode-lite.json` configuration file already exists, the installer does
not overwrite it.

To force overwrite of your existing configuration, use `--reset`:

```bash
bunx oh-my-opencode-lite@latest install --reset
```

The installer creates a `.bak` backup before overwriting.

### After Installation

Authenticate with your provider:

```bash
opencode auth login
```

Then start OpenCode and verify the roster:

```bash
opencode
```

Inside OpenCode:

```text
ping all agents
```

The generated config uses sensible defaults, but you can assign different models
to different agents by editing:

- `~/.config/opencode/oh-my-opencode-lite.json`
- or `~/.config/opencode/oh-my-opencode-lite.jsonc`

For alternative providers and mixed-model presets, see
[Provider Configurations](provider-configurations.md).

### Alternative: Ask Any Coding Agent

Paste this into Claude Code, Cursor, AmpCode, or any coding agent:

```text
Install and configure oh-my-opencode-lite by following the instructions here:
https://raw.githubusercontent.com/EremesNG/oh-my-opencode-lite/refs/heads/master/README.md
```

---

## For LLM Agents

If you are helping a user set up oh-my-opencode-lite, use this sequence.

### Step 1: Check OpenCode Installation

```bash
opencode --version
```

If OpenCode is not installed, direct the user to https://opencode.ai/docs.

### Step 2: Run the Installer

```bash
bunx oh-my-opencode-lite@latest install --no-tui --tmux=no --skills=yes
```

Examples:

```bash
# Interactive install
bunx oh-my-opencode-lite@latest install

# Non-interactive with tmux and skills
bunx oh-my-opencode-lite@latest install --no-tui --tmux=yes --skills=yes

# Non-interactive without tmux or skills
bunx oh-my-opencode-lite@latest install --no-tui --tmux=no --skills=no

# Force overwrite existing configuration
bunx oh-my-opencode-lite@latest install --reset
```

With skills enabled, the install includes the requirements-interview skill, the bundled
SDD pipeline, `plan-reviewer`, `executing-plans`, and cartography in addition to
recommended external skills.

### Step 3: Ask the User to Authenticate

Do not run this yourself if user interaction is required:

```bash
opencode auth login
```

### Step 4: Ask the User to Verify Installation

1. Start OpenCode: `opencode`
2. Run: `ping all agents`

All seven agents should respond.

### Step 5: Point the User to Follow-Up Docs

- [Provider Configurations](provider-configurations.md)
- [Quick Reference](quick-reference.md)
- [SDD Pipeline](sdd-pipeline.md)
- [Skills and MCPs](skills-and-mcps.md)

---

## Troubleshooting

### Installer Fails

Check the installer options:

```bash
bunx oh-my-opencode-lite@latest install --help
```

### Configuration Already Exists

If the installer reports that a config already exists, either keep it or reset
it:

```bash
bunx oh-my-opencode-lite@latest install --reset
```

### Agents Not Responding

1. Check auth status:

   ```bash
   opencode auth status
   ```

2. Verify the plugin config exists:

   - `~/.config/opencode/oh-my-opencode-lite.json`
   - `~/.config/opencode/oh-my-opencode-lite.jsonc`

3. Confirm the provider is configured in OpenCode.

### Editor Validation

Add a `$schema` reference for autocomplete and inline validation:

```jsonc
{
  "$schema": "https://unpkg.com/oh-my-opencode-lite@latest/oh-my-opencode-lite.schema.json"
}
```

### Tmux Integration Not Working

Run OpenCode with a port that matches `OPENCODE_PORT`:

```bash
tmux
export OPENCODE_PORT=4096
opencode --port 4096
```

See the [Tmux Integration Guide](tmux-integration.md) for more detail.

---

## Uninstallation

1. Remove `"oh-my-opencode-lite"` from the `plugin` array in
   `~/.config/opencode/opencode.json` (or `opencode.jsonc`)
2. Optionally remove generated config files:

   ```bash
   rm -f ~/.config/opencode/oh-my-opencode-lite.json
   rm -f ~/.config/opencode/oh-my-opencode-lite.jsonc
   rm -f ~/.config/opencode/oh-my-opencode-lite.json.bak
   ```

3. Optionally remove recommended external skills:

   ```bash
   npx skills remove simplify
   npx skills remove agent-browser
   ```
