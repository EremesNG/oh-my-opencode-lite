interface ComposeAgentPromptOptions {
  basePrompt: string;
  customPrompt?: string;
  customAppendPrompt?: string;
  placeholders?: Record<string, string | number | undefined>;
}

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
