---
name: brainstorming
description: Use when facing complex features with ambiguous scope, new projects, major architecture changes, or when the user says "help me think through" or "I want to build" - explores intent and requirements before implementation
---

# Brainstorming

Explore user intent and requirements through structured dialogue before any implementation.

## When to Use
- Complex features with ambiguous scope
- New projects or major architecture changes
- User says "help me think through..." or "I want to build..."

## Workflow

### 1. Context Gathering
- Read relevant project files to understand current state
- Check for existing documentation, READMEs, or architecture docs
- Note the tech stack, patterns, and conventions already in use

### 2. Interview (ONE question at a time)
Ask questions in this order, stopping when you have enough clarity:
1. **What**: "What exactly do you want to build/change?"
2. **Why**: "What problem does this solve?" (often reveals hidden requirements)
3. **Scope**: "What's in scope and what's explicitly NOT?"
4. **Constraints**: "Any technical constraints? (compatibility, performance, timeline)"
5. **Success**: "How will you know this is done correctly?"

**Rules:**
- Ask ONE question at a time, wait for answer
- If the answer is clear, don't ask redundant follow-ups
- If user says "just do it", respect that - infer reasonable defaults
- State your assumptions explicitly so user can correct them

### 3. Approach Proposal
Once requirements are clear:
1. Propose 2-3 approaches with trade-offs (unless one is obviously best)
2. For each approach: one sentence description + pros/cons
3. Recommend one approach with brief rationale
4. Ask: "Should I proceed with [recommendation], or do you prefer another approach?"

### 4. Handoff
Once approach is approved:
- If creating a plan document: transition to "writing-plans" skill
- If implementing directly: summarize the agreed approach and begin

## Anti-Patterns
- Don't ask questions you can answer by reading the codebase
- Don't present options when one is clearly superior
- Don't interview for simple tasks (under 3 files, clear scope)
- Don't repeat back everything the user said
