import type { AgentDefinition } from './types';

const EFFORT_PLACEHOLDER = '{EFFORT_PROMPT}';

const EFFORT_PROMPTS: Record<'quick' | 'deep', string> = {
  quick: `- Execute EXACTLY as instructed, no deliberation
- Read the target file, make the change, verify, report
- Speed is the priority
- If instructions are unclear, make the most obvious interpretation
- Do NOT research surrounding code or check for edge cases`,
  deep: `- Read surrounding context before making changes
- Think about edge cases and implications
- Make informed decisions when the spec is ambiguous
- Use grep/glob to understand related code
- Thoroughness is the priority`,
};

const JUNIOR_PROMPT_TEMPLATE = `You are Junior - a fast implementation specialist.

## Behavior
{EFFORT_PROMPT}
- Read files before editing (always)
- Use edit/write tools for changes
- Run tests/lsp_diagnostics when relevant
- Report completion with structured summary

## Constraints
- NO external research (no websearch, context7, grep_app)
- NO delegation (no background_task, no spawning subagents)
- No multi-step research/planning; minimal execution sequence ok
- If context is insufficient: use grep/glob/read directly
- Only ask for inputs you truly cannot retrieve yourself

## Output Format
<summary>
Brief summary of what was implemented
</summary>
<changes>
- file1.ts: Changed X to Y
- file2.ts: Added Z function
</changes>
<verification>
- Tests: [passed/failed/skipped - reason]
- Diagnostics: [clean/errors/skipped - reason]
</verification>`;

/**
 * Resolve the junior system prompt with effort-specific instructions injected.
 * Replaces the {EFFORT_PROMPT} placeholder with the effort's behavioral hints.
 *
 * @param effort - The effort level to inject
 * @param customPrompt - Optional fully custom prompt (must contain placeholder)
 * @param customAppendPrompt - Optional text appended to the default template
 * @returns The resolved system prompt with effort instructions injected
 */
export function resolveJuniorEffortPrompt(
  effort: 'quick' | 'deep',
  customPrompt?: string,
  customAppendPrompt?: string,
): string {
  let template = JUNIOR_PROMPT_TEMPLATE;

  if (customPrompt) {
    template = customPrompt;
  } else if (customAppendPrompt) {
    template = `${JUNIOR_PROMPT_TEMPLATE}\n\n${customAppendPrompt}`;
  }

  const effortText = EFFORT_PROMPTS[effort];
  return template.replace(EFFORT_PLACEHOLDER, `${effortText}\n`);
}

export function createJuniorAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  // Default registration: remove effort placeholder (no effort-specific hints)
  let prompt = JUNIOR_PROMPT_TEMPLATE.replace(`${EFFORT_PLACEHOLDER}\n`, '');

  if (customPrompt) {
    prompt = customPrompt.replace(`${EFFORT_PLACEHOLDER}\n`, '');
  } else if (customAppendPrompt) {
    prompt = `${prompt}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'junior',
    description:
      'Fast implementation specialist. Receives complete context and task spec, executes code changes efficiently.',
    config: {
      model,
      temperature: 0.2,
      prompt,
    },
  };
}
