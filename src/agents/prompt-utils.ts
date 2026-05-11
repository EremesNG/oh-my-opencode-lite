interface ComposeAgentPromptOptions {
  basePrompt: string;
  customPrompt?: string;
  customAppendPrompt?: string;
  placeholders?: Record<string, string | number | undefined>;
}

export type AgentPromptRole =
  | 'orchestrator'
  | 'explorer'
  | 'librarian'
  | 'oracle'
  | 'designer'
  | 'quick'
  | 'deep';

type ModelFamily = 'openai' | 'claude' | 'gemini' | 'kimi' | 'glm';

type ModelEntry = string | { id: string; variant?: string };

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

function getPrimaryModelId(model?: string | ModelEntry[]): string | undefined {
  if (Array.isArray(model)) {
    const first = model[0];
    return typeof first === 'string' ? first : first?.id;
  }

  return model;
}

function detectModelFamily(
  model?: string | ModelEntry[],
): ModelFamily | undefined {
  const id = getPrimaryModelId(model)?.toLowerCase();

  if (!id) {
    return undefined;
  }

  if (id.includes('claude') || id.startsWith('anthropic/')) {
    return 'claude';
  }

  if (id.includes('gpt') || id.startsWith('openai/')) {
    return 'openai';
  }

  if (id.includes('gemini') || id.startsWith('google/')) {
    return 'gemini';
  }

  if (id.includes('kimi') || id.includes('k2')) {
    return 'kimi';
  }

  if (id.includes('glm') || id.startsWith('zai-')) {
    return 'glm';
  }

  return undefined;
}

function getRoleModelProfile(role: AgentPromptRole): string {
  switch (role) {
    case 'orchestrator':
      return '- Exploit your role by selecting the right specialist category, launching independent tasks together, and synthesizing facts/inferences/unknowns before the next dispatch.';
    case 'explorer':
      return '- Exploit your role by scanning broadly first, then narrowing to symbol/path evidence with ranked candidates and confidence.';
    case 'librarian':
      return '- Exploit your role by prioritizing official docs, dates, versions, and source quality before summarizing public examples.';
    case 'oracle':
      return '- Exploit your role by challenging assumptions, identifying risk, and giving a decision-ready recommendation backed by evidence.';
    case 'designer':
      return '- Exploit your role by making concrete UX choices, implementing them, and verifying the visible result instead of stopping at code review.';
    case 'quick':
      return '- Exploit your role by applying the smallest clear edit, avoiding broad exploration, and returning immediately after focused verification.';
    case 'deep':
      return '- Exploit your role by building a complete mental model of shared behavior, writing tests first when behavior changes, and verifying edge cases.';
  }
}

export function getModelFamilyPromptSection(
  role: AgentPromptRole,
  model?: string | ModelEntry[],
): string | undefined {
  const family = detectModelFamily(model);

  if (!family) {
    return undefined;
  }

  const roleGuidance = getRoleModelProfile(role);

  if (family === 'claude') {
    return `<model-profile family="claude">
- Use XML-like sections for dense instructions, constraints, evidence, and final output.
- Prefer explicit role framing, careful decomposition, and uncertainty labels.
- When the task is agentic, delegate aggressively or use tools explicitly instead of only suggesting changes.
${roleGuidance}
</model-profile>`;
  }

  if (family === 'openai') {
    return `<model-profile family="openai">
- Put the operative instruction first, separate context from requirements, and obey the requested output shape exactly.
- Plan briefly, then act; keep hidden reasoning private and expose only concise decisions, evidence, and next steps.
- Keep tool dispatch explicit: name the action, the target, and the expected return shape.
${roleGuidance}
</model-profile>`;
  }

  if (family === 'gemini') {
    return `<model-profile family="gemini">
- Use long-context strength deliberately: build an index of relevant files or sources before detailed analysis.
- Ground conclusions in exact anchors and avoid over-weighting broad pattern matches.
- Keep the final response compact even when the investigation context is large.
${roleGuidance}
</model-profile>`;
  }

  if (family === 'kimi') {
    return `<model-profile family="kimi">
- Favor repository-scale reading and resilient code navigation before editing.
- Keep edits mechanically grounded in the current file state; verify line targets before patching.
- Return concise structured progress so the orchestrator can continue without absorbing raw context.
${roleGuidance}
</model-profile>`;
  }

  return `<model-profile family="glm">
- Use explicit checklists and decision gates for complex tasks.
- Prefer conservative implementation steps, clear verification, and concrete blockers over broad speculation.
- Keep outputs structured so orchestration remains predictable across model fallbacks.
${roleGuidance}
</model-profile>`;
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
