import type { FeatureWeights, ScoringAgentName } from './types';

const BASE_WEIGHTS: FeatureWeights = {
  status: 22,
  context: 6,
  output: 6,
  versionBonus: 8,
  reasoning: 10,
  toolcall: 16,
  attachment: 2,
  quality: 14,
  coding: 18,
  latencyPenalty: -3,
  pricePenalty: -2,
  roleAffinity: 30,
  tierBonus: 18,
};

const AGENT_WEIGHT_OVERRIDES: Record<
  ScoringAgentName,
  Partial<FeatureWeights>
> = {
  planner: {
    reasoning: 22,
    toolcall: 22,
    quality: 16,
    coding: 16,
    latencyPenalty: -2,
  },
  architect: {
    reasoning: 22,
    toolcall: 22,
    quality: 16,
    coding: 16,
    latencyPenalty: -2,
  },
  engineer: {
    reasoning: 22,
    toolcall: 22,
    quality: 16,
    coding: 16,
    latencyPenalty: -2,
  },
  oracle: {
    reasoning: 26,
    quality: 20,
    coding: 18,
    latencyPenalty: -2,
    output: 7,
    roleAffinity: 35,
  },
  designer: {
    attachment: 12,
    output: 10,
    quality: 16,
    coding: 10,
    roleAffinity: 38,
  },
  explorer: {
    latencyPenalty: -8,
    toolcall: 24,
    reasoning: 2,
    context: 4,
    output: 4,
    roleAffinity: 45,
    tierBonus: 28,
  },
  librarian: {
    context: 14,
    output: 10,
    quality: 18,
    coding: 14,
    tierBonus: 28,
  },
  quick: {
    coding: 28,
    toolcall: 22,
    reasoning: 12,
    output: 10,
    tierBonus: 28,
  },
  deep: {
    coding: 20,
    toolcall: 22,
    reasoning: 18,
    quality: 16,
  },
};

export function getFeatureWeights(agent: ScoringAgentName): FeatureWeights {
  return {
    ...BASE_WEIGHTS,
    ...AGENT_WEIGHT_OVERRIDES[agent],
  };
}
