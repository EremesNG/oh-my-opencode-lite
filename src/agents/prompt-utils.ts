interface ComposeAgentPromptOptions {
  basePrompt: string;
  customPrompt?: string;
  customAppendPrompt?: string;
  placeholders?: Record<string, string | number | undefined>;
}

export const QUESTION_PROTOCOL = `<questions>
Use the \`question\` tool for blocking decisions. NEVER ask in plain text.
Put the recommended option first with "(Recommended)". Short headers (<=30 chars).
After calling question, STOP — do not continue execution.
</questions>`;

export const SUBAGENT_RULES = `- Do not call thoth-mem session or prompt tools — memory is orchestrator-owned.
- Use \`question\` tool for blocking decisions, never plain text.`;

export const RESPONSE_BUDGET = `Your response returns to an expensive orchestrator model. Be ruthlessly concise:
- Return insights and conclusions, NEVER raw file contents or full code blocks.
- Structured results (status, summary, files, issues) over prose.
- If the orchestrator needs more detail, it will ask in a follow-up.`;

function trimPromptSection(section?: string): string | undefined {
  const trimmed = section?.trim();
  return trimmed ? trimmed : undefined;
}

export function appendPromptSections(
  ...sections: Array<string | undefined>
): string {
  return sections.map(trimPromptSection).filter(Boolean).join('\n\n');
}

export function replacePromptPlaceholders(
  template: string,
  placeholders: Record<string, string | number | undefined> = {},
): string {
  return Object.entries(placeholders).reduce((prompt, [key, value]) => {
    if (value === undefined) {
      return prompt;
    }

    return prompt.replaceAll(`{{${key}}}`, String(value));
  }, template);
}

export function composeAgentPrompt({
  basePrompt,
  customPrompt,
  customAppendPrompt,
  placeholders,
}: ComposeAgentPromptOptions): string {
  const resolvedBase = replacePromptPlaceholders(basePrompt, placeholders);

  if (customPrompt) {
    return replacePromptPlaceholders(customPrompt, placeholders);
  }

  return appendPromptSections(
    resolvedBase,
    replacePromptPlaceholders(customAppendPrompt ?? '', placeholders),
  );
}
