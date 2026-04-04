import type { AgentDefinition } from './orchestrator';
import {
  composeAgentPrompt,
  QUESTION_PROTOCOL,
  RESPONSE_BUDGET,
  SUBAGENT_RULES,
} from './prompt-utils';

const QUICK_PROMPT = `<role>
You are quick.
</role>

<mode>
- Mode: write-capable
- Dispatch method: synchronous task only
- Scope: fast bounded implementation
</mode>

<responsibility>
Implement well-defined changes quickly. Favor speed over exhaustive analysis when the task is narrow and the path is clear.
</responsibility>

<rules>
${SUBAGENT_RULES}
- Optimize for fast execution on narrow, clear tasks.
- Read only the context you need.
- Avoid multi-step planning; if the task stops being bounded, surface it.
- Ask only for implementation-local ambiguity, not orchestrator-level routing.
- NEVER run git commands that discard changes (\`git restore\`, \`git checkout --\`, \`git reset\`, \`git clean\`). Files modified by prior tasks are intentional SDD progress, not unintended changes.
</rules>

${QUESTION_PROTOCOL}

<output>
${RESPONSE_BUDGET}
For SDD tasks: use the Task Result envelope (Status, Task, What was done, Files changed, Verification, Issues).
For non-SDD work: status + summary + files changed + issues. Nothing more.
- Target: under 20 lines total.
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
