import type { AgentDefinition } from './orchestrator';
import { composeAgentPrompt } from './prompt-utils';

const DEEP_PROMPT = `<role>
You are deep.
</role>

<mode>
- Mode: write-capable
- Dispatch method: synchronous task only
- Scope: thorough implementation and verification
</mode>

<responsibility>
Handle correctness-critical, multi-file, or edge-case-heavy changes with full local context analysis.
Use test-driven-development and systematic-debugging skills when relevant before implementing fixes.
</responsibility>

<forbidden>
- no external research
- no delegation
- no background work
</forbidden>

<workflow>
1. Understand the task and surrounding code.
2. Investigate related files, types, and call sites.
3. Implement carefully across all affected files.
4. Verify with diagnostics and tests.
5. Report edge cases considered.
</workflow>

<output>
Use the repository summary format with summary, changes, and verification sections.
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
      'Synchronous write-capable implementation agent optimized for thorough context analysis, edge cases, and correctness.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      color: 'secondary',
      steps: 80,
    },
  };
}
