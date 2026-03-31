import type { AgentConfig as SDKAgentConfig } from '@opencode-ai/sdk/v2';
import {
  type AgentOverrideConfig,
  DEFAULT_MODELS,
  getAgentOverride,
  loadAgentPrompt,
  type PluginConfig,
  SUBAGENT_NAMES,
} from '../config';

import { createDeepAgent } from './deep';
import { createDesignerAgent } from './designer';
import { createExplorerAgent } from './explorer';
import { createLibrarianAgent } from './librarian';
import { createOracleAgent } from './oracle';
import { type AgentDefinition, createOrchestratorAgent } from './orchestrator';
import { createQuickAgent } from './quick';

export type { AgentDefinition } from './orchestrator';

type AgentFactory = (
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
) => AgentDefinition;

type PermissionConfigObject = Exclude<
  NonNullable<SDKAgentConfig['permission']>,
  'allow' | 'ask' | 'deny'
>;

type BuiltinPermissionPreset = NonNullable<SDKAgentConfig['permission']>;

type BuiltinPermissionPresetName =
  | 'orchestrator'
  | 'explorer'
  | 'librarian'
  | 'oracle'
  | 'designer'
  | 'quick'
  | 'deep';

type AgentOverrideWithPermission = AgentOverrideConfig & {
  permission?: SDKAgentConfig['permission'];
};

const BUILTIN_PERMISSION_PRESETS = {
  orchestrator: 'allow',
  explorer: {
    read: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    codesearch: 'allow',
    lsp: 'allow',
    external_directory: 'allow',
    bash: 'allow',
    question: 'allow',
    skill: 'allow',
    edit: 'deny',
    todowrite: 'deny',
    task: 'deny',
  },
  librarian: {
    read: 'allow',
    glob: 'allow',
    grep: 'allow',
    external_directory: 'allow',
    bash: 'allow',
    webfetch: 'allow',
    websearch: 'allow',
    codesearch: 'allow',
    question: 'allow',
    skill: 'allow',
    edit: 'deny',
    todowrite: 'deny',
    task: 'deny',
  },
  oracle: {
    read: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    lsp: 'allow',
    codesearch: 'allow',
    webfetch: 'allow',
    websearch: 'allow',
    external_directory: 'allow',
    bash: 'allow',
    question: 'allow',
    skill: 'allow',
    edit: 'deny',
    todowrite: 'deny',
    task: 'deny',
  },
  designer: {
    read: 'allow',
    edit: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    bash: 'allow',
    codesearch: 'allow',
    lsp: 'allow',
    skill: 'allow',
    question: 'allow',
    todowrite: 'allow',
    external_directory: {
      '~/.config/opencode/skills/**': 'allow',
    }
  },
  quick: {
    read: 'allow',
    edit: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    bash: 'allow',
    question: 'allow',
    codesearch: 'allow',
    lsp: 'allow',
    todowrite: 'allow',
    external_directory: {
      '~/.config/opencode/skills/**': 'allow',
    }
  },
  deep: 'allow',
} as const satisfies Record<
  BuiltinPermissionPresetName,
  BuiltinPermissionPreset
>;

function normalizeModelArray(
  model: Array<string | { id: string; variant?: string }>,
): Array<{ id: string; variant?: string }> {
  return model.map((entry) =>
    typeof entry === 'string' ? { id: entry } : entry,
  );
}

function applyOverrides(
  agent: AgentDefinition,
  override: AgentOverrideConfig,
): void {
  if (override.model) {
    if (Array.isArray(override.model)) {
      agent._modelArray = normalizeModelArray(override.model);
      agent.config.model = undefined;
    } else {
      agent.config.model = override.model;
    }
  }

  if (override.variant) {
    agent.config.variant = override.variant;
  }

  if (override.temperature !== undefined) {
    agent.config.temperature = override.temperature;
  }
}

function clonePermissionConfig(
  permission: BuiltinPermissionPreset,
): BuiltinPermissionPreset {
  if (typeof permission === 'string') {
    return permission;
  }

  return Object.fromEntries(
    Object.entries(permission).map(([key, value]) => [
      key,
      value && typeof value === 'object' && !Array.isArray(value)
        ? { ...value }
        : value,
    ]),
  ) as PermissionConfigObject;
}

function getBuiltinPermissionPreset(
  name: BuiltinPermissionPresetName,
): BuiltinPermissionPreset {
  return clonePermissionConfig(BUILTIN_PERMISSION_PRESETS[name]);
}

function getExplicitPermissionOverride(
  override?: AgentOverrideConfig,
): SDKAgentConfig['permission'] | undefined {
  return (override as AgentOverrideWithPermission | undefined)?.permission;
}

export type SubagentName = (typeof SUBAGENT_NAMES)[number];

export function isSubagent(name: string): name is SubagentName {
  return (SUBAGENT_NAMES as readonly string[]).includes(name);
}

const SUBAGENT_FACTORIES: Record<SubagentName, AgentFactory> = {
  explorer: createExplorerAgent,
  librarian: createLibrarianAgent,
  oracle: createOracleAgent,
  designer: createDesignerAgent,
  quick: createQuickAgent,
  deep: createDeepAgent,
};

export function createAgents(config?: PluginConfig): AgentDefinition[] {
  const protoSubAgents = (
    Object.entries(SUBAGENT_FACTORIES) as [SubagentName, AgentFactory][]
  ).map(([name, factory]) => {
    const prompts = loadAgentPrompt(name, config?.preset);
    return factory(
      DEFAULT_MODELS[name] as string,
      prompts.prompt,
      prompts.appendPrompt,
    );
  });

  const allSubAgents = protoSubAgents.map((agent) => {
    const override = getAgentOverride(config, agent.name);
    if (override) {
      applyOverrides(agent, override);
    }
    return agent;
  });

  const orchestratorOverride = getAgentOverride(config, 'orchestrator');
  const orchestratorPrompts = loadAgentPrompt('orchestrator', config?.preset);
  const orchestrator = createOrchestratorAgent(
    orchestratorOverride?.model ?? DEFAULT_MODELS.orchestrator,
    orchestratorPrompts.prompt,
    orchestratorPrompts.appendPrompt,
  );

  if (orchestratorOverride) {
    applyOverrides(orchestrator, orchestratorOverride);
  }

  return [orchestrator, ...allSubAgents];
}

export function getAgentConfigs(
  config?: PluginConfig,
): Record<string, SDKAgentConfig> {
  const agents = createAgents(config);

  return Object.fromEntries(
    agents.map((agent) => {
      const override = getAgentOverride(config, agent.name);
      const sdkConfig: SDKAgentConfig = {
        ...agent.config,
        description: agent.description,
      };

      const builtinPermission = isSubagent(agent.name)
        ? getBuiltinPermissionPreset(agent.name as BuiltinPermissionPresetName)
        : agent.name === 'orchestrator'
          ? getBuiltinPermissionPreset('orchestrator')
          : undefined;
      const explicitPermissionOverride =
        getExplicitPermissionOverride(override);

      sdkConfig.permission =
        explicitPermissionOverride ??
        agent.config.permission ??
        builtinPermission;

      if (isSubagent(agent.name)) {
        sdkConfig.mode = 'subagent';
      } else if (agent.name === 'orchestrator') {
        sdkConfig.mode = 'primary';
      }

      return [agent.name, sdkConfig];
    }),
  );
}
