import type { ModelFamily } from './model-family';
import type { ScoringAgentName } from './types';

/**
 * Role-affinity matrix: (agent role × model family) → affinity score.
 *
 * Positive = good fit, 0 = neutral, negative = anti-pattern.
 *
 * Derived from the OmO Agent-Model Matching Guide:
 * - Planner/Architect need communicators (Claude, Kimi, GLM-5)
 * - Engineer needs autonomous coders (GPT Codex)
 * - Oracle needs maximum reasoning (GPT-5.4, Gemini Pro)
 * - Designer needs visual/multimodal (Gemini Pro)
 * - Explorer needs speed above all (Grok, MiniMax, Nano, Flash)
 * - Librarian needs decent context + speed
 * - Quick needs fast coding
 * - Deep needs maximum coding capability
 */
const AFFINITY_MATRIX: Record<ScoringAgentName, Record<ModelFamily, number>> = {
  planner: {
    'claude-communicator': 1.0,
    'gpt-codex': 0.3,
    'gpt-reasoning': 0.6,
    'gemini-pro': 0.4,
    'speed-runner': -0.4,
    'all-rounder': 0.5,
  },
  architect: {
    'claude-communicator': 1.0,
    'gpt-codex': 0.3,
    'gpt-reasoning': 0.6,
    'gemini-pro': 0.4,
    'speed-runner': -0.4,
    'all-rounder': 0.5,
  },
  engineer: {
    'claude-communicator': 0.5,
    'gpt-codex': 1.0,
    'gpt-reasoning': 0.6,
    'gemini-pro': 0.3,
    'speed-runner': -0.3,
    'all-rounder': 0.4,
  },
  oracle: {
    'claude-communicator': 0.6,
    'gpt-codex': 0.3,
    'gpt-reasoning': 1.0,
    'gemini-pro': 0.8,
    'speed-runner': -0.6,
    'all-rounder': 0.3,
  },
  designer: {
    'claude-communicator': 0.3,
    'gpt-codex': 0.1,
    'gpt-reasoning': 0.4,
    'gemini-pro': 1.0,
    'speed-runner': -0.2,
    'all-rounder': 0.4,
  },
  explorer: {
    'claude-communicator': -0.5,
    'gpt-codex': -0.3,
    'gpt-reasoning': -0.4,
    'gemini-pro': -0.2,
    'speed-runner': 1.0,
    'all-rounder': 0.2,
  },
  librarian: {
    'claude-communicator': -0.3,
    'gpt-codex': -0.1,
    'gpt-reasoning': 0.2,
    'gemini-pro': 0.3,
    'speed-runner': 0.7,
    'all-rounder': 0.6,
  },
  quick: {
    'claude-communicator': -0.2,
    'gpt-codex': 0.5,
    'gpt-reasoning': 0.2,
    'gemini-pro': 0.2,
    'speed-runner': 0.8,
    'all-rounder': 0.6,
  },
  deep: {
    'claude-communicator': 0.7,
    'gpt-codex': 1.0,
    'gpt-reasoning': 0.8,
    'gemini-pro': 0.5,
    'speed-runner': -0.4,
    'all-rounder': 0.3,
  },
};

/**
 * Get the affinity score for an agent-family pair.
 * Returns a value in [-1, 1] where:
 * - 1.0 = ideal match
 * - 0.0 = neutral
 * - negative = anti-pattern
 */
export function getRoleAffinity(
  agent: ScoringAgentName,
  family: ModelFamily,
): number {
  return AFFINITY_MATRIX[agent][family];
}
