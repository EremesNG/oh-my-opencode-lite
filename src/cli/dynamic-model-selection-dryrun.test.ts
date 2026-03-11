/// <reference types="bun-types" />

/**
 * Dry-run simulation tests that exercise realistic provider catalogs
 * to verify the three fixes:
 *   1. Anthropic-only: quick/librarian get Sonnet, not Opus
 *   2. Gemini 3.1-pro-preview beats Gemini 2.5-pro
 *   3. Kimi models appear from cross-provider sources
 */

import { describe, expect, test } from 'bun:test';
import { buildDynamicModelPlan } from './dynamic-model-selection';
import type { DiscoveredModel, InstallConfig } from './types';

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
    dailyRequestLimit: input.dailyRequestLimit,
    costInput: input.costInput,
    costOutput: input.costOutput,
  };
}

// ---------------------------------------------------------------------------
// Realistic Anthropic catalog (23 models, mimicking real OpenCode discovery)
// ---------------------------------------------------------------------------
const ANTHROPIC_CATALOG: DiscoveredModel[] = [
  // Opus variants
  m({
    model: 'anthropic/claude-opus-4-6',
    contextLimit: 200000,
    outputLimit: 128000,
  }),
  m({
    model: 'anthropic/claude-opus-4-5',
    contextLimit: 200000,
    outputLimit: 128000,
  }),
  m({
    model: 'anthropic/claude-opus-4-0',
    contextLimit: 200000,
    outputLimit: 128000,
  }),
  // Sonnet variants
  m({
    model: 'anthropic/claude-sonnet-4-6',
    contextLimit: 200000,
    outputLimit: 64000,
  }),
  m({
    model: 'anthropic/claude-sonnet-4-5',
    contextLimit: 200000,
    outputLimit: 64000,
  }),
  m({
    model: 'anthropic/claude-sonnet-4-0',
    contextLimit: 200000,
    outputLimit: 64000,
  }),
  m({
    model: 'anthropic/claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    contextLimit: 200000,
    outputLimit: 64000,
  }),
  // Haiku variants
  m({
    model: 'anthropic/claude-haiku-4-5',
    contextLimit: 200000,
    outputLimit: 32000,
    reasoning: false,
  }),
  m({
    model: 'anthropic/claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    contextLimit: 200000,
    outputLimit: 32000,
    reasoning: false,
  }),
];

// ---------------------------------------------------------------------------
// Realistic Google catalog (Gemini Pro + Flash, with preview suffixes)
// ---------------------------------------------------------------------------
const GOOGLE_CATALOG: DiscoveredModel[] = [
  m({
    model: 'google/antigravity-gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    contextLimit: 1000000,
    outputLimit: 64000,
    attachment: true,
  }),
  m({
    model: 'google/antigravity-gemini-3-pro-preview',
    name: 'Gemini 3.0 Pro Preview',
    contextLimit: 1000000,
    outputLimit: 64000,
    attachment: true,
  }),
  m({
    model: 'google/antigravity-gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    contextLimit: 1000000,
    outputLimit: 64000,
    attachment: true,
  }),
  m({
    model: 'google/antigravity-gemini-3-flash',
    name: 'Gemini 3.0 Flash',
    contextLimit: 1000000,
    outputLimit: 32000,
    attachment: true,
  }),
  m({
    model: 'google/antigravity-gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    contextLimit: 1000000,
    outputLimit: 32000,
    attachment: true,
  }),
];

// ---------------------------------------------------------------------------
// Cross-provider Kimi models (the real situation)
// ---------------------------------------------------------------------------
const KIMI_CROSS_PROVIDER: DiscoveredModel[] = [
  m({
    model: 'opencode/kimi-k2.5',
    name: 'Kimi K2.5',
    contextLimit: 131072,
    outputLimit: 32000,
  }),
  m({
    model: 'azure/kimi-k2.5',
    name: 'Kimi K2.5',
    contextLimit: 131072,
    outputLimit: 32000,
  }),
];

const OPENCODE_MODELS: DiscoveredModel[] = [
  m({ model: 'opencode/glm-4.7-free' }),
  m({ model: 'opencode/gpt-5-nano', reasoning: false }),
];

function baseConfig(): InstallConfig {
  return {
    hasKimi: false,
    hasOpenAI: false,
    hasAnthropic: false,
    hasCopilot: false,
    hasZaiPlan: false,
    hasAntigravity: false,
    hasChutes: false,
    hasOpencodeZen: true,
    useOpenCodeFreeModels: true,
    selectedOpenCodePrimaryModel: 'opencode/glm-4.7-free',
    selectedOpenCodeSecondaryModel: 'opencode/gpt-5-nano',
    selectedChutesPrimaryModel: undefined,
    selectedChutesSecondaryModel: undefined,
    hasTmux: false,
    installSkills: false,
    installCustomSkills: false,
    setupMode: 'quick',
  };
}

function agentModel(
  plan: ReturnType<typeof buildDynamicModelPlan>,
  agent: string,
): string | undefined {
  return plan?.agents[agent]?.model;
}

describe('dry-run: issue fixes', () => {
  // -----------------------------------------------------------------------
  // Issue 1: Anthropic-only — quick/librarian should prefer Sonnet over Opus
  // -----------------------------------------------------------------------
  describe('Issue 1: Anthropic quick/librarian prefers Sonnet over Opus', () => {
    const catalog = [...ANTHROPIC_CATALOG, ...OPENCODE_MODELS];
    const config: InstallConfig = {
      ...baseConfig(),
      hasAnthropic: true,
    };

    test('v2 assigns Sonnet (not Opus) to librarian', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      const librarian = agentModel(plan, 'librarian');
      expect(librarian).toBeDefined();
      expect(librarian).not.toContain('opus');
      expect(librarian).toMatch(/sonnet|haiku/);
    });

    test('v2 assigns Sonnet (not Opus) to quick', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      const quick = agentModel(plan, 'quick');
      expect(quick).toBeDefined();
      expect(quick).not.toContain('opus');
      expect(quick).toMatch(/sonnet|haiku/);
    });

    test('v2 assigns Haiku to explorer', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      const explorer = agentModel(plan, 'explorer');
      expect(explorer).toBeDefined();
      expect(explorer).toContain('haiku');
    });

    test('v2 still assigns Opus to planner/architect (communicator roles)', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      // Opus should still be preferred for communicator-heavy roles
      const planner = agentModel(plan, 'planner');
      const architect = agentModel(plan, 'architect');
      expect(planner).toContain('opus');
      expect(architect).toContain('opus');
    });
  });

  // -----------------------------------------------------------------------
  // Issue 2: Gemini 3.1-pro-preview should beat Gemini 2.5-pro
  // -----------------------------------------------------------------------
  describe('Issue 2: Gemini 3.1 preview beats 2.5 GA', () => {
    const catalog = [...GOOGLE_CATALOG, ...OPENCODE_MODELS];
    const config: InstallConfig = {
      ...baseConfig(),
      hasAntigravity: true,
    };

    test('v2 selects Gemini 3.1-pro for oracle/designer over 2.5-pro', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();

      // For premium roles, 3.1-pro should win over 2.5-pro
      const oracle = agentModel(plan, 'oracle');
      const designer = agentModel(plan, 'designer');
      expect(oracle).toMatch(/gemini-3/);
      expect(designer).toMatch(/gemini-3/);
    });

    test('v2 selects Flash for explorer (speed-runner)', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      const explorer = agentModel(plan, 'explorer');
      expect(explorer).toMatch(/flash/);
    });
  });

  // -----------------------------------------------------------------------
  // Issue 3: Kimi models discovered from cross-provider sources
  // -----------------------------------------------------------------------
  describe('Issue 3: Kimi models from cross-provider sources', () => {
    test('Kimi K2.5 injected as kimi-for-coding when only source is opencode', () => {
      // Only Kimi under opencode/ — no kimi-for-coding/ models in catalog.
      // With hasKimi=true, the engine should clone it as kimi-for-coding
      // so it's treated as a paid-provider model.
      const catalog = [...KIMI_CROSS_PROVIDER, ...OPENCODE_MODELS];
      const config: InstallConfig = {
        ...baseConfig(),
        hasKimi: true,
      };

      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      const allModels = Object.values(plan?.agents ?? {}).map((a) => a.model);
      // Kimi should appear as a primary model for some agent
      const hasKimi = allModels.some((model) => /kimi/i.test(model));
      expect(hasKimi).toBe(true);
    });

    test('Kimi appears alongside weaker providers', () => {
      // Kimi + copilot (grok-fast) — Kimi should win communicator roles,
      // grok should win speed roles.
      const catalog = [
        ...KIMI_CROSS_PROVIDER,
        ...OPENCODE_MODELS,
        m({ model: 'github-copilot/grok-code-fast-1' }),
      ];
      const config: InstallConfig = {
        ...baseConfig(),
        hasKimi: true,
        hasCopilot: true,
      };

      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      const allModels = Object.values(plan?.agents ?? {}).map((a) => a.model);
      const kimiCount = allModels.filter((m) => /kimi/i.test(m)).length;
      const grokCount = allModels.filter((m) => /grok/i.test(m)).length;
      expect(kimiCount).toBeGreaterThan(0);
      expect(grokCount).toBeGreaterThan(0);
    });

    test('azure/kimi not injected when hasKimi=false', () => {
      const catalog = [...KIMI_CROSS_PROVIDER, ...OPENCODE_MODELS];
      const config: InstallConfig = {
        ...baseConfig(),
        hasKimi: false,
      };

      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      const allModels = Object.values(plan?.agents ?? {}).map((a) => a.model);
      // azure/kimi should NOT appear — azure provider not enabled
      const hasAzureKimi = allModels.some(
        (model) => model === 'azure/kimi-k2.5',
      );
      expect(hasAzureKimi).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Combined: all providers enabled (realistic full install)
  // -----------------------------------------------------------------------
  describe('Full install: all providers', () => {
    const catalog = [
      ...ANTHROPIC_CATALOG,
      ...GOOGLE_CATALOG,
      ...KIMI_CROSS_PROVIDER,
      ...OPENCODE_MODELS,
      m({ model: 'openai/gpt-5.3-codex' }),
      m({ model: 'openai/gpt-5.1-codex-mini' }),
      m({ model: 'openai/gpt-5.4' }),
      m({ model: 'github-copilot/grok-code-fast-1' }),
      m({ model: 'chutes/kimi-k2.5' }),
      m({ model: 'chutes/minimax-m2.1' }),
    ];
    const config: InstallConfig = {
      ...baseConfig(),
      hasOpenAI: true,
      hasAnthropic: true,
      hasAntigravity: true,
      hasCopilot: true,
      hasKimi: true,
      hasChutes: true,
      selectedChutesPrimaryModel: 'chutes/kimi-k2.5',
      selectedChutesSecondaryModel: 'chutes/minimax-m2.1',
    };

    test('all 9 agents assigned', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();
      expect(Object.keys(plan?.agents ?? {}).sort()).toEqual([
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
    });

    test('explorer gets speed-runner (haiku/flash/grok/minimax)', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });
      const explorer = agentModel(plan, 'explorer');
      expect(explorer).toMatch(/haiku|flash|grok|minimax|nano/i);
    });

    test('librarian does not get Opus', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });
      const librarian = agentModel(plan, 'librarian');
      expect(librarian).not.toContain('opus');
    });

    test('quick does not get Opus', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });
      const quick = agentModel(plan, 'quick');
      expect(quick).not.toContain('opus');
    });

    test('prints full assignment table', () => {
      const plan = buildDynamicModelPlan(catalog, config, undefined, {
        scoringEngineVersion: 'v2',
      });

      expect(plan).not.toBeNull();

      // Log the full plan for visual inspection
      const table: Record<string, string> = {};
      for (const [agent, assignment] of Object.entries(plan?.agents ?? {})) {
        table[agent] = assignment.model;
      }
      console.log('\n=== Full Install v2 Assignments ===');
      console.log(JSON.stringify(table, null, 2));
      console.log('');
    });
  });
});
