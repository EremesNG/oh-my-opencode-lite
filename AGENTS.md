# oh-my-opencode-lite Agent Reference

## Project Overview

**oh-my-opencode-lite** is an OpenCode plugin for delegate-first agent
orchestration. It provides a seven-agent roster, async background delegation,
disk-persisted delegation results, thoth-mem integration, and bundled SDD
skills.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run build` | Build TypeScript into `dist/` |
| `bun run typecheck` | Run TypeScript type checking without emit |
| `bun test` | Run the Bun test suite |
| `bun run lint` | Run Biome linter |
| `bun run format` | Run Biome formatter |
| `bun run check` | Run Biome check with auto-fix |
| `bun run check:ci` | Run Biome check without writes |
| `bun run dev` | Run the plugin in local dev mode |

Single test:

```bash
bun test -t "pattern"
```

## Code Style

- Formatter/linter: **Biome**
- Line width: **80**
- Indentation: **2 spaces**
- Line endings: **LF**
- Quotes: **single quotes**
- Trailing commas: **always on**

### TypeScript Guidelines

- `strict` mode stays enabled
- Avoid explicit `any` outside justified exceptions
- Module resolution is `bundler`
- Keep types and runtime validation aligned

## 7-Agent Roster

| Agent | Role | Mode | Dispatch | Tool access |
| --- | --- | --- | --- | --- |
| `orchestrator` | root coordinator, sequencing, memory ownership | primary, non-mutating | sync coordinator | delegation tools + `thoth_mem`; deny workspace mutation/inspection |
| `explorer` | local codebase discovery | read-only | **async** via `background_task` | `read`, `glob`, `grep`, AST search, LSP read tools |
| `librarian` | external docs and public examples | read-only | **async** via `background_task` | research MCPs + local read/search |
| `oracle` | review, diagnosis, architecture, plan review | read-only | **sync** via `task` | local read/analysis tools |
| `designer` | UX/UI decisions, implementation, visual verification | write-capable | **sync** via `task` | local implementation tools; browser verification when needed |
| `quick` | narrow, bounded implementation | write-capable | **sync** via `task` | local implementation tools |
| `deep` | thorough implementation and verification | write-capable | **sync** via `task` | local implementation tools + full local verification |

## delegate-first Rules

- The orchestrator is **delegate-first** and must stay lean.
- Default delegation primitive is **`background_task`**.
- Use **`task`** only when the caller must block for a result or when the agent
  is write-capable.
- Read-only specialists do discovery; write-capable specialists change the repo.
- The orchestrator owns root-session state and should retain summaries, not raw
  sub-agent context.

### Delegation Decision Table

| Agent type | Mutates repo? | Default tool | Why |
| --- | --- | --- | --- |
| `explorer`, `librarian` | No | `background_task` | read-only work benefits from async isolation |
| `oracle` | No | `task` | advisory output is blocking and interactive |
| `designer`, `quick`, `deep` | Yes | `task` | sync execution preserves undo safety and reviewability |

If you mention a specialist and execution is required, dispatch it in the same
turn.

## Token Economics

Delegation is mandatory for non-trivial work because it protects the
orchestrator context.

- **Context scope isolation (~60% of savings):** sub-agent file reads do not
  pollute orchestrator history.
- **Compaction avoidance:** smaller root context delays or avoids lossy
  compaction.
- **Smaller failure domains:** sub-agent mistakes do not corrupt the main loop.

Rule of thumb:

- trivial 1-file edits may stay inline for a write agent
- multi-file discovery, SDD work, or long investigations should delegate
- large or multi-phase work should delegate by phase, not by file

## Background Delegation

- Background results persist to
  `~/.local/share/opencode/delegations/<project-id>/<root-session>/<task-id>.md`
  unless overridden by config.
- `project-id` is derived from git root + root commit; if git identity cannot be
  resolved, in-memory results still work but persistence is unavailable.
- `background_output` is the **waiter model**: launch now, continue working,
  retrieve or wait later.
- Persisted delegation records let results survive compaction and in-memory loss.
- Compaction recovery injects a capped delegation digest from the current
  root-session only.

## SDD Pipeline

Pipeline:

```text
propose -> [spec || design] -> tasks -> apply -> verify -> archive
```

Artifact dependency graph:

```text
proposal
  ├─> spec
  └─> design
       spec + design
            └─> tasks
                 └─> apply
                      └─> verify
                           └─> archive
```

State management:

- SDD artifacts persist through **thoth-mem** with deterministic
  `topic_key`s.
- Format: `sdd/{change-name}/{artifact}`
- Common keys: `proposal`, `spec`, `design`, `tasks`, `apply-progress`,
  `verify-report`, `archive-report`
- Search exact topic keys first; use filesystem OpenSpec artifacts as fallback
  only when the mode includes repo files.

## Thoth Persistent Memory Protocol

The orchestrator owns thoth-mem for the root session.

### When to search

- at session start for resumed or ambiguous work
- before repeating prior investigation
- before changing an area with likely historical decisions

### When to save

- decisions, architecture, bugfixes, discoveries, reusable patterns,
  configuration changes, learnings
- SDD artifacts and progress checkpoints

### Save format

```text
What: concise change or finding
Why: reason or problem solved
Where: files/paths/systems touched
Learned: edge cases or caveats
```

### Session close protocol

- Before ending the session, call `mem_session_summary`.
- Do not claim memory was saved unless the tool succeeded.
- Keep summaries short and durable.

### After compaction protocol

- First recover with `mem_context`.
- Then inspect exact `topic_key` records if SDD artifacts are needed.
- Continue without inventing missing memory.

## Tmux Session Lifecycle

Flow:

```text
session.create -> tmux pane spawn -> task runs
session.status=idle -> extract result -> session.abort -> session.deleted
-> tmux pane closes
```

Rules:

- Graceful shutdown sends `Ctrl+C`, waits briefly, then kills the pane.
- Call `session.abort()` **after** extracting task output.
- Keep both event handlers wired in `src/index.ts`:
  - background manager cleanup
  - tmux session manager pane cleanup

## Project Structure

```text
oh-my-opencode-lite/
├── AGENTS.md
├── openspec/
├── src/
│   ├── agents/
│   ├── background/
│   ├── cli/
│   ├── config/
│   ├── delegation/
│   ├── hooks/
│   ├── mcp/
│   ├── skills/
│   │   ├── _shared/
│   │   ├── cartography/
│   │   ├── sdd-propose/
│   │   ├── sdd-spec/
│   │   ├── sdd-design/
│   │   ├── sdd-tasks/
│   │   ├── sdd-apply/
│   │   ├── sdd-verify/
│   │   └── sdd-archive/
│   ├── thoth/
│   ├── tools/
│   └── utils/
├── docs/
├── dist/
├── package.json
├── biome.json
└── tsconfig.json
```

## Development Workflow

1. Make changes
2. Run `bun run check:ci`
3. Run `bun run typecheck`
4. Run `bun test`
5. Commit

## verification

Before claiming completion:

- verify code changes with the smallest sufficient automated checks
- prefer `deep` for correctness-critical implementation + verification
- keep evidence tied to files, tests, and diagnostics

## root-session Notes

- The orchestrator is the **root-session** owner.
- Delegation persistence, compaction recovery, and memory injection are scoped by
  `root-session`.
- Child/background sessions do not own durable memory; they return results to the
  root-session.
