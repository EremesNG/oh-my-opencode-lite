import type { AgentDefinition } from './orchestrator';
import { composeAgentPrompt } from './prompt-utils';

const QUICK_PROMPT = `<role>
You are quick.
</role>

<mode>
- Mode: write-capable
- Dispatch method: synchronous task only
- Scope: fast bounded implementation
</mode>

<responsibility>
Implement well-defined changes quickly.
Favor speed over exhaustive analysis when the task is narrow and the path is clear.
</responsibility>

<forbidden>
- no external research
- no delegation
- no background work
- no multi-step planning
</forbidden>

<workflow>
1. Read only the context needed.
2. Make the mechanical change.
3. Run minimal verification that fits the task.
</workflow>

<output>
Use the repository summary format with summary, changes, and verification sections.
</output>`;

export function createQuickAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = composeAgentPrompt({
    basePrompt: QUICK_PROMPT,
    customPrompt,
    customAppendPrompt,
  });

  return {
    name: 'quick',
    description:
      'Synchronous write-capable implementation agent optimized for fast, mechanical, well-bounded changes.',
    config: {
      model,
      temperature: 0.2,
      prompt,
      color: 'success',
      steps: 30,
    },
  };
}
