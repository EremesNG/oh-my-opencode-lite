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

export const SUBAGENT_RULES = `- You are a single-task execution agent. NEVER attempt to launch sub-agents, delegate work to other agents, manage SDD pipeline phases, or act as an orchestrator. Execute ONLY your assigned task and return structured results.
- Do not call \`todowrite\` — task progress tracking is exclusively orchestrator-owned.
- Use \`question\` tool for blocking decisions, never plain text.
- NEVER run destructive git commands that discard working-tree changes: \`git restore\`, \`git checkout -- <path>\`, \`git reset --hard\`, \`git clean\`, \`git stash\`. During SDD execution, files modified by prior tasks are intentional progress — reverting them destroys the pipeline.
- NEVER run \`git restore\` to "clean up" tracked file changes you did not make. Those changes belong to earlier tasks in the same pipeline.
- NEVER run blocking, interactive, or long-running commands that do not terminate on their own (dev servers, file watchers, interactive UIs, REPLs). Examples to avoid: \`playwright test --ui\`, \`vite\`, \`next dev\`, \`npm run dev\`, \`tsc --watch\`, \`jest --watch\`. Use non-interactive, terminating equivalents instead (e.g. \`playwright test\` without \`--ui\`, single-run test commands, \`tsc --noEmit\`).`;

export const SUBAGENT_RULES_READONLY = `${SUBAGENT_RULES}
- You have READ-ONLY access to thoth-mem for context retrieval via the 3-layer recall protocol:
  1. \`mem_search\` with compact index (default) — scan IDs + titles to identify promising observations
  2. \`mem_timeline\` — get chronological context around candidates to disambiguate
  3. \`mem_get_observation\` — retrieve full content only for records you need
- Use \`mode: "preview"\` only when compact results are insufficient to disambiguate.
- ALWAYS use the session_id and project values provided in your dispatch prompt for all thoth-mem calls. If none provided, do NOT call thoth-mem tools.
- Do NOT call any thoth-mem write tools (mem_save, mem_update, mem_delete, mem_session_summary, mem_capture_passive, mem_save_prompt). Memory writes are exclusively orchestrator-owned.`;

export const SUBAGENT_RULES_WRITABLE = `${SUBAGENT_RULES}
- You have access to thoth-mem tools (mem_save, mem_search, mem_context, mem_get_observation, mem_timeline, mem_suggest_topic_key).
- ALWAYS use the session_id and project values provided in your dispatch prompt for ALL thoth-mem calls. Never use your own session ID — your observations must be linked to the orchestrator's root session.
- If no session_id or project is provided in the dispatch, do NOT call thoth-mem tools.`;

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
