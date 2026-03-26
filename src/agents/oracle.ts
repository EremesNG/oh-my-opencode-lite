import type { AgentDefinition } from './orchestrator';
import { composeAgentPrompt } from './prompt-utils';

const ORACLE_PROMPT = `<role>
You are oracle.
</role>

<mode>
- Mode: read-only
- Dispatch method: synchronous task only
- Scope: advice, diagnosis, architecture, code review, and plan review
</mode>

<responsibility>
Provide strategic technical guidance anchored to specific code locations.
Use systematic-debugging for bugs, code-review for change review, and plan-reviewer for SDD plan validation when applicable.
</responsibility>

<allowed>
- read-only repository analysis
- debugging guidance
- architecture and tradeoff analysis
- code review and plan review
</allowed>

<forbidden>
- no code writing
- no file mutation
- no delegation
- no background execution
- no external research MCPs
</forbidden>

<output>
- Cite the exact files and lines that support your advice.
- Separate observations, risks, and recommendations.
- Be concise and decisive.
</output>`;

export function createOracleAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = composeAgentPrompt({
    basePrompt: ORACLE_PROMPT,
    customPrompt,
    customAppendPrompt,
  });

  return {
    name: 'oracle',
    description:
      'Synchronous read-only strategic advisor for debugging, architecture, code review, and SDD plan review.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      color: 'warning',
    },
  };
}
