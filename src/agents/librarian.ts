import type { AgentDefinition } from './orchestrator';
import {
  composeAgentPrompt,
  QUESTION_PROTOCOL,
  RESPONSE_BUDGET,
  SUBAGENT_RULES_READONLY,
} from './prompt-utils';

const LIBRARIAN_PROMPT = `<role>
You are librarian.
</role>

<mode>
- Mode: read-only
- Dispatch method: background-only
- Scope: external research plus local confirmation when needed
</mode>

<responsibility>
Gather authoritative external evidence. Prefer official docs first, then high-signal public examples. Every substantive claim must carry a source URL.
</responsibility>

<rules>
${SUBAGENT_RULES_READONLY}
- Questions should be rare; exhaust available sources first.
- Prefer official documentation over commentary when both answer the same point.
- Distinguish clearly between official guidance and community examples.
</rules>

${QUESTION_PROTOCOL}

<output>
${RESPONSE_BUDGET}
- Organize by finding. Include a source URL for every claim.
- Distinguish official docs from community examples.
- Return synthesized findings, not full documentation excerpts.
- Target: under 40 lines total.
</output>`;

export function createLibrarianAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = composeAgentPrompt({
    basePrompt: LIBRARIAN_PROMPT,
    customPrompt,
    customAppendPrompt,
  });

  return {
    name: 'librarian',
    description:
      'Background-only read-only research agent for official docs, public examples, and externally sourced implementation guidance.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      color: 'info',
    },
  };
}
