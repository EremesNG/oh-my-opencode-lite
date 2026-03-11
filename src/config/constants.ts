// Agent name constants

export const AGENT_ALIASES: Record<string, string> = {
  explore: 'explorer',
  plan: 'planner',
  arch: 'architect',
  eng: 'engineer',
  fix: 'quick',
  junior: 'quick',
  'frontend-ui-ux-engineer': 'designer',
};

export const SUBAGENT_NAMES = [
  'explorer',
  'librarian',
  'oracle',
  'designer',
  'quick',
  'deep',
] as const;

export const PRIMARY_NAMES = ['planner', 'architect', 'engineer'] as const;

export const DEFAULT_PRIMARY = 'engineer' as const;

export const ALL_AGENT_NAMES = [...PRIMARY_NAMES, ...SUBAGENT_NAMES] as const;

export type AgentName = (typeof ALL_AGENT_NAMES)[number];

// Subagent delegation rules
export const SUBAGENT_DELEGATION_RULES: Record<AgentName, readonly string[]> = {
  planner: ['explorer', 'librarian'],
  architect: [...SUBAGENT_NAMES],
  engineer: [...SUBAGENT_NAMES],
  oracle: [],
  designer: [],
  explorer: [],
  librarian: [],
  quick: [],
  deep: [],
};

// Default models per agent (undefined = resolved at runtime via fallback)
export const DEFAULT_MODELS: Record<AgentName, string | undefined> = {
  planner: undefined,
  architect: undefined,
  engineer: undefined,
  oracle: 'openai/gpt-5.2-codex',
  librarian: 'openai/gpt-5.1-codex-mini',
  explorer: 'openai/gpt-5.1-codex-mini',
  designer: 'kimi-for-coding/k2p5',
  quick: 'openai/gpt-5.1-codex-mini',
  deep: 'openai/gpt-5.3-codex',
};

// Polling
export const POLL_INTERVAL_MS = 500;
export const POLL_INTERVAL_SLOW_MS = 1000;
export const POLL_INTERVAL_BACKGROUND_MS = 2000;

// Timeouts
export const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;
export const MAX_POLL_TIME_MS = 5 * 60 * 1000;
export const FALLBACK_FAILOVER_TIMEOUT_MS = 15_000;

// Polling stability
export const STABLE_POLLS_THRESHOLD = 3;
