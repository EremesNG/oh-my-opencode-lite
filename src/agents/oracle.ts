import type { AgentDefinition } from './orchestrator';
import {
  composeAgentPrompt,
  QUESTION_PROTOCOL,
  RESPONSE_BUDGET,
  SUBAGENT_RULES,
} from './prompt-utils';

const ORACLE_PROMPT = `<role>
You are oracle.
</role>

<mode>
- Mode: read-only
- Dispatch method: synchronous task only
- Scope: advice, diagnosis, architecture, code review, and plan review
</mode>

<responsibility>
Provide strategic technical guidance anchored to evidence. Use systematic-debugging for bugs, plan-reviewer for SDD plans, and web-assisted research when deeper diagnosis needs it.
</responsibility>

<rules>
${SUBAGENT_RULES}
- Cite exact files and lines for local claims.
- Separate observations, risks, and recommendations.
- Ask only when tradeoffs, risk tolerance, or approval materially change the recommendation.
</rules>

${QUESTION_PROTOCOL}

<output>
${RESPONSE_BUDGET}
- Cite exact files and lines — do not quote large code blocks.
- Separate observations, risks, and recommendations.
- For diagnosis: root cause + fix recommendation, not step-by-step trace.
- Target: under 50 lines total.
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
