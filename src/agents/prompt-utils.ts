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
Use \`question\` only for blocking choices: unresolved ambiguity that changes the result, destructive/security-sensitive actions, or missing secrets. Do all non-blocked work first, ask one targeted question with a recommended default first, then stop.
</questions>`;

export const SUBAGENT_RULES = `- Single-task leaf agent: do not delegate, manage SDD phases, act as orchestrator, or call \`todowrite\`.
- Use \`question\` only for local blocking decisions.
- Never discard working-tree changes: no \`git restore\`, \`git checkout -- <path>\`, \`git reset --hard\`, \`git clean\`, or \`git stash\`.
- Avoid blocking/watch commands; use terminating checks only.`;

export const SUBAGENT_RULES_READONLY = `${SUBAGENT_RULES}
- Use read-only thoth-mem only when dispatch gives session_id/project: \`mem_search\` -> \`mem_timeline\` -> \`mem_get_observation\`.
- Never call \`mem_session_start\`, \`mem_session_summary\`, or \`mem_save_prompt\`; those tools are orchestrator-owned.
- Never write memory; memory writes are orchestrator-owned.`;

export const SUBAGENT_RULES_WRITABLE = `${SUBAGENT_RULES}
- Use delegated thoth-mem tools only (mem_save, mem_search, mem_get_observation, mem_timeline, mem_suggest_topic_key).
- Never call \`mem_session_start\`, \`mem_session_summary\`, or \`mem_save_prompt\`; those tools are orchestrator-owned.
- Always use the parent session_id/project from dispatch for every thoth-mem call.
- If either is missing, do NOT call thoth-mem.
- For reads, use only \`mem_search\` -> \`mem_timeline\` -> \`mem_get_observation\`.
- You do not own durable memory of your own; \`mem_save\` writes under the orchestrator's session/project only.`;

export const RESPONSE_BUDGET = `Return concise structured results: status, summary, files, verification/issues. Never return raw file dumps.`;

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
- Use XML-like sections, label uncertainty, and delegate aggressively when agentic.
${roleGuidance}
</model-profile>`;
  }

  if (family === 'openai') {
    return `<model-profile family="openai">
- Plan briefly, then act. Keep tool dispatch explicit: action, target, return shape.
${roleGuidance}
</model-profile>`;
  }

  if (family === 'gemini') {
    return `<model-profile family="gemini">
- Use long-context breadth deliberately, then ground conclusions in exact anchors.
${roleGuidance}
</model-profile>`;
  }

  if (family === 'kimi') {
    return `<model-profile family="kimi">
- Favor repository-scale navigation before edits; keep patches grounded in current file state.
${roleGuidance}
</model-profile>`;
  }

  return `<model-profile family="glm">
- Use compact checklists, conservative steps, clear verification, and concrete blockers.
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
