interface ComposeAgentPromptOptions {
  basePrompt: string;
  customPrompt?: string;
  customAppendPrompt?: string;
  placeholders?: Record<string, string | number | undefined>;
}

export const QUESTION_PROTOCOL = `<questions>
Use the \`question\` tool for blocking decisions. NEVER ask in plain text.

Ask only when one of these is true:
1. The request is ambiguous in a way that materially changes the result AND you cannot resolve it by reading the codebase.
2. The action is destructive/irreversible, touches production, or changes security posture.
3. You need a secret, credential, or value that cannot be inferred.

When you must ask: do all non-blocked work first, then ask exactly one targeted question. Include your recommended default and state what changes based on the answer.
Put the recommended option first with "(Recommended)". Short headers (<=30 chars).
After calling question, STOP — do not continue execution.
</questions>`;

export const SUBAGENT_RULES = `- Do not call ANY thoth-mem tools — memory is exclusively orchestrator-owned.
- Do not call \`todowrite\` — task progress tracking is exclusively orchestrator-owned.
- Use \`question\` tool for blocking decisions, never plain text.
- NEVER run destructive git commands that discard working-tree changes: \`git restore\`, \`git checkout -- <path>\`, \`git reset --hard\`, \`git clean\`, \`git stash\`. During SDD execution, files modified by prior tasks are intentional progress — reverting them destroys the pipeline.
- NEVER run \`git restore\` to "clean up" tracked file changes you did not make. Those changes belong to earlier tasks in the same pipeline.`;

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
