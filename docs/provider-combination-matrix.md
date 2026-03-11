# Provider Combination Test Matrix (2 to 6 Active)

This matrix tests 5 combinations across the 8 provider toggles in this
project:

- `openai`
- `anthropic`
- `github-copilot`
- `zai-coding-plan`
- `kimi-for-coding`
- `google` (Antigravity/Gemini)
- `chutes`
- `opencode` free (`useOpenCodeFreeModels`)

## How this was determined

I generated outputs directly from `generateLiteConfig` in
`src/cli/providers.ts` using fixed deterministic inputs:

- `selectedOpenCodePrimaryModel = opencode/glm-4.7-free`
- `selectedOpenCodeSecondaryModel = opencode/gpt-5-nano`
- `selectedChutesPrimaryModel = chutes/kimi-k2.5`
- `selectedChutesSecondaryModel = chutes/minimax-m2.1`

This represents the config output shape written by the installer when those
selected models are available.

Agent labels in this document use current runtime names:
- `engineer` (older docs may call this "orchestrator")
- `quick` (older docs may call this "fixer")

## Scenario S1 - 2 providers

Active providers: OpenAI + OpenCode Free

- Preset: `openai`
- Agents:
  - `engineer`: `openai/gpt-5.3-codex`
  - `oracle`: `openai/gpt-5.3-codex` (`high`)
  - `designer`: `openai/gpt-5.1-codex-mini` (`medium`)
  - `explorer`: `opencode/gpt-5-nano`
  - `librarian`: `opencode/gpt-5-nano`
  - `quick`: `opencode/gpt-5-nano` (`low`)
  - `deep`: `opencode/glm-4.7-free`
- Fallback chains:
  - `engineer`: `openai/gpt-5.3-codex -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `oracle`: `openai/gpt-5.3-codex -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `designer`: `openai/gpt-5.1-codex-mini -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `explorer`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> opencode/big-pickle`
  - `librarian`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> opencode/big-pickle`
  - `quick`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> opencode/big-pickle`
  - `deep`: `opencode/glm-4.7-free -> openai/gpt-5.3-codex -> opencode/big-pickle`

## Scenario S2 - 3 providers

Active providers: OpenAI + Chutes + OpenCode Free

- Preset: `openai`
- Agents:
  - `engineer`: `openai/gpt-5.3-codex`
  - `oracle`: `openai/gpt-5.3-codex` (`high`)
  - `designer`: `openai/gpt-5.1-codex-mini` (`medium`)
  - `explorer`: `opencode/gpt-5-nano`
  - `librarian`: `opencode/gpt-5-nano`
  - `quick`: `opencode/gpt-5-nano` (`low`)
  - `deep`: `opencode/glm-4.7-free`
- Fallback chains:
  - `engineer`: `openai/gpt-5.3-codex -> chutes/kimi-k2.5 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `oracle`: `openai/gpt-5.3-codex -> chutes/kimi-k2.5 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `designer`: `openai/gpt-5.1-codex-mini -> chutes/kimi-k2.5 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `explorer`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `librarian`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `quick`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `deep`: `opencode/glm-4.7-free -> openai/gpt-5.3-codex -> chutes/kimi-k2.5 -> opencode/big-pickle`

## Scenario S3 - 4 providers

Active providers: OpenAI + Copilot + ZAI Plan + OpenCode Free

- Preset: `openai`
- Agents:
  - `engineer`: `openai/gpt-5.3-codex`
  - `oracle`: `openai/gpt-5.3-codex` (`high`)
  - `designer`: `openai/gpt-5.1-codex-mini` (`medium`)
  - `explorer`: `opencode/gpt-5-nano`
  - `librarian`: `opencode/gpt-5-nano`
  - `quick`: `opencode/gpt-5-nano` (`low`)
  - `deep`: `opencode/glm-4.7-free`
- Fallback chains:
  - `engineer`: `openai/gpt-5.3-codex -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `oracle`: `openai/gpt-5.3-codex -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `designer`: `openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `explorer`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> opencode/big-pickle`
  - `librarian`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> opencode/big-pickle`
  - `quick`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> opencode/big-pickle`
  - `deep`: `opencode/glm-4.7-free -> openai/gpt-5.3-codex -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> opencode/big-pickle`

## Scenario S4 - 5 providers

Active providers: OpenAI + Gemini + Chutes + Copilot + OpenCode Free

- Preset: `antigravity-mixed-openai`
- Agents:
  - `engineer`: `chutes/kimi-k2.5`
  - `oracle`: `openai/gpt-5.3-codex` (`high`)
  - `designer`: `chutes/kimi-k2.5` (`medium`)
  - `explorer`: `opencode/gpt-5-nano`
  - `librarian`: `opencode/gpt-5-nano`
  - `quick`: `opencode/gpt-5-nano` (`low`)
  - `deep`: `opencode/glm-4.7-free`
- Fallback chains:
  - `engineer`: `chutes/kimi-k2.5 -> openai/gpt-5.3-codex -> github-copilot/grok-code-fast-1 -> google/antigravity-gemini-3-flash -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `oracle`: `openai/gpt-5.3-codex -> github-copilot/grok-code-fast-1 -> google/antigravity-gemini-3.1-pro -> chutes/kimi-k2.5 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `designer`: `chutes/kimi-k2.5 -> openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> google/antigravity-gemini-3-flash -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `explorer`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> google/antigravity-gemini-3-flash -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `librarian`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> google/antigravity-gemini-3-flash -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `quick`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> github-copilot/grok-code-fast-1 -> google/antigravity-gemini-3-flash -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `deep`: `opencode/glm-4.7-free -> openai/gpt-5.3-codex -> github-copilot/grok-code-fast-1 -> google/antigravity-gemini-3.1-pro -> chutes/kimi-k2.5 -> opencode/big-pickle`

## Scenario S5 - 6 providers

Active providers: OpenAI + Anthropic + Copilot + ZAI Plan + Chutes + OpenCode
Free

- Preset: `openai`
- Agents:
  - `engineer`: `openai/gpt-5.3-codex`
  - `oracle`: `openai/gpt-5.3-codex` (`high`)
  - `designer`: `openai/gpt-5.1-codex-mini` (`medium`)
  - `explorer`: `opencode/gpt-5-nano`
  - `librarian`: `opencode/gpt-5-nano`
  - `quick`: `opencode/gpt-5-nano` (`low`)
  - `deep`: `opencode/glm-4.7-free`
- Fallback chains:
  - `engineer`: `openai/gpt-5.3-codex -> anthropic/claude-opus-4-6 -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> chutes/kimi-k2.5 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `oracle`: `openai/gpt-5.3-codex -> anthropic/claude-opus-4-6 -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> chutes/kimi-k2.5 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `designer`: `openai/gpt-5.1-codex-mini -> anthropic/claude-sonnet-4-5 -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> chutes/kimi-k2.5 -> opencode/glm-4.7-free -> opencode/big-pickle`
  - `explorer`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> anthropic/claude-haiku-4-5 -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `librarian`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> anthropic/claude-sonnet-4-5 -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `quick`: `opencode/gpt-5-nano -> openai/gpt-5.1-codex-mini -> anthropic/claude-haiku-4-5 -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> chutes/minimax-m2.1 -> opencode/big-pickle`
  - `deep`: `opencode/glm-4.7-free -> openai/gpt-5.3-codex -> anthropic/claude-sonnet-4-5 -> github-copilot/grok-code-fast-1 -> zai-coding-plan/glm-4.7 -> chutes/kimi-k2.5 -> opencode/big-pickle`

## Dynamic scoring rerun (new compositions + 3 random)

This rerun validates `buildDynamicModelPlan` using `scoringEngineVersion` in
three modes:

- `v1`
- `v2-shadow` (applies V1 results, compares V2)
- `v2`

The exact assertions are captured in
`src/cli/dynamic-model-selection-matrix.test.ts`.

### C1 (curated)

Active providers: OpenAI + Anthropic + Chutes + OpenCode Free

- V1 agents: `oracle=openai/gpt-5.3-codex`, `engineer=openai/gpt-5.3-codex`, `quick=chutes/minimax-m2.1`, `deep=openai/gpt-5.1-codex-mini`, `designer=chutes/kimi-k2.5`, `librarian=anthropic/claude-opus-4-6`, `explorer=chutes/minimax-m2.1`
- V2 agents: same as V1 for this composition

### C2 (curated)

Active providers: OpenAI + Copilot + ZAI Plan + Gemini + OpenCode Free

- V1 agents: `oracle=openai/gpt-5.3-codex`, `engineer=openai/gpt-5.3-codex`, `quick=google/antigravity-gemini-3.1-pro`, `deep=github-copilot/grok-code-fast-1`, `designer=google/antigravity-gemini-3.1-pro`, `librarian=zai-coding-plan/glm-4.7`, `explorer=github-copilot/grok-code-fast-1`
- V2 agents: `oracle=openai/gpt-5.3-codex`, `engineer=openai/gpt-5.3-codex`, `quick=openai/gpt-5.1-codex-mini`, `deep=github-copilot/grok-code-fast-1`, `designer=google/antigravity-gemini-3.1-pro`, `librarian=zai-coding-plan/glm-4.7`, `explorer=github-copilot/grok-code-fast-1`

### C3 (curated)

Active providers: Kimi + Gemini + Chutes + OpenCode Free

- V1 agents: `oracle=chutes/kimi-k2.5`, `engineer=google/antigravity-gemini-3.1-pro`, `quick=chutes/minimax-m2.1`, `deep=google/antigravity-gemini-3.1-pro`, `designer=kimi-for-coding/k2p5`, `librarian=chutes/minimax-m2.1`, `explorer=google/antigravity-gemini-3-flash`
- V2 agents: same as V1 for this composition

### R1 (random)

Active providers: Anthropic + Copilot + OpenCode Free

- V1 agents: `oracle=anthropic/claude-opus-4-6`, `engineer=github-copilot/grok-code-fast-1`, `quick=github-copilot/grok-code-fast-1`, `deep=github-copilot/grok-code-fast-1`, `designer=anthropic/claude-opus-4-6`, `librarian=anthropic/claude-opus-4-6`, `explorer=github-copilot/grok-code-fast-1`
- V2 agents: same as V1 for this composition

### R2 (random)

Active providers: OpenAI + Kimi + ZAI Plan + Chutes + OpenCode Free

- V1 agents: `oracle=openai/gpt-5.3-codex`, `engineer=openai/gpt-5.3-codex`, `quick=chutes/minimax-m2.1`, `deep=openai/gpt-5.1-codex-mini`, `designer=chutes/kimi-k2.5`, `librarian=zai-coding-plan/glm-4.7`, `explorer=chutes/minimax-m2.1`
- V2 agents: same as V1 for this composition

### R3 (random)

Active providers: Gemini + Anthropic + Chutes + OpenCode Free

- V1 agents: `oracle=anthropic/claude-opus-4-6`, `engineer=google/antigravity-gemini-3.1-pro`, `quick=chutes/minimax-m2.1`, `deep=google/antigravity-gemini-3.1-pro`, `designer=anthropic/claude-opus-4-6`, `librarian=chutes/minimax-m2.1`, `explorer=google/antigravity-gemini-3-flash`
- V2 agents: same as V1 for this composition

## Notes

- This matrix shows deterministic `generateLiteConfig` output for the selected
  combinations.
- If the dynamic planner is used during full install (live model catalog), the
  generated `dynamic` preset may differ based on discovered models and
  capabilities.
