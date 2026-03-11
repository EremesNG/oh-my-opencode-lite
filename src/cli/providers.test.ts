/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import {
  generateAntigravityMixedPreset,
  generateLiteConfig,
  MODEL_MAPPINGS,
} from './providers';

describe('providers', () => {
  test('generateLiteConfig generates kimi config when only kimi selected', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: true,
      hasOpenAI: false,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.preset).toBe('kimi');
    const agents = (config.presets as any).kimi;
    expect(agents).toBeDefined();
    expect(agents.engineer.model).toBe('kimi-for-coding/k2p5');
    expect(agents.engineer.variant).toBeUndefined();
    expect(agents.quick.model).toBe('kimi-for-coding/k2p5');
    expect(agents.quick.variant).toBe('low');
    // Should NOT include other presets
    expect((config.presets as any).openai).toBeUndefined();
    expect((config.presets as any)['zen-free']).toBeUndefined();
  });

  test('generateLiteConfig generates kimi-openai preset when both selected', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: true,
      hasOpenAI: true,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.preset).toBe('kimi');
    const agents = (config.presets as any).kimi;
    expect(agents).toBeDefined();
    expect(agents.engineer.model).toBe('kimi-for-coding/k2p5');
    expect(agents.engineer.variant).toBeUndefined();
    // Oracle uses OpenAI when both kimi and openai are enabled
    expect(agents.oracle.model).toBe('openai/gpt-5.3-codex');
    expect(agents.oracle.variant).toBe('high');
    // Should NOT include other presets
    expect((config.presets as any).openai).toBeUndefined();
    expect((config.presets as any)['zen-free']).toBeUndefined();
  });

  test('generateLiteConfig generates openai preset when only openai selected', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: true,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.preset).toBe('openai');
    const agents = (config.presets as any).openai;
    expect(agents).toBeDefined();
    expect(agents.engineer.model).toBe(MODEL_MAPPINGS.openai.engineer.model);
    expect(agents.engineer.variant).toBeUndefined();
    // Should NOT include other presets
    expect((config.presets as any).kimi).toBeUndefined();
    expect((config.presets as any)['zen-free']).toBeUndefined();
  });

  test('generateLiteConfig generates chutes preset when only chutes selected', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: false,
      hasChutes: true,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
      selectedChutesPrimaryModel: 'chutes/kimi-k2.5',
      selectedChutesSecondaryModel: 'chutes/minimax-m2.1',
    });

    expect(config.preset).toBe('chutes');
    const agents = (config.presets as any).chutes;
    expect(agents).toBeDefined();
    expect(agents.engineer.model).toBe('chutes/kimi-k2.5');
    expect(agents.oracle.model).toBe('chutes/kimi-k2.5');
    expect(agents.designer.model).toBe('chutes/kimi-k2.5');
    expect(agents.explorer.model).toBe('chutes/minimax-m2.1');
    expect(agents.librarian.model).toBe('chutes/minimax-m2.1');
    expect(agents.quick.model).toBe('chutes/minimax-m2.1');
  });

  test('generateLiteConfig generates anthropic preset when only anthropic selected', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: false,
      hasAnthropic: true,
      hasCopilot: false,
      hasZaiPlan: false,
      hasChutes: false,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.preset).toBe('anthropic');
    const agents = (config.presets as any).anthropic;
    expect(agents.engineer.model).toBe('anthropic/claude-opus-4-6');
    expect(agents.oracle.model).toBe('anthropic/claude-opus-4-6');
    expect(agents.explorer.model).toBe('anthropic/claude-haiku-4-5');
  });

  test('generateLiteConfig prefers Chutes Kimi in mixed openai/antigravity when chutes is enabled', () => {
    const config = generateLiteConfig({
      hasAntigravity: true,
      hasKimi: false,
      hasOpenAI: true,
      hasChutes: true,
      hasOpencodeZen: true,
      useOpenCodeFreeModels: true,
      selectedOpenCodePrimaryModel: 'opencode/glm-4.7-free',
      selectedOpenCodeSecondaryModel: 'opencode/gpt-5-nano',
      selectedChutesPrimaryModel: 'chutes/kimi-k2.5',
      selectedChutesSecondaryModel: 'chutes/minimax-m2.1',
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.preset).toBe('antigravity-mixed-openai');
    const agents = (config.presets as any)['antigravity-mixed-openai'];
    expect(agents.engineer.model).toBe('chutes/kimi-k2.5');
    expect(agents.oracle.model).toBe('openai/gpt-5.3-codex');
    expect(agents.explorer.model).toBe('opencode/gpt-5-nano');
  });

  test('generateLiteConfig emits fallback chains for all configured agents', () => {
    const config = generateLiteConfig({
      hasAntigravity: true,
      hasKimi: true,
      hasOpenAI: true,
      hasChutes: true,
      hasOpencodeZen: true,
      useOpenCodeFreeModels: true,
      selectedOpenCodePrimaryModel: 'opencode/glm-4.7-free',
      selectedOpenCodeSecondaryModel: 'opencode/gpt-5-nano',
      selectedChutesPrimaryModel: 'chutes/kimi-k2.5',
      selectedChutesSecondaryModel: 'chutes/minimax-m2.1',
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect((config.fallback as any).enabled).toBe(true);
    expect((config.fallback as any).timeoutMs).toBe(15000);
    const chains = (config.fallback as any).chains;
    expect(Object.keys(chains).sort()).toEqual([
      'architect',
      'deep',
      'designer',
      'engineer',
      'explorer',
      'librarian',
      'oracle',
      'planner',
      'quick',
    ]);
    expect(chains.engineer).toContain('openai/gpt-5.3-codex');
    expect(chains.engineer).toContain('kimi-for-coding/k2p5');
    expect(chains.engineer).toContain('google/antigravity-gemini-3-flash');
    expect(chains.engineer).toContain('chutes/kimi-k2.5');
    expect(chains.engineer).toContain('opencode/glm-4.7-free');
  });

  test('generateLiteConfig generates zen-free preset when no providers selected', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: false,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.preset).toBe('zen-free');
    const agents = (config.presets as any)['zen-free'];
    expect(agents).toBeDefined();
    expect(agents.engineer.model).toBe('opencode/big-pickle');
    expect(agents.engineer.variant).toBeUndefined();
    // Should NOT include other presets
    expect((config.presets as any).kimi).toBeUndefined();
    expect((config.presets as any).openai).toBeUndefined();
  });

  test('generateLiteConfig uses zen-free big-pickle models', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: false,
      hasOpencodeZen: true,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.preset).toBe('zen-free');
    const agents = (config.presets as any)['zen-free'];
    expect(agents.engineer.model).toBe('opencode/big-pickle');
    expect(agents.oracle.model).toBe('opencode/big-pickle');
    expect(agents.oracle.variant).toBe('high');
    expect(agents.librarian.model).toBe('opencode/big-pickle');
    expect(agents.librarian.variant).toBe('low');
  });

  test('generateLiteConfig enables tmux when requested', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: false,
      hasOpencodeZen: false,
      hasTmux: true,
      installSkills: false,
      installCustomSkills: false,
    });

    expect(config.tmux).toBeDefined();
    expect((config.tmux as any).enabled).toBe(true);
  });

  test('generateLiteConfig includes default skills', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: true,
      hasOpenAI: false,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: true,
      installCustomSkills: false,
    });

    const agents = (config.presets as any).kimi;
    // Engineer should always have '*'
    expect(agents.engineer.skills).toEqual(['*']);

    // Designer should have 'agent-browser'
    expect(agents.designer.skills).toContain('agent-browser');

    // Quick/deep implementer agents should have no skills by default (empty recommended list)
    expect(agents.quick.skills).toEqual([]);
    expect(agents.deep.skills).toEqual([]);
  });

  test('generateLiteConfig includes mcps field', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: true,
      hasOpenAI: false,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    const agents = (config.presets as any).kimi;
    expect(agents.engineer.mcps).toBeDefined();
    expect(Array.isArray(agents.engineer.mcps)).toBe(true);
    expect(agents.librarian.mcps).toBeDefined();
    expect(Array.isArray(agents.librarian.mcps)).toBe(true);
  });

  test('generateLiteConfig applies OpenCode free model overrides in hybrid mode', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: true,
      hasOpencodeZen: true,
      useOpenCodeFreeModels: true,
      selectedOpenCodePrimaryModel: 'opencode/glm-4.7-free',
      selectedOpenCodeSecondaryModel: 'opencode/gpt-5-nano',
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    const agents = (config.presets as any).openai;
    expect(agents.engineer.model).toBe(MODEL_MAPPINGS.openai.engineer.model);
    expect(agents.oracle.model).toBe(MODEL_MAPPINGS.openai.oracle.model);
    expect(agents.explorer.model).toBe('opencode/gpt-5-nano');
    expect(agents.librarian.model).toBe('opencode/gpt-5-nano');
    expect(agents.quick.model).toBe('opencode/gpt-5-nano');
  });

  test('generateLiteConfig applies OpenCode free model overrides in OpenCode-only mode', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: false,
      hasOpencodeZen: true,
      useOpenCodeFreeModels: true,
      selectedOpenCodePrimaryModel: 'opencode/glm-4.7-free',
      selectedOpenCodeSecondaryModel: 'opencode/gpt-5-nano',
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    const agents = (config.presets as any)['zen-free'];
    expect(agents.engineer.model).toBe('opencode/glm-4.7-free');
    expect(agents.oracle.model).toBe('opencode/glm-4.7-free');
    expect(agents.designer.model).toBe('opencode/glm-4.7-free');
    expect(agents.explorer.model).toBe('opencode/gpt-5-nano');
    expect(agents.librarian.model).toBe('opencode/gpt-5-nano');
    expect(agents.quick.model).toBe('opencode/gpt-5-nano');
  });

  test('generateLiteConfig zen-free includes correct mcps', () => {
    const config = generateLiteConfig({
      hasAntigravity: false,
      hasKimi: false,
      hasOpenAI: false,
      hasOpencodeZen: false,
      hasTmux: false,
      installSkills: false,
      installCustomSkills: false,
    });

    const agents = (config.presets as any)['zen-free'];
    expect(agents.engineer.mcps).toContain('websearch');
    expect(agents.librarian.mcps).toContain('websearch');
    expect(agents.librarian.mcps).toContain('context7');
    expect(agents.librarian.mcps).toContain('grep_app');
    expect(agents.designer.mcps).toEqual([]);
  });

  // Antigravity tests
  describe('Antigravity presets', () => {
    test('generateLiteConfig generates antigravity-mixed-both preset when all providers selected', () => {
      const config = generateLiteConfig({
        hasKimi: true,
        hasOpenAI: true,
        hasAntigravity: true,
        hasOpencodeZen: false,
        hasTmux: false,
        installSkills: false,
        installCustomSkills: false,
      });

      expect(config.preset).toBe('antigravity-mixed-both');
      const agents = (config.presets as any)['antigravity-mixed-both'];
      expect(agents).toBeDefined();

      // Engineer should use Kimi
      expect(agents.engineer.model).toBe('kimi-for-coding/k2p5');

      // Oracle should use OpenAI
      expect(agents.oracle.model).toBe('openai/gpt-5.3-codex');
      expect(agents.oracle.variant).toBe('high');

      // Explorer/Librarian/Designer use Antigravity Flash; quick/deep prefer OpenAI
      expect(agents.explorer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.explorer.variant).toBe('low');
      expect(agents.librarian.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.librarian.variant).toBe('low');
      expect(agents.designer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.designer.variant).toBe('medium');
      expect(agents.quick.model).toBe('openai/gpt-5.1-codex-mini');
      expect(agents.quick.variant).toBe('low');
      expect(agents.deep.model).toBe('openai/gpt-5.3-codex');
    });

    test('generateLiteConfig generates antigravity-mixed-kimi preset when Kimi + Antigravity', () => {
      const config = generateLiteConfig({
        hasKimi: true,
        hasOpenAI: false,
        hasAntigravity: true,
        hasOpencodeZen: false,
        hasTmux: false,
        installSkills: false,
        installCustomSkills: false,
      });

      expect(config.preset).toBe('antigravity-mixed-kimi');
      const agents = (config.presets as any)['antigravity-mixed-kimi'];
      expect(agents).toBeDefined();

      // Engineer should use Kimi
      expect(agents.engineer.model).toBe('kimi-for-coding/k2p5');

      // Oracle should use Antigravity (no OpenAI)
      expect(agents.oracle.model).toBe('google/antigravity-gemini-3.1-pro');

      // Others should use Antigravity Flash
      expect(agents.explorer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.librarian.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.designer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.quick.model).toBe('google/antigravity-gemini-3-flash');
    });

    test('generateLiteConfig generates antigravity-mixed-openai preset when OpenAI + Antigravity', () => {
      const config = generateLiteConfig({
        hasKimi: false,
        hasOpenAI: true,
        hasAntigravity: true,
        hasOpencodeZen: false,
        hasTmux: false,
        installSkills: false,
        installCustomSkills: false,
      });

      expect(config.preset).toBe('antigravity-mixed-openai');
      const agents = (config.presets as any)['antigravity-mixed-openai'];
      expect(agents).toBeDefined();

      // Engineer should use Antigravity (no Kimi)
      expect(agents.engineer.model).toBe('google/antigravity-gemini-3-flash');

      // Oracle should use OpenAI
      expect(agents.oracle.model).toBe('openai/gpt-5.3-codex');
      expect(agents.oracle.variant).toBe('high');

      // Explorer/Librarian/Designer use Antigravity Flash; quick/deep prefer OpenAI
      expect(agents.explorer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.librarian.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.designer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.quick.model).toBe('openai/gpt-5.1-codex-mini');
      expect(agents.deep.model).toBe('openai/gpt-5.3-codex');
    });

    test('generateLiteConfig generates pure antigravity preset when only Antigravity', () => {
      const config = generateLiteConfig({
        hasKimi: false,
        hasOpenAI: false,
        hasAntigravity: true,
        hasOpencodeZen: false,
        hasTmux: false,
        installSkills: false,
        installCustomSkills: false,
      });

      expect(config.preset).toBe('antigravity');
      const agents = (config.presets as any).antigravity;
      expect(agents).toBeDefined();

      // All agents should use Antigravity
      expect(agents.engineer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.oracle.model).toBe('google/antigravity-gemini-3.1-pro');
      expect(agents.explorer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.librarian.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.designer.model).toBe('google/antigravity-gemini-3-flash');
      expect(agents.quick.model).toBe('google/antigravity-gemini-3-flash');
    });

    test('generateAntigravityMixedPreset respects Kimi for engineer', () => {
      const preset = generateAntigravityMixedPreset({
        hasKimi: true,
        hasOpenAI: false,
        hasAntigravity: true,
        hasOpencodeZen: false,
        hasTmux: false,
        installSkills: false,
        installCustomSkills: false,
      });

      expect((preset.engineer as any).model).toBe('kimi-for-coding/k2p5');
    });

    test('generateAntigravityMixedPreset respects OpenAI for oracle', () => {
      const preset = generateAntigravityMixedPreset({
        hasKimi: false,
        hasOpenAI: true,
        hasAntigravity: true,
        hasOpencodeZen: false,
        hasTmux: false,
        installSkills: false,
        installCustomSkills: false,
      });

      expect((preset.oracle as any).model).toBe('openai/gpt-5.3-codex');
      expect((preset.oracle as any).variant).toBe('high');
    });

    test('generateAntigravityMixedPreset uses OpenAI quick/deep and Antigravity support defaults', () => {
      const preset = generateAntigravityMixedPreset({
        hasKimi: true,
        hasOpenAI: true,
        hasAntigravity: true,
        hasOpencodeZen: false,
        hasTmux: false,
        installSkills: false,
        installCustomSkills: false,
      });

      expect((preset.explorer as any).model).toBe(
        'google/antigravity-gemini-3-flash',
      );
      expect((preset.librarian as any).model).toBe(
        'google/antigravity-gemini-3-flash',
      );
      expect((preset.designer as any).model).toBe(
        'google/antigravity-gemini-3-flash',
      );
      expect((preset.quick as any).model).toBe('openai/gpt-5.1-codex-mini');
      expect((preset.deep as any).model).toBe('openai/gpt-5.3-codex');
    });
  });
});
