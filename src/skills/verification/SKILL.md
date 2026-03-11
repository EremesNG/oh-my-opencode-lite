# Verification

Verify that work is actually complete and correct before claiming success.

## When to Use
- Before marking any task as complete
- Before telling the user "it's done" or "it's fixed"
- After subagent work, before accepting results

## Core Principle
Evidence before assertions. Run the command, read the output, THEN claim the result.

## Workflow

### 1. Identify Verification Command
What proves this work is correct?
- Tests: bun test (or specific test file)
- Types: bun run typecheck
- Lint: bun run check:ci
- Build: bun run build
- LSP: lsp_diagnostics on changed files
- Manual: specific expected behavior

### 2. Run the Command
Execute the verification command. Do not skip this step.

### 3. Read the FULL Output
- Check exit code (0 = success)
- Read error messages if any
- Don't assume success from partial output

### 4. Confirm or Fix
- If PASS: claim success with evidence ("Tests pass: 42 passed, 0 failed")
- If FAIL: fix the issue, then re-verify from step 2
- If PARTIAL: note what passes and what doesn't

## Anti-Patterns
- "I believe this should work" (without running it)
- "The tests should pass" (without actually running them)
- Reading only the last line of test output
- Claiming "fixed" after editing without re-running verification
- Skipping verification because "it's a small change"

## Minimum Verification Per Task
Every completed task should have at least:
1. lsp_diagnostics on all changed files (no new errors)
2. Relevant test suite passes (if tests exist)
3. Build succeeds (if applicable)
