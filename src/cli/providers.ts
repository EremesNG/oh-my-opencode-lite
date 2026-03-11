import { DEFAULT_AGENT_MCPS } from '../config/agent-mcps';
import { RECOMMENDED_SKILLS } from './skills';
import type { InstallConfig } from './types';

const AGENT_NAMES = [
  'planner',
  'architect',
  'engineer',
  'oracle',
  'designer',
  'explorer',
  'librarian',
  'quick',
  'deep',
] as const;

type AgentName = (typeof AGENT_NAMES)[number];

/**
 * Effort-level model mappings per provider.
 * - quick: cheapest/fastest model for simple, well-defined changes
 * - deep:  most capable model for complex changes requiring thought
 */
export const EFFORT_MODEL_MAPPINGS: Record<
  string,
  {
    quick: { model: string; variant?: string };
    deep: { model: string; variant?: string };
  }
> = {
  kimi: {
    quick: { model: 'kimi-for-coding/k2p5', variant: 'low' },
    deep: { model: 'kimi-for-coding/k2p5' },
  },
  openai: {
    quick: { model: 'openai/gpt-5.1-codex-mini', variant: 'low' },
    deep: { model: 'openai/gpt-5.3-codex' },
  },
  anthropic: {
    quick: { model: 'anthropic/claude-haiku-4-5', variant: 'low' },
    deep: { model: 'anthropic/claude-sonnet-4-5' },
  },
  copilot: {
    quick: { model: 'github-copilot/grok-code-fast-1', variant: 'low' },
    deep: { model: 'github-copilot/grok-code-fast-1' },
  },
  'zai-plan': {
    quick: { model: 'zai-coding-plan/glm-4.7', variant: 'low' },
    deep: { model: 'zai-coding-plan/glm-4.7' },
  },
  antigravity: {
    quick: { model: 'google/antigravity-gemini-3-flash', variant: 'low' },
    deep: { model: 'google/antigravity-gemini-3.1-pro' },
  },
  chutes: {
    quick: { model: 'chutes/minimax-m2.1', variant: 'low' },
    deep: { model: 'chutes/kimi-k2.5' },
  },
  'zen-free': {
    quick: { model: 'opencode/big-pickle', variant: 'low' },
    deep: { model: 'opencode/big-pickle' },
  },
};

// Model mappings by provider priority
export const MODEL_MAPPINGS = {
  kimi: {
    planner: { model: 'kimi-for-coding/k2p5' },
    architect: { model: 'kimi-for-coding/k2p5' },
    engineer: { model: 'kimi-for-coding/k2p5' },
    oracle: { model: 'kimi-for-coding/k2p5', variant: 'high' },
    librarian: { model: 'kimi-for-coding/k2p5', variant: 'low' },
    explorer: { model: 'kimi-for-coding/k2p5', variant: 'low' },
    designer: { model: 'kimi-for-coding/k2p5', variant: 'medium' },
    quick: EFFORT_MODEL_MAPPINGS.kimi.quick,
    deep: EFFORT_MODEL_MAPPINGS.kimi.deep,
  },
  openai: {
    planner: { model: 'openai/gpt-5.3-codex' },
    architect: { model: 'openai/gpt-5.3-codex' },
    engineer: { model: 'openai/gpt-5.3-codex' },
    oracle: { model: 'openai/gpt-5.3-codex', variant: 'high' },
    librarian: { model: 'openai/gpt-5.1-codex-mini', variant: 'low' },
    explorer: { model: 'openai/gpt-5.1-codex-mini', variant: 'low' },
    designer: { model: 'openai/gpt-5.1-codex-mini', variant: 'medium' },
    quick: EFFORT_MODEL_MAPPINGS.openai.quick,
    deep: EFFORT_MODEL_MAPPINGS.openai.deep,
  },
  anthropic: {
    planner: { model: 'anthropic/claude-opus-4-6' },
    architect: { model: 'anthropic/claude-opus-4-6' },
    engineer: { model: 'anthropic/claude-opus-4-6' },
    oracle: { model: 'anthropic/claude-opus-4-6', variant: 'high' },
    librarian: { model: 'anthropic/claude-sonnet-4-5', variant: 'low' },
    explorer: { model: 'anthropic/claude-haiku-4-5', variant: 'low' },
    designer: { model: 'anthropic/claude-sonnet-4-5', variant: 'medium' },
    quick: EFFORT_MODEL_MAPPINGS.anthropic.quick,
    deep: EFFORT_MODEL_MAPPINGS.anthropic.deep,
  },
  copilot: {
    planner: { model: 'github-copilot/grok-code-fast-1' },
    architect: { model: 'github-copilot/grok-code-fast-1' },
    engineer: { model: 'github-copilot/grok-code-fast-1' },
    oracle: { model: 'github-copilot/grok-code-fast-1', variant: 'high' },
    librarian: { model: 'github-copilot/grok-code-fast-1', variant: 'low' },
    explorer: { model: 'github-copilot/grok-code-fast-1', variant: 'low' },
    designer: { model: 'github-copilot/grok-code-fast-1', variant: 'medium' },
    quick: EFFORT_MODEL_MAPPINGS.copilot.quick,
    deep: EFFORT_MODEL_MAPPINGS.copilot.deep,
  },
  'zai-plan': {
    planner: { model: 'zai-coding-plan/glm-4.7' },
    architect: { model: 'zai-coding-plan/glm-4.7' },
    engineer: { model: 'zai-coding-plan/glm-4.7' },
    oracle: { model: 'zai-coding-plan/glm-4.7', variant: 'high' },
    librarian: { model: 'zai-coding-plan/glm-4.7', variant: 'low' },
    explorer: { model: 'zai-coding-plan/glm-4.7', variant: 'low' },
    designer: { model: 'zai-coding-plan/glm-4.7', variant: 'medium' },
    quick: EFFORT_MODEL_MAPPINGS['zai-plan'].quick,
    deep: EFFORT_MODEL_MAPPINGS['zai-plan'].deep,
  },
  antigravity: {
    planner: { model: 'google/antigravity-gemini-3-flash' },
    architect: { model: 'google/antigravity-gemini-3-flash' },
    engineer: { model: 'google/antigravity-gemini-3-flash' },
    oracle: { model: 'google/antigravity-gemini-3.1-pro' },
    librarian: {
      model: 'google/antigravity-gemini-3-flash',
      variant: 'low',
    },
    explorer: {
      model: 'google/antigravity-gemini-3-flash',
      variant: 'low',
    },
    designer: {
      model: 'google/antigravity-gemini-3-flash',
      variant: 'medium',
    },
    quick: EFFORT_MODEL_MAPPINGS.antigravity.quick,
    deep: EFFORT_MODEL_MAPPINGS.antigravity.deep,
  },
  chutes: {
    planner: { model: 'chutes/kimi-k2.5' },
    architect: { model: 'chutes/kimi-k2.5' },
    engineer: { model: 'chutes/kimi-k2.5' },
    oracle: { model: 'chutes/kimi-k2.5', variant: 'high' },
    librarian: { model: 'chutes/minimax-m2.1', variant: 'low' },
    explorer: { model: 'chutes/minimax-m2.1', variant: 'low' },
    designer: { model: 'chutes/kimi-k2.5', variant: 'medium' },
    quick: EFFORT_MODEL_MAPPINGS.chutes.quick,
    deep: EFFORT_MODEL_MAPPINGS.chutes.deep,
  },
  'zen-free': {
    planner: { model: 'opencode/big-pickle' },
    architect: { model: 'opencode/big-pickle' },
    engineer: { model: 'opencode/big-pickle' },
    oracle: { model: 'opencode/big-pickle', variant: 'high' },
    librarian: { model: 'opencode/big-pickle', variant: 'low' },
    explorer: { model: 'opencode/big-pickle', variant: 'low' },
    designer: { model: 'opencode/big-pickle', variant: 'medium' },
    quick: EFFORT_MODEL_MAPPINGS['zen-free'].quick,
    deep: EFFORT_MODEL_MAPPINGS['zen-free'].deep,
  },
} as const;

export function generateAntigravityMixedPreset(
  config: InstallConfig,
  existingPreset?: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = existingPreset
    ? { ...existingPreset }
    : {};

  const createAgentConfig = (
    agentName: string,
    modelInfo: { model: string; variant?: string },
  ) => {
    const isPrimary = ['planner', 'architect', 'engineer'].includes(agentName);

    // Skills: primary agents get "*", others get recommended skills for role
    const skills = isPrimary
      ? ['*']
      : RECOMMENDED_SKILLS.filter(
          (s) =>
            s.allowedAgents.includes('*') ||
            s.allowedAgents.includes(agentName),
        ).map((s) => s.skillName);

    // Special case for designer and agent-browser skill
    if (agentName === 'designer' && !skills.includes('agent-browser')) {
      skills.push('agent-browser');
    }

    return {
      model: modelInfo.model,
      variant: modelInfo.variant,
      skills,
      mcps:
        DEFAULT_AGENT_MCPS[agentName as keyof typeof DEFAULT_AGENT_MCPS] ?? [],
    };
  };

  const antigravityFlash = {
    model: 'google/antigravity-gemini-3-flash',
  };

  const chutesPrimary =
    config.selectedChutesPrimaryModel ?? MODEL_MAPPINGS.chutes.engineer.model;
  const chutesSupport =
    config.selectedChutesSecondaryModel ?? MODEL_MAPPINGS.chutes.explorer.model;

  // Engineer: Kimi if hasKimi, else Chutes Kimi if enabled, else antigravity
  if (config.hasKimi) {
    result.planner = createAgentConfig('planner', MODEL_MAPPINGS.kimi.planner);
    result.architect = createAgentConfig(
      'architect',
      MODEL_MAPPINGS.kimi.architect,
    );
    result.engineer = createAgentConfig(
      'engineer',
      MODEL_MAPPINGS.kimi.engineer,
    );
  } else if (config.hasChutes) {
    result.planner = createAgentConfig('planner', {
      model: chutesPrimary,
    });
    result.architect = createAgentConfig('architect', {
      model: chutesPrimary,
    });
    result.engineer = createAgentConfig('engineer', {
      model: chutesPrimary,
    });
  } else if (!result.engineer) {
    result.planner = createAgentConfig(
      'planner',
      MODEL_MAPPINGS.antigravity.planner,
    );
    result.architect = createAgentConfig(
      'architect',
      MODEL_MAPPINGS.antigravity.architect,
    );
    result.engineer = createAgentConfig(
      'engineer',
      MODEL_MAPPINGS.antigravity.engineer,
    );
  }

  // Oracle: GPT if hasOpenAI, else keep existing if exists, else antigravity
  if (config.hasOpenAI) {
    result.oracle = createAgentConfig('oracle', MODEL_MAPPINGS.openai.oracle);
  } else if (!result.oracle) {
    result.oracle = createAgentConfig(
      'oracle',
      MODEL_MAPPINGS.antigravity.oracle,
    );
  }

  // Explorer stays flash-first for speed.
  result.explorer = createAgentConfig('explorer', {
    ...antigravityFlash,
    variant: 'low',
  });

  // Librarian/Designer prefer Kimi-K2.5 via Chutes when available.
  if (config.hasChutes) {
    result.librarian = createAgentConfig('librarian', {
      model: chutesSupport,
      variant: 'low',
    });
    result.designer = createAgentConfig('designer', {
      model: chutesPrimary,
      variant: 'medium',
    });
  } else {
    result.librarian = createAgentConfig('librarian', {
      ...antigravityFlash,
      variant: 'low',
    });
    result.designer = createAgentConfig('designer', {
      ...antigravityFlash,
      variant: 'medium',
    });
  }

  // Quick/deep are normal first-class agent configs.
  if (config.hasOpenAI) {
    result.quick = createAgentConfig(
      'quick',
      EFFORT_MODEL_MAPPINGS.openai.quick,
    );
    result.deep = createAgentConfig('deep', EFFORT_MODEL_MAPPINGS.openai.deep);
  } else if (config.hasChutes) {
    result.quick = createAgentConfig('quick', {
      model: chutesSupport,
      variant: 'low',
    });
    result.deep = createAgentConfig('deep', { model: chutesPrimary });
  } else {
    result.quick = createAgentConfig(
      'quick',
      EFFORT_MODEL_MAPPINGS.antigravity.quick,
    );
    result.deep = createAgentConfig(
      'deep',
      EFFORT_MODEL_MAPPINGS.antigravity.deep,
    );
  }

  return result;
}

export function generateLiteConfig(
  installConfig: InstallConfig,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    preset: 'zen-free',
    presets: {},
    balanceProviderUsage: installConfig.balanceProviderUsage ?? false,
  };

  // Handle manual configuration mode
  if (
    installConfig.setupMode === 'manual' &&
    installConfig.manualAgentConfigs
  ) {
    config.preset = 'manual';
    const manualPreset: Record<string, unknown> = {};
    const chains: Record<string, string[]> = {};

    for (const agentName of AGENT_NAMES) {
      const manualConfig = installConfig.manualAgentConfigs[agentName];
      if (manualConfig) {
        // Build fallback chain from manual config
        const fallbackChain = [
          manualConfig.primary,
          manualConfig.fallback1,
          manualConfig.fallback2,
          manualConfig.fallback3,
        ].filter((m, i, arr) => m && arr.indexOf(m) === i) as string[]; // dedupe

        manualPreset[agentName] = {
          model: manualConfig.primary,
          skills: ['planner', 'architect', 'engineer'].includes(agentName)
            ? ['*']
            : RECOMMENDED_SKILLS.filter(
                (s) =>
                  s.allowedAgents.includes('*') ||
                  s.allowedAgents.includes(agentName),
              ).map((s) => s.skillName),
          mcps:
            DEFAULT_AGENT_MCPS[agentName as keyof typeof DEFAULT_AGENT_MCPS] ??
            [],
        };
        chains[agentName] = fallbackChain;
      }
    }

    (config.presets as Record<string, unknown>).manual = manualPreset;
    config.fallback = {
      enabled: true,
      timeoutMs: 15000,
      chains,
    };

    if (installConfig.hasTmux) {
      config.tmux = {
        enabled: true,
        layout: 'main-vertical',
        main_pane_size: 60,
      };
    }

    return config;
  }

  // Determine active preset name
  let activePreset:
    | 'kimi'
    | 'openai'
    | 'anthropic'
    | 'copilot'
    | 'zai-plan'
    | 'antigravity'
    | 'chutes'
    | 'antigravity-mixed-both'
    | 'antigravity-mixed-kimi'
    | 'antigravity-mixed-openai'
    | 'zen-free' = 'zen-free';

  // Antigravity mixed presets have priority
  if (
    installConfig.hasAntigravity &&
    installConfig.hasKimi &&
    installConfig.hasOpenAI
  ) {
    activePreset = 'antigravity-mixed-both';
  } else if (installConfig.hasAntigravity && installConfig.hasKimi) {
    activePreset = 'antigravity-mixed-kimi';
  } else if (installConfig.hasAntigravity && installConfig.hasOpenAI) {
    activePreset = 'antigravity-mixed-openai';
  } else if (installConfig.hasAntigravity) {
    activePreset = 'antigravity';
  } else if (installConfig.hasKimi) {
    activePreset = 'kimi';
  } else if (installConfig.hasOpenAI) {
    activePreset = 'openai';
  } else if (installConfig.hasAnthropic) {
    activePreset = 'anthropic';
  } else if (installConfig.hasCopilot) {
    activePreset = 'copilot';
  } else if (installConfig.hasZaiPlan) {
    activePreset = 'zai-plan';
  } else if (installConfig.hasChutes) {
    activePreset = 'chutes';
  }

  config.preset = activePreset;

  const createAgentConfig = (
    agentName: string,
    modelInfo: { model: string; variant?: string },
  ) => {
    const isPrimary = ['planner', 'architect', 'engineer'].includes(agentName);

    // Skills: primary agents get "*", others get recommended skills for role
    const skills = isPrimary
      ? ['*']
      : RECOMMENDED_SKILLS.filter(
          (s) =>
            s.allowedAgents.includes('*') ||
            s.allowedAgents.includes(agentName),
        ).map((s) => s.skillName);

    // Special case for designer and agent-browser skill
    if (agentName === 'designer' && !skills.includes('agent-browser')) {
      skills.push('agent-browser');
    }

    return {
      model: modelInfo.model,
      variant: modelInfo.variant,
      skills,
      mcps:
        DEFAULT_AGENT_MCPS[agentName as keyof typeof DEFAULT_AGENT_MCPS] ?? [],
    };
  };

  if (installConfig.dynamicModelPlan) {
    const dynamicPreset: Record<string, unknown> = {};
    for (const [agentName, assignment] of Object.entries(
      installConfig.dynamicModelPlan.agents,
    )) {
      const info = assignment as {
        model: string;
        variant?: string;
      };
      dynamicPreset[agentName] = createAgentConfig(agentName, info);
    }

    config.preset = 'dynamic';
    (config.presets as Record<string, unknown>).dynamic = dynamicPreset;

    const dynChains = installConfig.dynamicModelPlan.chains;
    config.fallback = {
      enabled: true,
      timeoutMs: 15000,
      chains: dynChains,
    };

    if (installConfig.hasTmux) {
      config.tmux = {
        enabled: true,
        layout: 'main-vertical',
        main_pane_size: 60,
      };
    }

    return config;
  }

  const applyOpenCodeFreeAssignments = (
    presetAgents: Record<string, unknown>,
    hasExternalProviders: boolean,
  ) => {
    if (!installConfig.useOpenCodeFreeModels) return;

    const primaryModel = installConfig.selectedOpenCodePrimaryModel;
    const secondaryModel =
      installConfig.selectedOpenCodeSecondaryModel ?? primaryModel;

    if (!primaryModel || !secondaryModel) return;

    const setAgent = (agentName: string, model: string) => {
      presetAgents[agentName] = createAgentConfig(agentName, { model });
    };

    if (!hasExternalProviders) {
      setAgent('planner', primaryModel);
      setAgent('architect', primaryModel);
      setAgent('engineer', primaryModel);
      setAgent('oracle', primaryModel);
      setAgent('designer', primaryModel);
    }

    setAgent('librarian', secondaryModel);
    setAgent('explorer', secondaryModel);
    presetAgents.quick = createAgentConfig('quick', {
      model: secondaryModel,
      variant: 'low',
    });
    presetAgents.deep = createAgentConfig('deep', { model: primaryModel });
  };

  const applyChutesAssignments = (presetAgents: Record<string, unknown>) => {
    if (!installConfig.hasChutes) return;

    const hasExternalProviders =
      installConfig.hasKimi ||
      installConfig.hasOpenAI ||
      installConfig.hasAnthropic ||
      installConfig.hasCopilot ||
      installConfig.hasZaiPlan ||
      installConfig.hasAntigravity;

    if (hasExternalProviders && activePreset !== 'chutes') return;

    const primaryModel = installConfig.selectedChutesPrimaryModel;
    const secondaryModel =
      installConfig.selectedChutesSecondaryModel ?? primaryModel;

    if (!primaryModel || !secondaryModel) return;

    const setAgent = (agentName: string, model: string) => {
      presetAgents[agentName] = createAgentConfig(agentName, { model });
    };

    setAgent('planner', primaryModel);
    setAgent('architect', primaryModel);
    setAgent('engineer', primaryModel);
    setAgent('oracle', primaryModel);
    setAgent('designer', primaryModel);
    setAgent('librarian', secondaryModel);
    setAgent('explorer', secondaryModel);
    presetAgents.quick = createAgentConfig('quick', {
      model: secondaryModel,
      variant: 'low',
    });
    presetAgents.deep = createAgentConfig('deep', { model: primaryModel });
  };

  const dedupeModels = (models: Array<string | undefined>) => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const model of models) {
      if (!model || seen.has(model)) continue;
      seen.add(model);
      result.push(model);
    }

    return result;
  };

  const getOpenCodeFallbackForAgent = (agentName: AgentName) => {
    if (!installConfig.useOpenCodeFreeModels) return undefined;
    const isSupport =
      agentName === 'explorer' ||
      agentName === 'librarian' ||
      agentName === 'quick';
    if (isSupport) {
      return (
        installConfig.selectedOpenCodeSecondaryModel ??
        installConfig.selectedOpenCodePrimaryModel
      );
    }
    return installConfig.selectedOpenCodePrimaryModel;
  };

  const getChutesFallbackForAgent = (agentName: AgentName) => {
    if (!installConfig.hasChutes) return undefined;
    const isSupport =
      agentName === 'explorer' ||
      agentName === 'librarian' ||
      agentName === 'quick';
    if (isSupport) {
      return (
        installConfig.selectedChutesSecondaryModel ??
        installConfig.selectedChutesPrimaryModel ??
        MODEL_MAPPINGS.chutes[agentName].model
      );
    }
    return (
      installConfig.selectedChutesPrimaryModel ??
      MODEL_MAPPINGS.chutes[agentName].model
    );
  };

  const attachFallbackConfig = (presetAgents: Record<string, unknown>) => {
    const chains: Record<string, string[]> = {};

    for (const agentName of AGENT_NAMES) {
      const currentModel = (
        presetAgents[agentName] as { model?: string } | undefined
      )?.model;

      const chain = dedupeModels([
        currentModel,
        installConfig.hasOpenAI
          ? MODEL_MAPPINGS.openai[agentName].model
          : undefined,
        installConfig.hasAnthropic
          ? MODEL_MAPPINGS.anthropic[agentName].model
          : undefined,
        installConfig.hasCopilot
          ? MODEL_MAPPINGS.copilot[agentName].model
          : undefined,
        installConfig.hasZaiPlan
          ? MODEL_MAPPINGS['zai-plan'][agentName].model
          : undefined,
        installConfig.hasKimi
          ? MODEL_MAPPINGS.kimi[agentName].model
          : undefined,
        installConfig.hasAntigravity
          ? MODEL_MAPPINGS.antigravity[agentName].model
          : undefined,
        getChutesFallbackForAgent(agentName),
        getOpenCodeFallbackForAgent(agentName),
        MODEL_MAPPINGS['zen-free'][agentName].model,
      ]);

      if (chain.length > 0) {
        chains[agentName] = chain;
      }
    }

    config.fallback = {
      enabled: true,
      timeoutMs: 15000,
      chains,
    };
  };

  const buildPreset = (mappingName: keyof typeof MODEL_MAPPINGS) => {
    const mapping = MODEL_MAPPINGS[mappingName];
    const preset: Record<string, unknown> = {};

    for (const [agentName, modelInfo] of Object.entries(mapping)) {
      let activeModelInfo = { ...modelInfo };

      // Hybrid case: Kimi + OpenAI (use OpenAI for Oracle)
      if (
        activePreset === 'kimi' &&
        installConfig.hasOpenAI &&
        agentName === 'oracle'
      ) {
        activeModelInfo = { ...MODEL_MAPPINGS.openai.oracle };
      }

      preset[agentName] = createAgentConfig(agentName, activeModelInfo);
    }

    return preset;
  };

  // Build preset based on type
  if (
    activePreset === 'antigravity-mixed-both' ||
    activePreset === 'antigravity-mixed-kimi' ||
    activePreset === 'antigravity-mixed-openai'
  ) {
    // Use dedicated mixed preset generator
    (config.presets as Record<string, unknown>)[activePreset] =
      generateAntigravityMixedPreset(installConfig);

    applyOpenCodeFreeAssignments(
      (config.presets as Record<string, Record<string, unknown>>)[activePreset],
      installConfig.hasKimi ||
        installConfig.hasOpenAI ||
        installConfig.hasAnthropic ||
        installConfig.hasCopilot ||
        installConfig.hasZaiPlan ||
        installConfig.hasAntigravity ||
        installConfig.hasChutes === true,
    );
    applyChutesAssignments(
      (config.presets as Record<string, Record<string, unknown>>)[activePreset],
    );
    attachFallbackConfig(
      (config.presets as Record<string, Record<string, unknown>>)[activePreset],
    );
  } else {
    // Use standard buildPreset for pure presets
    (config.presets as Record<string, unknown>)[activePreset] =
      buildPreset(activePreset);

    applyOpenCodeFreeAssignments(
      (config.presets as Record<string, Record<string, unknown>>)[activePreset],
      installConfig.hasKimi ||
        installConfig.hasOpenAI ||
        installConfig.hasAnthropic ||
        installConfig.hasCopilot ||
        installConfig.hasZaiPlan ||
        installConfig.hasAntigravity ||
        installConfig.hasChutes === true,
    );
    applyChutesAssignments(
      (config.presets as Record<string, Record<string, unknown>>)[activePreset],
    );
    attachFallbackConfig(
      (config.presets as Record<string, Record<string, unknown>>)[activePreset],
    );
  }

  if (installConfig.hasTmux) {
    config.tmux = {
      enabled: true,
      layout: 'main-vertical',
      main_pane_size: 60,
    };
  }

  return config;
}
