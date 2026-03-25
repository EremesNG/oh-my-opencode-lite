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

function applyQuestionPermission(agent: AgentDefinition): void {
  agent.config.permission = {
    ...((agent.config.permission ?? {}) as Record<string, unknown>),
    question: 'allow',
  } as SDKAgentConfig['permission'];
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
    applyQuestionPermission(agent);
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
  applyQuestionPermission(orchestrator);

  return [orchestrator, ...allSubAgents];
}

export function getAgentConfigs(
  config?: PluginConfig,
): Record<string, SDKAgentConfig> {
  const agents = createAgents(config);

  return Object.fromEntries(
    agents.map((agent) => {
      const sdkConfig: SDKAgentConfig = {
        ...agent.config,
        description: agent.description,
      };

      if (isSubagent(agent.name)) {
        sdkConfig.mode = 'subagent';
      } else if (agent.name === 'orchestrator') {
        sdkConfig.mode = 'primary';
      }

      return [agent.name, sdkConfig];
    }),
  );
}
