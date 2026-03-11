import type { AgentConfig as SDKAgentConfig } from '@opencode-ai/sdk/v2';
import { getSkillPermissionsForAgent } from '../cli/skills';
import {
  type AgentOverrideConfig,
  DEFAULT_MODELS,
  getAgentOverride,
  loadAgentPrompt,
  type PluginConfig,
  PRIMARY_NAMES,
  SUBAGENT_NAMES,
} from '../config';
import { getAgentMcpList } from '../config/agent-mcps';

import { createArchitectAgent } from './architect';
import { createDesignerAgent } from './designer';
import { createEngineerAgent } from './engineer';
import { createExplorerAgent } from './explorer';
import { createDeepAgent, createQuickAgent } from './junior';
import { createLibrarianAgent } from './librarian';
import { createOracleAgent } from './oracle';
import { createPlannerAgent } from './planner';
import type { AgentDefinition } from './types';

export type { AgentDefinition } from './types';

type SubagentFactory = (
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
) => AgentDefinition;

type PrimaryFactory = (
  model?: string | Array<string | { id: string; variant?: string }>,
  customPrompt?: string,
  customAppendPrompt?: string,
) => AgentDefinition;

// Agent Configuration Helpers

/**
 * Apply user-provided overrides to an agent's configuration.
 * Supports overriding model (string or priority array), variant, and temperature.
 * When model is an array, stores it as _modelArray for runtime fallback resolution
 * and clears config.model so OpenCode does not pre-resolve a stale value.
 */
function applyOverrides(
  agent: AgentDefinition,
  override: AgentOverrideConfig,
): void {
  if (override.model) {
    if (Array.isArray(override.model)) {
      agent._modelArray = override.model.map((m) =>
        typeof m === 'string' ? { id: m } : m,
      );
      agent.config.model = undefined; // cleared; runtime hook resolves from _modelArray
    } else {
      agent.config.model = override.model;
    }
  }
  if (override.variant) agent.config.variant = override.variant;
  if (override.temperature !== undefined)
    agent.config.temperature = override.temperature;
}

/**
 * Apply default permissions to an agent.
 * Sets 'question' permission to 'allow' and includes skill permission presets.
 * If configuredSkills is provided, it honors that list instead of defaults.
 */
function applyDefaultPermissions(
  agent: AgentDefinition,
  configuredSkills?: string[],
): void {
  const existing = (agent.config.permission ?? {}) as Record<
    string,
    'ask' | 'allow' | 'deny' | Record<string, 'ask' | 'allow' | 'deny'>
  >;

  // Get skill-specific permissions for this agent
  const skillPermissions = getSkillPermissionsForAgent(
    agent.name,
    configuredSkills,
  );

  agent.config.permission = {
    ...existing,
    question: 'allow',
    // Apply skill permissions as nested object under 'skill' key
    skill: {
      ...(typeof existing.skill === 'object' ? existing.skill : {}),
      ...skillPermissions,
    },
  } as SDKAgentConfig['permission'];
}

// Agent Classification

export type SubagentName = (typeof SUBAGENT_NAMES)[number];
export type PrimaryName = (typeof PRIMARY_NAMES)[number];

export function isSubagent(name: string): name is SubagentName {
  return (SUBAGENT_NAMES as readonly string[]).includes(name);
}

export function isPrimary(name: string): name is PrimaryName {
  return (PRIMARY_NAMES as readonly string[]).includes(name);
}

// Agent Factories

const SUBAGENT_FACTORIES: Record<SubagentName, SubagentFactory> = {
  explorer: createExplorerAgent,
  librarian: createLibrarianAgent,
  oracle: createOracleAgent,
  designer: createDesignerAgent,
  quick: createQuickAgent,
  deep: createDeepAgent,
};

const PRIMARY_FACTORIES: Record<PrimaryName, PrimaryFactory> = {
  planner: createPlannerAgent,
  architect: createArchitectAgent,
  engineer: createEngineerAgent,
};

// Public API

/**
 * Create all agent definitions with optional configuration overrides.
 * Instantiates primaries and all subagents, applying user config and defaults.
 *
 * @param config - Optional plugin configuration with agent overrides
 * @returns Array of agent definitions (primaries first, then subagents)
 */
export function createAgents(config?: PluginConfig): AgentDefinition[] {
  // 1. Gather all sub-agent definitions with custom prompts
  const subAgents = (
    Object.entries(SUBAGENT_FACTORIES) as [SubagentName, SubagentFactory][]
  ).map(([name, factory]) => {
    const customPrompts = loadAgentPrompt(name, config?.preset);
    // Subagents always have a defined default model; cast is safe here
    return factory(
      DEFAULT_MODELS[name] as string,
      customPrompts.prompt,
      customPrompts.appendPrompt,
    );
  });

  // 2. Apply overrides and default permissions to each subagent
  for (const agent of subAgents) {
    const override = getAgentOverride(config, agent.name);
    if (override) {
      applyOverrides(agent, override);
    }
    applyDefaultPermissions(agent, override?.skills);
  }

  // 3. Create primary agents
  const primaries = (
    Object.entries(PRIMARY_FACTORIES) as [PrimaryName, PrimaryFactory][]
  ).map(([name, factory]) => {
    const override = getAgentOverride(config, name);
    const model = override?.model ?? DEFAULT_MODELS[name];
    const customPrompts = loadAgentPrompt(name, config?.preset);
    const agent = factory(
      model,
      customPrompts.prompt,
      customPrompts.appendPrompt,
    );
    applyDefaultPermissions(agent, override?.skills);
    if (override) {
      applyOverrides(agent, override);
    }
    return agent;
  });

  return [...primaries, ...subAgents];
}

/**
 * Get agent configurations formatted for the OpenCode SDK.
 * Converts agent definitions to SDK config format and applies classification metadata.
 *
 * @param config - Optional plugin configuration with agent overrides
 * @returns Record mapping agent names to their SDK configurations
 */
export function getAgentConfigs(
  config?: PluginConfig,
): Record<string, SDKAgentConfig> {
  const agents = createAgents(config);
  return Object.fromEntries(
    agents.map((a) => {
      const sdkConfig: SDKAgentConfig & { mcps?: string[] } = {
        ...a.config,
        description: a.description,
        mcps: getAgentMcpList(a.name, config),
      };

      // Apply classification-based visibility and mode
      if (isSubagent(a.name)) {
        sdkConfig.mode = 'subagent';
      } else if (isPrimary(a.name)) {
        sdkConfig.mode = 'primary';
      }

      return [a.name, sdkConfig];
    }),
  );
}
