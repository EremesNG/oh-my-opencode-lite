/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import type { DiscoveredModel } from '../types';
import { classifyModelFamily } from './model-family';

function m(
  input: Partial<DiscoveredModel> & { model: string },
): DiscoveredModel {
  const [providerID] = input.model.split('/');
  return {
    providerID: providerID ?? 'openai',
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

describe('classifyModelFamily', () => {
  // Claude communicator family
  test('Claude Opus → claude-communicator', () => {
    expect(classifyModelFamily(m({ model: 'anthropic/claude-opus-4-6' }))).toBe(
      'claude-communicator',
    );
  });

  test('Claude Sonnet → all-rounder', () => {
    expect(
      classifyModelFamily(m({ model: 'anthropic/claude-sonnet-4-5' })),
    ).toBe('all-rounder');
  });

  test('Claude Haiku → speed-runner', () => {
    expect(
      classifyModelFamily(m({ model: 'anthropic/claude-haiku-4-5' })),
    ).toBe('speed-runner');
  });

  test('Kimi K2.5 → claude-communicator', () => {
    expect(
      classifyModelFamily(
        m({ model: 'kimi-for-coding/k2p5', name: 'Kimi K2.5' }),
      ),
    ).toBe('claude-communicator');
  });

  test('Kimi K2.5 via chutes → claude-communicator', () => {
    expect(
      classifyModelFamily(m({ model: 'chutes/kimi-k2.5', name: 'Kimi K2.5' })),
    ).toBe('claude-communicator');
  });

  test('GLM-5 → claude-communicator', () => {
    expect(
      classifyModelFamily(m({ model: 'opencode/glm-5', name: 'GLM-5' })),
    ).toBe('claude-communicator');
  });

  // GPT Codex family
  test('GPT-5.3 Codex → gpt-codex', () => {
    expect(classifyModelFamily(m({ model: 'openai/gpt-5.3-codex' }))).toBe(
      'gpt-codex',
    );
  });

  test('GPT-5.1 Codex Mini → gpt-codex', () => {
    expect(classifyModelFamily(m({ model: 'openai/gpt-5.1-codex-mini' }))).toBe(
      'gpt-codex',
    );
  });

  test('opencode GPT-5.3 Codex → gpt-codex', () => {
    expect(
      classifyModelFamily(
        m({ model: 'opencode/gpt-5.3-codex', name: 'GPT-5.3 Codex' }),
      ),
    ).toBe('gpt-codex');
  });

  // GPT reasoning family
  test('GPT-5.4 → gpt-reasoning', () => {
    expect(
      classifyModelFamily(m({ model: 'openai/gpt-5.4', name: 'GPT-5.4' })),
    ).toBe('gpt-reasoning');
  });

  test('GPT-5.4 Pro → gpt-reasoning', () => {
    expect(classifyModelFamily(m({ model: 'opencode/gpt-5.4-pro' }))).toBe(
      'gpt-reasoning',
    );
  });

  // Gemini Pro family
  test('Gemini 3.1 Pro → gemini-pro', () => {
    expect(
      classifyModelFamily(m({ model: 'google/antigravity-gemini-3.1-pro' })),
    ).toBe('gemini-pro');
  });

  test('opencode Gemini 3.1 Pro → gemini-pro', () => {
    expect(classifyModelFamily(m({ model: 'opencode/gemini-3.1-pro' }))).toBe(
      'gemini-pro',
    );
  });

  // Speed runners
  test('Gemini Flash → speed-runner', () => {
    expect(
      classifyModelFamily(m({ model: 'google/antigravity-gemini-3-flash' })),
    ).toBe('speed-runner');
  });

  test('Grok Code Fast → speed-runner', () => {
    expect(
      classifyModelFamily(m({ model: 'github-copilot/grok-code-fast-1' })),
    ).toBe('speed-runner');
  });

  test('MiniMax M2.1 → speed-runner', () => {
    expect(classifyModelFamily(m({ model: 'chutes/minimax-m2.1' }))).toBe(
      'speed-runner',
    );
  });

  test('GPT-5-Nano → speed-runner', () => {
    expect(classifyModelFamily(m({ model: 'opencode/gpt-5-nano' }))).toBe(
      'speed-runner',
    );
  });

  // All-rounders
  test('GLM-4.7 → all-rounder', () => {
    expect(classifyModelFamily(m({ model: 'zai-coding-plan/glm-4.7' }))).toBe(
      'all-rounder',
    );
  });

  test('Big Pickle → all-rounder', () => {
    expect(classifyModelFamily(m({ model: 'opencode/big-pickle' }))).toBe(
      'all-rounder',
    );
  });

  test('GPT-5 (non-codex, non-5.4) → all-rounder', () => {
    expect(
      classifyModelFamily(m({ model: 'opencode/gpt-5', name: 'GPT-5' })),
    ).toBe('all-rounder');
  });

  test('GPT-5.2 (non-codex) → all-rounder', () => {
    expect(
      classifyModelFamily(m({ model: 'opencode/gpt-5.2', name: 'GPT-5.2' })),
    ).toBe('all-rounder');
  });
});
