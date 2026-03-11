---
name: code-review
description: Use when reviewing code changes after subagent work, before merging or committing significant changes, or when explicitly asked to review code for correctness and quality
---

# Code Review

Review code changes for correctness, quality, and adherence to project conventions.

## When to Use
- After subagent completes a task (Architect/Engineer reviewing quick/deep work)
- Before merging or committing significant changes
- When explicitly asked to review code

## Review Checklist

### 1. Correctness
- Does the code do what was asked?
- Are edge cases handled?
- Are there obvious bugs (off-by-one, null checks, async issues)?

### 2. Conventions
- Follows project naming conventions (check AGENTS.md or existing patterns)
- Import organization matches project style
- Error handling matches project patterns

### 3. Simplicity
- No unnecessary complexity
- No dead code or commented-out blocks
- No premature abstractions (YAGNI)
- DRY: no duplicated logic

### 4. Types
- No any types (unless justified)
- Return types match actual returns
- Zod schemas match TypeScript types

### 5. Tests
- Changed code has corresponding tests
- Tests verify behavior, not implementation
- Edge cases have test coverage

## Review Output Format

For each issue found:

[CRITICAL/IMPORTANT/MINOR] file.ts:42
Description of the issue.
Suggested fix: [specific suggestion]

Severity guide:
- CRITICAL: Must fix before proceeding (bugs, security, data loss)
- IMPORTANT: Should fix soon (conventions, maintainability)
- MINOR: Nice to have (style, optimization)

## Rules
- Be specific: point to exact lines and suggest fixes
- Be objective: focus on code, not style preferences
- Be proportional: don't block on minor issues
- If no issues found: say "LGTM" and move on
