/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import type { DiscoveredModel } from '../types';
import { getIntraProviderTierBonus } from './intra-provider-tier';

function m(
  input: Partial<DiscoveredModel> & { model: string },
): DiscoveredModel {
  const [providerID] = input.model.split('/');
  return {
    providerID: providerID ?? 'anthropic',
    model: input.model,
    name: input.name ?? input.model,
    status: input.status ?? 'active',
    contextLimit: input.contextLimit ?? 200000,
    outputLimit: input.outputLimit ?? 32000,
    reasoning: input.reasoning ?? true,
    toolcall: input.toolcall ?? true,
    attachment: input.attachment ?? false,
  };
}

describe('getIntraProviderTierBonus', () => {
  const opusModel = m({ model: 'anthropic/claude-opus-4-6' });
  const sonnetModel = m({ model: 'anthropic/claude-sonnet-4-5' });
  const haikuModel = m({
    model: 'anthropic/claude-haiku-4-5',
    reasoning: false,
  });

  // Explorer should prefer Haiku over Opus
  test('explorer: haiku > opus', () => {
    expect(getIntraProviderTierBonus('explorer', haikuModel)).toBeGreaterThan(
      getIntraProviderTierBonus('explorer', opusModel),
    );
  });

  // Librarian should prefer Sonnet/Haiku over Opus
  test('librarian: sonnet > opus', () => {
    expect(getIntraProviderTierBonus('librarian', sonnetModel)).toBeGreaterThan(
      getIntraProviderTierBonus('librarian', opusModel),
    );
  });

  // Oracle should prefer Opus
  test('oracle: opus > haiku', () => {
    expect(getIntraProviderTierBonus('oracle', opusModel)).toBeGreaterThan(
      getIntraProviderTierBonus('oracle', haikuModel),
    );
  });

  // Engineer should prefer Opus for deep work
  test('engineer: opus > haiku', () => {
    expect(getIntraProviderTierBonus('engineer', opusModel)).toBeGreaterThan(
      getIntraProviderTierBonus('engineer', haikuModel),
    );
  });

  // OpenAI tiers
  const codexModel = m({ model: 'openai/gpt-5.3-codex' });
  const codexMiniModel = m({ model: 'openai/gpt-5.1-codex-mini' });

  test('engineer: codex > codex-mini', () => {
    expect(getIntraProviderTierBonus('engineer', codexModel)).toBeGreaterThan(
      getIntraProviderTierBonus('engineer', codexMiniModel),
    );
  });

  test('explorer: codex-mini > codex', () => {
    expect(
      getIntraProviderTierBonus('explorer', codexMiniModel),
    ).toBeGreaterThan(getIntraProviderTierBonus('explorer', codexModel));
  });
});
