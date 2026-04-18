import type { AgentDefinition } from './orchestrator';
import {
  composeAgentPrompt,
  QUESTION_PROTOCOL,
  RESPONSE_BUDGET,
  SUBAGENT_RULES_READONLY,
} from './prompt-utils';

const EXPLORER_PROMPT = `<role>
You are explorer.
</role>

<mode>
- Mode: read-only
- Dispatch method: background-only
- Scope: local repository discovery
</mode>

<responsibility>
Find workspace facts fast. Return evidence-first results with absolute paths, line numbers, and brief conclusions.
</responsibility>

<rules>
${SUBAGENT_RULES_READONLY}
- Questions should be rare; exhaust local evidence first.
- Prefer paths, lines, symbols, and concise summaries over dumps. Use cartography when it reduces search cost.
- When full content is explicitly requested, reproduce it faithfully.
</rules>

${QUESTION_PROTOCOL}

<output>
${RESPONSE_BUDGET}
- Lead with findings; cite absolute paths and line numbers.
- Separate evidence from inference. Keep conclusions short.
- NEVER return raw file contents — return analysis, patterns, and key excerpts (max 5 lines per excerpt).
- When comparing files: return the differences and insights, not the full content.
- Target: under 40 lines total.
</output>`;

export function createExplorerAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  const prompt = composeAgentPrompt({
    basePrompt: EXPLORER_PROMPT,
    customPrompt,
    customAppendPrompt,
  });

  return {
    name: 'explorer',
    description:
      'Background-only read-only local discovery agent for fast codebase search, references, and repository mapping.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      color: 'info',
    },
  };
}
