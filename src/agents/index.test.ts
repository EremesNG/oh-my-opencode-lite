import { describe, expect, test } from 'bun:test';
import type { PluginConfig } from '../config';
import { SUBAGENT_NAMES } from '../config';
import { createAgents, getAgentConfigs, isSubagent } from './index';

type PermissionAction = 'allow' | 'ask' | 'deny';
type PermissionRecord = Record<
  string,
  PermissionAction | Record<string, PermissionAction>
>;

function getAgentByName(
  name: string,
  config?: PluginConfig,
): ReturnType<typeof createAgents>[number] | undefined {
  return createAgents(config).find((agent) => agent.name === name);
}

function getPermissionRecord(
  name: string,
  config?: PluginConfig,
): PermissionRecord {
  const permission = getAgentByName(name, config)?.config.permission;
  expect(permission).toBeDefined();
  return permission as PermissionRecord;
}

function getSkillPermissionRecord(
  name: string,
  config?: PluginConfig,
): Record<string, PermissionAction> {
  const skillPermission = getPermissionRecord(name, config).skill;
  expect(skillPermission).toBeDefined();
  expect(typeof skillPermission).toBe('object');
  return skillPermission as Record<string, PermissionAction>;
}

describe('agent alias backward compatibility', () => {
  test("applies 'explore' config to 'explorer' agent", () => {
    const config: PluginConfig = {
      agents: {
        explore: { model: 'test/old-explore-model' },
      },
    };

    expect(getAgentByName('explorer', config)?.config.model).toBe(
      'test/old-explore-model',
    );
  });

  test("applies 'frontend-ui-ux-engineer' config to 'designer' agent", () => {
    const config: PluginConfig = {
      agents: {
        'frontend-ui-ux-engineer': { model: 'test/old-frontend-model' },
      },
    };

    expect(getAgentByName('designer', config)?.config.model).toBe(
      'test/old-frontend-model',
    );
  });

  test('new name takes priority over old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { model: 'old-model' },
        explorer: { model: 'new-model' },
      },
    };

    expect(getAgentByName('explorer', config)?.config.model).toBe('new-model');
  });

  test('temperature override via old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { temperature: 0.5 },
      },
    };

    expect(getAgentByName('explorer', config)?.config.temperature).toBe(0.5);
  });

  test('variant override via old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { variant: 'low' },
      },
    };

    expect(getAgentByName('explorer', config)?.config.variant).toBe('low');
  });
});

describe('orchestrator agent', () => {
  test('orchestrator is first in agents array', () => {
    expect(createAgents()[0]?.name).toBe('orchestrator');
  });

  test('orchestrator has question permission set to allow', () => {
    expect(getPermissionRecord('orchestrator').question).toBe('allow');
  });

  test('orchestrator accepts overrides', () => {
    const config: PluginConfig = {
      agents: {
        orchestrator: { model: 'custom-orchestrator-model', temperature: 0.3 },
      },
    };

    expect(getAgentByName('orchestrator', config)?.config.model).toBe(
      'custom-orchestrator-model',
    );
    expect(getAgentByName('orchestrator', config)?.config.temperature).toBe(
      0.3,
    );
  });

  test('orchestrator accepts variant override', () => {
    const config: PluginConfig = {
      agents: {
        orchestrator: { variant: 'high' },
      },
    };

    expect(getAgentByName('orchestrator', config)?.config.variant).toBe('high');
  });

  test('orchestrator stores model array with per-model variants in _modelArray', () => {
    const config: PluginConfig = {
      agents: {
        orchestrator: {
          model: [
            { id: 'google/gemini-3-pro', variant: 'high' },
            { id: 'github-copilot/claude-3.5-haiku' },
            'openai/gpt-4',
          ],
        },
      },
    };

    const orchestrator = getAgentByName('orchestrator', config);
    expect(orchestrator?._modelArray).toEqual([
      { id: 'google/gemini-3-pro', variant: 'high' },
      { id: 'github-copilot/claude-3.5-haiku' },
      { id: 'openai/gpt-4' },
    ]);
    expect(orchestrator?.config.model).toBeUndefined();
  });

  test('orchestrator prompt is delegate-first and forbids inline repo work', () => {
    const prompt = getAgentByName('orchestrator')?.config.prompt;
    expect(prompt).toContain('delegate-first');
    expect(prompt).toContain('must not read source files inline');
    expect(prompt).toContain('must not write or patch code inline');
  });
});

describe('per-model variant in array config', () => {
  test('subagent stores model array with per-model variants', () => {
    const config: PluginConfig = {
      agents: {
        explorer: {
          model: [
            { id: 'google/gemini-3-flash', variant: 'low' },
            'openai/gpt-4o-mini',
          ],
        },
      },
    };

    const explorer = getAgentByName('explorer', config);
    expect(explorer?._modelArray).toEqual([
      { id: 'google/gemini-3-flash', variant: 'low' },
      { id: 'openai/gpt-4o-mini' },
    ]);
    expect(explorer?.config.model).toBeUndefined();
  });

  test('top-level variant preserved alongside per-model variants', () => {
    const config: PluginConfig = {
      agents: {
        orchestrator: {
          model: [
            { id: 'google/gemini-3-pro', variant: 'high' },
            'openai/gpt-4',
          ],
          variant: 'low',
        },
      },
    };

    const orchestrator = getAgentByName('orchestrator', config);
    expect(orchestrator?.config.variant).toBe('low');
    expect(orchestrator?._modelArray?.[0]?.variant).toBe('high');
    expect(orchestrator?._modelArray?.[1]?.variant).toBeUndefined();
  });
});

describe('skill permissions', () => {
  test('orchestrator gets wildcard and cartography skills allowed by default', () => {
    const skillPerm = getSkillPermissionRecord('orchestrator');
    expect(skillPerm['*']).toBe('allow');
    expect(skillPerm.cartography).toBe('allow');
  });

  test('explorer gets cartography skill allowed by default', () => {
    expect(getSkillPermissionRecord('explorer').cartography).toBe('allow');
  });

  test('oracle gets requesting-code-review skill allowed by default', () => {
    expect(getSkillPermissionRecord('oracle')['requesting-code-review']).toBe(
      'allow',
    );
  });

  test('designer gets agent-browser skill allowed by default', () => {
    expect(getSkillPermissionRecord('designer')['agent-browser']).toBe('allow');
  });
});

describe('tool restriction defaults', () => {
  test('orchestrator can delegate but cannot use workspace tools inline', () => {
    const permission = getPermissionRecord('orchestrator');
    expect(permission.task).toBe('allow');
    expect(permission.background_task).toBe('allow');
    expect(permission.read).toBe('deny');
    expect(permission.write).toBe('deny');
    expect(permission.edit).toBe('deny');
    expect(permission.bash).toBe('deny');
    expect(permission.ast_grep_search).toBe('deny');
    expect(permission.lsp_diagnostics).toBe('deny');
  });

  test('explorer is background-only and read-only by default', () => {
    const permission = getPermissionRecord('explorer');
    expect(permission.task).toBe('deny');
    expect(permission.background_task).toBe('deny');
    expect(permission.read).toBe('allow');
    expect(permission.glob).toBe('allow');
    expect(permission.grep).toBe('allow');
    expect(permission.ast_grep_search).toBe('allow');
    expect(permission.write).toBe('deny');
    expect(permission.edit).toBe('deny');
  });

  test('oracle is synchronous and read-only by default', () => {
    const permission = getPermissionRecord('oracle');
    expect(permission.task).toBe('deny');
    expect(permission.background_task).toBe('deny');
    expect(permission.read).toBe('allow');
    expect(permission.lsp_goto_definition).toBe('allow');
    expect(permission.write).toBe('deny');
    expect(permission.edit).toBe('deny');
  });

  test('designer, quick, and deep are write-capable leaf agents by default', () => {
    for (const agentName of ['designer', 'quick', 'deep']) {
      const permission = getPermissionRecord(agentName);
      expect(permission.task).toBe('deny');
      expect(permission.background_task).toBe('deny');
      expect(permission.read).toBe('allow');
      expect(permission.write).toBe('allow');
      expect(permission.edit).toBe('allow');
      expect(permission.bash).toBe('allow');
    }
  });
});

describe('prompt role markers', () => {
  test('explorer prompt states background-only mode', () => {
    expect(getAgentByName('explorer')?.config.prompt).toContain(
      'background-only',
    );
  });

  test('librarian prompt states background-only mode', () => {
    expect(getAgentByName('librarian')?.config.prompt).toContain(
      'background-only',
    );
  });

  test('oracle prompt states read-only mode', () => {
    expect(getAgentByName('oracle')?.config.prompt).toContain('read-only');
  });

  test('designer, quick, and deep prompts state write-capable mode', () => {
    expect(getAgentByName('designer')?.config.prompt).toContain(
      'write-capable',
    );
    expect(getAgentByName('quick')?.config.prompt).toContain('write-capable');
    expect(getAgentByName('deep')?.config.prompt).toContain('write-capable');
  });
});

describe('isSubagent type guard', () => {
  test('returns true for valid subagent names', () => {
    expect(isSubagent('explorer')).toBe(true);
    expect(isSubagent('librarian')).toBe(true);
    expect(isSubagent('oracle')).toBe(true);
    expect(isSubagent('designer')).toBe(true);
    expect(isSubagent('quick')).toBe(true);
    expect(isSubagent('deep')).toBe(true);
  });

  test('returns false for orchestrator and invalid names', () => {
    expect(isSubagent('orchestrator')).toBe(false);
    expect(isSubagent('invalid-agent')).toBe(false);
    expect(isSubagent('')).toBe(false);
    expect(isSubagent('explore')).toBe(false);
  });
});

describe('agent classification', () => {
  test('SUBAGENT_NAMES excludes orchestrator', () => {
    expect(SUBAGENT_NAMES).not.toContain('orchestrator');
    expect(SUBAGENT_NAMES).toContain('quick');
    expect(SUBAGENT_NAMES).toContain('deep');
  });

  test('getAgentConfigs applies correct classification mode', () => {
    const configs = getAgentConfigs();

    expect(configs.orchestrator.mode).toBe('primary');

    for (const name of SUBAGENT_NAMES) {
      expect(configs[name].mode).toBe('subagent');
    }
  });
});

describe('createAgents', () => {
  test('creates the seven-agent roster', () => {
    const names = createAgents().map((agent) => agent.name);

    expect(names).toContain('orchestrator');
    expect(names).toContain('explorer');
    expect(names).toContain('librarian');
    expect(names).toContain('oracle');
    expect(names).toContain('designer');
    expect(names).toContain('quick');
    expect(names).toContain('deep');
    expect(names).not.toContain('fixer');
  });

  test('creates exactly 7 agents (1 primary + 6 subagents)', () => {
    expect(createAgents()).toHaveLength(7);
  });

  test('rejects legacy fixer requests as unsupported', () => {
    expect(getAgentByName('fixer')).toBeUndefined();
    expect(isSubagent('fixer')).toBe(false);
  });
});

describe('getAgentConfigs', () => {
  test('returns config record keyed by agent name', () => {
    const configs = getAgentConfigs();
    expect(configs.orchestrator).toBeDefined();
    expect(configs.explorer).toBeDefined();
    expect(configs.quick).toBeDefined();
    expect(configs.deep).toBeDefined();
    expect(configs.explorer.model).toBeDefined();
  });

  test('includes description in SDK config', () => {
    const configs = getAgentConfigs();
    expect(configs.orchestrator.description).toBeDefined();
    expect(configs.explorer.description).toBeDefined();
    expect(configs.quick.description).toBeDefined();
    expect(configs.deep.description).toBeDefined();
  });

  test('uses updated default MCP assignments', () => {
    const configs = getAgentConfigs();
    expect(configs.orchestrator.mcps).toEqual(['thoth_mem']);
    expect(configs.librarian.mcps).toEqual([
      'websearch',
      'context7',
      'grep_app',
    ]);
    expect(configs.quick.mcps).toEqual([]);
    expect(configs.deep.mcps).toEqual([]);
  });
});
