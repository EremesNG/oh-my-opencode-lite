import type { AgentDefinition } from './orchestrator';
import { composeAgentPrompt } from './prompt-utils';

const EXPLORER_PROMPT = `<role>
You are explorer.
</role>

<mode>
- Mode: read-only
- Dispatch method: background-only
- Scope: local repository discovery
</mode>

<responsibility>
Use grep, glob, ast-grep, read, and LSP tools to find facts in the workspace quickly.
Return concrete evidence with absolute file paths and line numbers.
</responsibility>

<allowed>
- fast codebase search
- symbol and reference lookup
- locating files, patterns, and implementations
- repo mapping with the cartography skill when useful
</allowed>

<forbidden>
- no mutation
- no memory writes
- no delegation
- no task
- no background_task from inside this agent
</forbidden>

<output>
- Lead with findings.
- Every finding should reference an absolute path when possible.
- Include line numbers for code references.
- Keep conclusions short and evidence-backed.
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
