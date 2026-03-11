import type { DiscoveredModel } from '../types';
import type { ScoringAgentName } from './types';

type ModelTier = 'flagship' | 'mid' | 'fast';

function classifyTier(model: DiscoveredModel): ModelTier {
  const text = `${model.model} ${model.name}`.toLowerCase();

  // Fast tier
  if (/\b(nano|flash|haiku|mini|lite|fast|small)\b/.test(text)) return 'fast';

  // Flagship tier
  if (/\b(opus|pro|codex|max)\b/.test(text) && !/\bmini\b/.test(text)) {
    return 'flagship';
  }

  // Mid tier (sonnet, base GPT-5.x, etc.)
  return 'mid';
}

/**
 * Bonus/penalty for model tier within a single provider.
 * This helps differentiate Opus vs Sonnet vs Haiku when only
 * Anthropic is enabled, or Codex vs Codex-Mini for OpenAI-only.
 *
 * Returns a normalized score in [-1, 1] range.
 */
const TIER_AFFINITY: Record<ScoringAgentName, Record<ModelTier, number>> = {
  planner: { flagship: 0.6, mid: 0.8, fast: -0.5 },
  architect: { flagship: 0.6, mid: 0.8, fast: -0.5 },
  engineer: { flagship: 1.0, mid: 0.4, fast: -0.3 },
  oracle: { flagship: 1.0, mid: 0.3, fast: -0.6 },
  designer: { flagship: 0.5, mid: 0.7, fast: -0.2 },
  explorer: { flagship: -0.6, mid: -0.1, fast: 1.0 },
  librarian: { flagship: -0.2, mid: 0.6, fast: 0.7 },
  quick: { flagship: -0.1, mid: 0.5, fast: 0.8 },
  deep: { flagship: 1.0, mid: 0.5, fast: -0.4 },
};

export function getIntraProviderTierBonus(
  agent: ScoringAgentName,
  model: DiscoveredModel,
): number {
  const tier = classifyTier(model);
  return TIER_AFFINITY[agent][tier];
}
