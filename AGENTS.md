# oh-my-opencode-lite Agent Reference

## Project Overview

**oh-my-opencode-lite** is an OpenCode plugin for delegate-first agent
orchestration. It provides a seven-agent roster, async background delegation,
disk-persisted delegation results, thoth-mem integration, bundled SDD
skills, and a requirements-interview skill for clarifying ambiguous work.

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
- Independent delegations should be launched together in the same response.
- If a `background_task` returns empty or contradictory results, retry once with
  a more specific prompt; if the retry fails, report the limitation to the
  user.
- Maximum retries per delegated task: one after the initial attempt.
- **NEVER** request full file contents from sub-agents. Sub-agents analyze
  files internally and return insights — they do not relay raw content.
- Always request only what you need to decide: insights, symbol locations, line
  ranges, diff summaries, or verification outcomes — never raw file dumps.
  Sub-agents handle large content; you handle decisions.

Blocking user decisions MUST go through the `question` tool. Agents must never
ask those questions in plain prose, because that breaks the handoff and pause
contract for interactive decisions.

### Delegation Decision Table

| Agent type | Mutates repo? | Default tool | Why |
| --- | --- | --- | --- |
| `explorer`, `librarian` | No | `background_task` | read-only work benefits from async isolation |
| `oracle` | No | `task` | advisory output is blocking and interactive |
| `designer`, `quick`, `deep` | Yes | `task` | sync execution preserves undo safety and reviewability |

If you mention a specialist and execution is required, dispatch it in the same
turn.

### Sub-Agent Request Refinement

- If a sub-agent does not return the detail you expected, refine your request
  with specific questions — **NEVER** fall back to reading the file yourself.
  The orchestrator reading workspace files is an emergency-only last resort.
- Delegation failure is a signal to ask better questions, not to bypass
  delegation.

### Git Safety for Sub-Agents

Sub-agents MUST NOT run destructive git commands that discard working-tree
changes:

- `git restore`
- `git checkout -- <path>`
- `git reset --hard`
- `git clean`
- `git stash`

During SDD execution, files modified by prior tasks are cumulative progress.
A sub-agent that "cleans up" those changes destroys the entire pipeline.

This rule is enforced globally via `SUBAGENT_RULES` in
`src/agents/prompt-utils.ts`. The `@quick` agent has additional
reinforcement in its own instructions because it is the most frequent
offender.

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

### HARD GATE

- Every SDD phase that produces an artifact MUST be dispatched to a
  **write-capable** agent (`@deep` or `@quick`) with the corresponding skill.
- `@oracle` is **read-only**. NEVER use oracle to execute SDD artifact phases
  (propose, spec, design, tasks, apply). Oracle is ONLY for plan-review.
- NEVER skip artifact creation. Each phase MUST produce its persistent artifact
  before the next phase begins.
- NEVER jump from requirements-interview directly to implementation. The approved
  SDD route MUST be followed phase by phase.
- NEVER execute SDD tasks without first loading the `executing-plans`
  skill via the skill tool. Reading artifacts and delegating directly is a
  protocol violation. The skill MUST be loaded BEFORE the first task dispatch.

### Pipelines

**Accelerated SDD** (`propose -> tasks`):

1. Dispatch `@deep` with skill `sdd-propose`. Wait for result. Verify artifact.
2. Dispatch `@deep` with skill `sdd-tasks`. Wait for result. Verify artifact.
3. Plan-review gate (see "Oracle Plan Review Gate" below).
4. **Load the `executing-plans` skill** via the skill tool. This is mandatory
   and must happen before any task dispatch.
5. Proceed to execution with `sdd-apply`.

**Full SDD** (`propose -> spec -> design -> tasks`):

1. Dispatch `@deep` with skill `sdd-propose`. Wait for result. Verify artifact.
2. Dispatch `@deep` with skill `sdd-spec`. Wait for result. Verify artifact.
3. Dispatch `@deep` with skill `sdd-design`. Wait for result. Verify artifact.
4. Dispatch `@deep` with skill `sdd-tasks`. Wait for result. Verify artifact.
5. Plan-review gate (see "Oracle Plan Review Gate" below).
6. **Load the `executing-plans` skill** via the skill tool. This is mandatory
   and must happen before any task dispatch.
7. Proceed to execution with `sdd-apply`.

**Post-execution**: `sdd-verify` then `sdd-archive` (both via `@deep`).

Run `sdd-init` before the pipeline whenever `openspec/` does not yet exist.

### Dispatch Contract

When dispatching an SDD phase, the prompt MUST include:

1. `Load skill sdd-{phase} and follow it exactly.`
2. `Persistence mode: {mode}` (thoth-mem / openspec / hybrid / none).
3. `Pipeline type: {type}` (accelerated / full).
4. `Change name: {change-name}`
5. `Project: {project-name}` (for thoth-mem persistence).
6. Any prior artifact context the phase needs.

Dispatch target by phase:

| Phase | Agent | Why |
| --- | --- | --- |
| `sdd-init` | `@deep` or `@quick` | Write-capable, creates openspec/ structure |
| `sdd-propose` | `@deep` | Write-capable, creates proposal artifact |
| `sdd-spec` | `@deep` | Write-capable, creates spec artifact |
| `sdd-design` | `@deep` | Write-capable, needs codebase analysis + file creation |
| `sdd-tasks` | `@deep` | Write-capable, creates tasks artifact |
| `plan-reviewer` | `@oracle` | Read-only — the ONLY phase that uses oracle |
| `sdd-apply` | `@deep` or `@quick` | Write-capable, implements code changes |
| `sdd-verify` | `@deep` | Write-capable, runs verification |
| `sdd-archive` | `@deep` | Write-capable, archives change |

### Artifact Verification

After each SDD phase dispatch returns, verify the artifact exists:
- If mode includes openspec: confirm the sub-agent reported the file path.
- If mode includes thoth-mem: confirm the sub-agent reported the topic_key.
- If verification fails, retry the phase once. If it fails again, report to
  user via `question`.

### State Management

- SDD artifacts persist through **thoth-mem** with deterministic `topic_key`s.
- Format: `sdd/{change-name}/{artifact}`
- Common keys: `proposal`, `spec`, `design`, `design-brief`, `tasks`,
  `apply-progress`, `verify-report`, `archive-report`
- Search exact topic keys using the 3-layer recall protocol (see below); use
  filesystem OpenSpec artifacts as fallback only when the mode includes repo
  files.

## Requirements Interview

Ambiguous or substantial work starts with the bundled `requirements-interview` skill.
The requirements interview produces an approved direction and routes into:
- direct implementation for low-complexity work (no high dimensions,
  at most one medium, low contract sensitivity and failure cost)
- accelerated SDD (`propose -> tasks`) for moderate complexity
  (2-3 medium dimensions or one high in logic/context/discovery,
  but contract sensitivity and failure cost are not high)
- full SDD (`propose -> spec -> design -> tasks`) for high complexity
  (high contract sensitivity, high failure cost, 2+ high dimensions,
  or high discovery need combined with other medium/high dimensions)

### Artifact Store Policy

Before starting SDD, the user chooses a persistence mode:

| Mode | Write targets | Token cost | Use when |
| --- | --- | --- | --- |
| `thoth-mem` | Memory only | Low | Quick iterations, no repo files |
| `openspec` | Files only | Medium | Visible, reviewable artifacts |
| `hybrid` | Both | High | Maximum durability (default) |
| `none` | Neither | Lowest | Ephemeral iterations, no artifact persistence |

### Oracle Plan Review Gate

After SDD tasks are generated, the orchestrator uses `question` to ask the user:
- "Review plan with @oracle before executing (Recommended)" — thorough review
  for correctness
- "Proceed to execution" — skip review and start implementing

If the user chooses review:
1. Dispatch `@oracle` (the ONLY SDD phase that uses oracle) with `plan-reviewer`
   skill.
2. If `[OKAY]`: proceed to execution via `@deep` or `@quick` with `sdd-apply`.
3. If `[REJECT]`: dispatch `@deep` to fix the blocking issues listed by oracle,
   then re-dispatch `@oracle` for another review.
4. Repeat the review loop until `@oracle` returns `[OKAY]`. Do NOT proceed to
   execution while the plan is `[REJECT]`.

### Task Progress Tracking

During execution, the orchestrator owns progress tracking via the
`executing-plans` skill. The orchestrator updates task state in real time:
- `- [ ]` Pending
- `- [~]` In progress
- `- [x]` Completed
- `- [-]` Skipped (with reason)

Progress tracking has two mandatory layers:
- `todowrite`: macro-level visual task list for the user; always active for
  multi-step work
- persistent SDD artifact: canonical task checkboxes in `tasks.md` and/or
  `thoth-mem`

Both layers must be updated before dispatching work and again after results are
received.

Execution sub-agents report structured results back to the orchestrator. They do
not update task checkboxes themselves.

## Thoth Persistent Memory Protocol

The orchestrator owns thoth-mem for the root session.

### When to search

Two retrieval patterns:

**Broad recovery** (session start, after compaction):
- Use `mem_context` for recent-session overview and quick context injection

**Targeted 3-layer recall** (specific memory retrieval):
1. `mem_search` with compact index (default) — scan IDs + titles to identify
   promising observations
2. `mem_timeline` — get chronological context around candidates to disambiguate
3. `mem_get_observation` — retrieve full content only for records you need
- Note: use `mode: "preview"` only when compact results are insufficient to
  disambiguate

Search proactively:
- at session start for resumed or ambiguous work
- before repeating prior investigation
- before changing an area with likely historical decisions

### When to save

- decisions, architecture, bugfixes, discoveries, reusable patterns,
  configuration changes, learnings
- SDD artifacts and progress checkpoints
- An automatic save nudge reminds the orchestrator to persist observations
  after each completed task.

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

- First recover with `mem_context` (broad overview).
- Then use 3-layer recall for specific `topic_key` records if SDD artifacts are
  needed.
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
│   ├── mcp/
│   ├── skills/
│   │   ├── _shared/
│   │   ├── requirements-interview/
│   │   ├── cartography/
│   │   ├── executing-plans/
│   │   ├── plan-reviewer/
│   │   ├── sdd-init/
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

This project uses `@opencode-ai/plugin` and `@opencode-ai/sdk` v1.4.0; keep
workflow notes and examples aligned with that SDK version.

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
