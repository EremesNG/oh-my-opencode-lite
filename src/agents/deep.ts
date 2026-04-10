import type { AgentDefinition } from './orchestrator';
import {
  composeAgentPrompt,
  QUESTION_PROTOCOL,
  RESPONSE_BUDGET,
  SUBAGENT_RULES,
} from './prompt-utils';

const DEEP_PROMPT = `<role>
You are deep.
</role>

<mode>
- Mode: write-capable
- Dispatch method: synchronous task only
- Scope: thorough implementation and verification
</mode>

<responsibility>
Handle correctness-critical, multi-file, or edge-case-heavy changes with full local context analysis. Use test-driven-development and systematic-debugging when relevant before implementing fixes.
</responsibility>

<rules>
${SUBAGENT_RULES}
- Do not skip verification — thoroughness is your value proposition.
- Investigate related files, types, and call sites before changing shared behavior.
- Ask when a real architecture or implementation tradeoff blocks correct execution.
</rules>

${QUESTION_PROTOCOL}

<output>
${RESPONSE_BUDGET}
For SDD tasks: use the Task Result envelope (Status, Task, What was done, Files changed, Verification, Issues).
For non-SDD work: summary + files changed + verification results + edge cases considered.
- Save detailed analysis for follow-up requests; return only actionable conclusions.
- Target: under 40 lines total.
</output>`;

export function createDeepAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = composeAgentPrompt({
    basePrompt: DEEP_PROMPT,
    customPrompt,
    customAppendPrompt,
  });

  return {
    name: 'deep',
    description:
      'Synchronous write-capable implementation agent optimized for thorough context analysis, edge cases, and correctness — not for bulk mechanical changes.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      color: 'secondary',
      steps: 80,
    },
  };
}
