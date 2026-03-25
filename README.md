# oh-my-opencode-lite

Delegate-first OpenCode plugin for the **oh-my-opencode-lite** workflow: seven agents,
disk-persisted delegations, **thoth-mem** integration, and bundled SDD skills.

## Install

```bash
bunx oh-my-opencode-lite@latest install
```

Non-interactive install:

```bash
bunx oh-my-opencode-lite@latest install --no-tui --tmux=no --skills=yes
```

Reset an existing generated config:

```bash
bunx oh-my-opencode-lite@latest install --reset
```

Default install writes an OpenAI-based config with the oh-my-opencode-lite roster,
recommended external skills, and bundled custom/SDD skills.

## Seven-agent roster

- **orchestrator** — root coordinator, delegation, memory ownership
- **explorer** — local codebase discovery
- **librarian** — external docs/examples research
- **oracle** — review, diagnosis, architecture guidance
- **designer** — UX/UI-focused implementation
- **quick** — narrow, bounded implementation
- **deep** — thorough implementation and verification

## What oh-my-opencode-lite adds

- **thoth-mem persistence** for root-session memory workflows
- **Delegation storage** on disk so background results survive compaction and
  in-memory loss
- **Bundled SDD skills**: `sdd-propose`, `sdd-spec`, `sdd-design`,
  `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-archive`
- Shared skill assets under `_shared/` for OpenSpec/thoth conventions

Delegation records are stored under:

```text
~/.local/share/opencode/delegations/<project-id>/<root-session-id>/<task-id>.md
```

## JSON Schema

The package ships `oh-my-opencode-lite.schema.json` for editor autocomplete and
validation:

```jsonc
{
  "$schema": "https://unpkg.com/oh-my-opencode-lite@latest/oh-my-opencode-lite.schema.json"
}
```

## Docs

- [docs/installation.md](docs/installation.md)
- [docs/provider-configurations.md](docs/provider-configurations.md)
- [docs/tmux-integration.md](docs/tmux-integration.md)
- [docs/quick-reference.md](docs/quick-reference.md)

## License

MIT
