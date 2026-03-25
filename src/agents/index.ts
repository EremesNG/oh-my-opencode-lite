import type { AgentConfig as SDKAgentConfig } from '@opencode-ai/sdk/v2';
import { getSkillPermissionsForAgent } from '../cli/skills';
import {
  type AgentOverrideConfig,
  DEFAULT_MODELS,
  getAgentOverride,
  loadAgentPrompt,
  type PluginConfig,
  SUBAGENT_NAMES,
} from '../config';
import { getAgentMcpList } from '../config/agent-mcps';

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

type PermissionAction = 'ask' | 'allow' | 'deny';
type SkillPermissionMap = Record<string, PermissionAction>;
type PermissionMap = Record<
  string,
  PermissionAction | SkillPermissionMap | undefined
>;

const ORCHESTRATOR_TOOL_PERMISSIONS: PermissionMap = {
  task: 'allow',
  background_task: 'allow',
  read: 'deny',
  write: 'deny',
  edit: 'deny',
  bash: 'deny',
  glob: 'deny',
  grep: 'deny',
  apply_patch: 'deny',
  ast_grep_search: 'deny',
  ast_grep_replace: 'deny',
  lsp_goto_definition: 'deny',
  lsp_find_references: 'deny',
  lsp_diagnostics: 'deny',
  lsp_rename: 'deny',
};

const EXPLORER_TOOL_PERMISSIONS: PermissionMap = {
  task: 'deny',
  background_task: 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  ast_grep_search: 'allow',
  ast_grep_replace: 'deny',
  lsp_goto_definition: 'allow',
  lsp_find_references: 'allow',
  lsp_diagnostics: 'allow',
  lsp_rename: 'deny',
  write: 'deny',
  edit: 'deny',
  bash: 'deny',
  apply_patch: 'deny',
};

const LIBRARIAN_TOOL_PERMISSIONS: PermissionMap = {
  task: 'deny',
  background_task: 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  write: 'deny',
  edit: 'deny',
  bash: 'deny',
  apply_patch: 'deny',
  ast_grep_search: 'deny',
  ast_grep_replace: 'deny',
  lsp_goto_definition: 'deny',
  lsp_find_references: 'deny',
  lsp_diagnostics: 'deny',
  lsp_rename: 'deny',
};

const ORACLE_TOOL_PERMISSIONS: PermissionMap = {
  task: 'deny',
  background_task: 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  ast_grep_search: 'allow',
  ast_grep_replace: 'deny',
  lsp_goto_definition: 'allow',
  lsp_find_references: 'allow',
  lsp_diagnostics: 'allow',
  lsp_rename: 'deny',
  write: 'deny',
  edit: 'deny',
  bash: 'deny',
  apply_patch: 'deny',
};

const WRITE_AGENT_TOOL_PERMISSIONS: PermissionMap = {
  task: 'deny',
  background_task: 'deny',
  read: 'allow',
  glob: 'allow',
  grep: 'allow',
  write: 'allow',
  edit: 'allow',
  bash: 'allow',
  apply_patch: 'allow',
  ast_grep_search: 'allow',
  ast_grep_replace: 'allow',
  lsp_goto_definition: 'allow',
  lsp_find_references: 'allow',
  lsp_diagnostics: 'allow',
  lsp_rename: 'allow',
};

const DEFAULT_TOOL_PERMISSIONS: Record<string, PermissionMap> = {
  orchestrator: ORCHESTRATOR_TOOL_PERMISSIONS,
  explorer: EXPLORER_TOOL_PERMISSIONS,
  librarian: LIBRARIAN_TOOL_PERMISSIONS,
  oracle: ORACLE_TOOL_PERMISSIONS,
  designer: WRITE_AGENT_TOOL_PERMISSIONS,
  quick: WRITE_AGENT_TOOL_PERMISSIONS,
  deep: WRITE_AGENT_TOOL_PERMISSIONS,
};

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

function applyDefaultPermissions(
  agent: AgentDefinition,
  configuredSkills?: string[],
): void {
  const existing = (agent.config.permission ?? {}) as PermissionMap;
  const skillPermissions = getSkillPermissionsForAgent(
    agent.name,
    configuredSkills,
  );
  const toolPermissions = DEFAULT_TOOL_PERMISSIONS[agent.name] ?? {};
  const existingSkillPermissions =
    typeof existing.skill === 'object' && existing.skill
      ? (existing.skill as SkillPermissionMap)
      : {};

  agent.config.permission = {
    ...toolPermissions,
    ...existing,
    question: 'allow',
    skill: {
      ...existingSkillPermissions,
      ...skillPermissions,
    },
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
    applyDefaultPermissions(agent, override?.skills);
    return agent;
  });

  const orchestratorOverride = getAgentOverride(config, 'orchestrator');
  const orchestratorPrompts = loadAgentPrompt('orchestrator', config?.preset);
  const orchestrator = createOrchestratorAgent(
    orchestratorOverride?.model ?? DEFAULT_MODELS.orchestrator,
    orchestratorPrompts.prompt,
    orchestratorPrompts.appendPrompt,
  );

  applyDefaultPermissions(orchestrator, orchestratorOverride?.skills);
  if (orchestratorOverride) {
    applyOverrides(orchestrator, orchestratorOverride);
  }

  return [orchestrator, ...allSubAgents];
}

export function getAgentConfigs(
  config?: PluginConfig,
): Record<string, SDKAgentConfig & { mcps?: string[] }> {
  const agents = createAgents(config);

  return Object.fromEntries(
    agents.map((agent) => {
      const sdkConfig: SDKAgentConfig & { mcps?: string[] } = {
        ...agent.config,
        description: agent.description,
        mcps: getAgentMcpList(agent.name, config),
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
