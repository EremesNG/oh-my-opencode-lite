---
name: verification
description: Use when about to claim work is complete, fixed, or passing - requires running automated checks AND manual code review, confirming output before making any success claims
---

# Verification

Verify that work is actually complete and correct before claiming success. This involves both automated checks and manual code review — skipping either one risks shipping broken or incomplete work.

## When to Use
- Before marking any task as complete
- Before telling the user "it's done" or "it's fixed"
- After subagent work, before accepting results

## Core Principle
Evidence before assertions. Run the command, read the output, THEN claim the result.

## Workflow

### Phase 1: Automated Checks

#### 1. Identify Verification Commands
What proves this work is correct?
- Tests: bun test (or specific test file)
- Types: bun run typecheck
- Lint: bun run check:ci
- Build: bun run build
- LSP: lsp_diagnostics on changed files
- Manual: specific expected behavior

#### 2. Run the Commands
Execute every applicable verification command. Do not skip this step.

#### 3. Read the FULL Output
- Check exit code (0 = success)
- Read error messages if any
- Don't assume success from partial output

### Phase 2: Manual Code Review

Automated checks catch syntax and type errors, but they cannot catch logic errors, incomplete implementations, or misunderstood requirements. This phase fills that gap.

#### 1. Read Every Changed File
Open and read every file that was created or modified — no exceptions.

#### 2. Per-File Checklist
For each file, verify:
- Does the logic actually implement the requirement? (not just compile)
- Are there stubs, TODOs, placeholders, or hardcoded values left behind?
- Are there logic errors or missing edge cases?
- Does it follow existing codebase patterns and conventions?
- Are imports correct and complete?

#### 3. Cross-Reference Claims vs Code
Compare what was claimed ("I added auth middleware") against what the code actually does. Subagents and even your own work can drift from intent — the code is the source of truth, not the summary.

If anything doesn't match: fix immediately before claiming completion.

### Phase 3: Confirm or Fix
- If PASS (both phases): claim success with evidence ("Tests pass: 42 passed, 0 failed. Code review: logic matches requirements, no stubs or TODOs.")
- If FAIL: fix the issue, then re-verify from Phase 1
- If PARTIAL: note what passes and what doesn't

## Issue Severity
When issues are found, classify them:
- **CRITICAL**: Must fix before proceeding (bugs, security, data loss)
- **IMPORTANT**: Should fix (conventions, maintainability)
- **MINOR**: Note for later (style, optimization)

## Anti-Patterns
- "I believe this should work" (without running it)
- "The tests should pass" (without actually running them)
- Reading only the last line of test output
- Claiming "fixed" after editing without re-running verification
- Skipping verification because "it's a small change"
- Skipping manual code review because "the tests pass"
- Trusting subagent claims without reading the actual code

## Minimum Verification Per Task
Every completed task must have:
1. lsp_diagnostics on all changed files (no new errors)
2. Relevant test suite passes (if tests exist)
3. Build succeeds (if applicable)
4. Manual read of every changed file (logic matches requirements, no stubs/TODOs)
