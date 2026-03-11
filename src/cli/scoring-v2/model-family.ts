import type { DiscoveredModel } from '../types';

export type ModelFamily =
  | 'claude-communicator'
  | 'gpt-codex'
  | 'gpt-reasoning'
  | 'gemini-pro'
  | 'speed-runner'
  | 'all-rounder';

/**
 * Classify a model into a personality family based on its ID, name, and provider.
 *
 * The classification drives role-affinity scoring: planner wants communicators,
 * engineer wants codex, explorer wants speed-runners, etc.
 *
 * Classification priority:
 * 1. Explicit pattern matches (codex, flash, nano, haiku, etc.)
 * 2. Provider + model family heuristics
 * 3. Fallback to 'all-rounder'
 */
export function classifyModelFamily(model: DiscoveredModel): ModelFamily {
  const text = `${model.model} ${model.name}`.toLowerCase();

  // --- Speed runners (check first — these are never "deep") ---
  if (/\b(nano|flash)\b/.test(text)) return 'speed-runner';
  if (/\bgrok[-_ ]?code[-_ ]?fast\b/.test(text)) return 'speed-runner';
  if (/\bminimax[-_ ]?m\d/.test(text)) return 'speed-runner';
  if (/\bhaiku\b/.test(text)) return 'speed-runner';

  // --- GPT Codex family ---
  if (/\bcodex\b/.test(text) && /\bgpt[-_ ]?\d/.test(text)) return 'gpt-codex';

  // --- GPT Reasoning (GPT-5.4 specifically, the strategic thinker) ---
  if (/\bgpt[-_ ]?5\.4\b/.test(text)) return 'gpt-reasoning';

  // --- Gemini Pro family ---
  if (/\bgemini[-_ ]?\d.*\bpro\b/.test(text)) return 'gemini-pro';

  // --- Claude communicator (Opus-tier) ---
  if (/\bopus\b/.test(text)) return 'claude-communicator';

  // --- Kimi K2.5 — communicator personality (Claude-like) ---
  if (/\bk2\.?5\b|\bk2p5\b/.test(text)) return 'claude-communicator';

  // --- GLM-5 — communicator personality ---
  if (/\bglm[-_ ]?5\b/.test(text) && !/\bglm[-_ ]?5\.\d/.test(text)) {
    return 'claude-communicator';
  }

  // --- Claude Sonnet — good all-rounder, not top orchestrator ---
  if (/\bsonnet\b/.test(text)) return 'all-rounder';

  // --- All-rounders: GLM-4.x, GPT-5.x (non-codex, non-5.4), etc. ---
  return 'all-rounder';
}
