import { describe, expect, test } from 'bun:test';
import type { AgentConfig } from '@opencode-ai/sdk/v2';
import type { PluginConfig } from '../config';
import { SUBAGENT_NAMES } from '../config';
import { createAgents, getAgentConfigs, isSubagent } from './index';

type PermissionRecord = Exclude<
  NonNullable<AgentConfig['permission']>,
  'allow' | 'ask' | 'deny'
>;

const EXPECTED_DEFAULT_PERMISSIONS: Record<
  string,
  NonNullable<AgentConfig['permission']>
> = {
  orchestrator: 'allow',
  explorer: {
    read: 'allow',
    edit: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    bash: 'allow',
    codesearch: 'allow',
    lsp: 'allow',
    external_directory: 'allow',
    question: 'allow',
    skill: 'allow',
    todowrite: 'deny',
    task: 'deny',
  },
  librarian: {
    read: 'allow',
    edit: 'deny',
    glob: 'allow',
    grep: 'allow',
    bash: 'allow',
    external_directory: 'allow',
    webfetch: 'allow',
    websearch: 'allow',
    codesearch: 'allow',
    question: 'allow',
    skill: 'allow',
    todowrite: 'deny',
    task: 'deny',
  },
  oracle: {
    read: 'allow',
    edit: 'deny',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    bash: 'allow',
    external_directory: 'allow',
    webfetch: 'allow',
    websearch: 'allow',
    codesearch: 'allow',
    lsp: 'allow',
    question: 'allow',
    skill: 'allow',
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
    question: 'allow',
    codesearch: 'allow',
    lsp: 'allow',
    skill: 'allow',
    todowrite: 'allow',
    external_directory: {
      '~/.config/opencode/skills/**': 'allow',
    },
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
    },
  },
  deep: 'allow',
};

function getAgentByName(
  name: string,
  config?: PluginConfig,
): ReturnType<typeof createAgents>[number] | undefined {
  return createAgents(config).find((agent) => agent.name === name);
}

function getPermission(
  name: string,
  config?: PluginConfig,
): NonNullable<AgentConfig['permission']> {
  const permission = getAgentConfigs(config)[name]?.permission;
  expect(permission).toBeDefined();
  return permission as NonNullable<AgentConfig['permission']>;
}

function getPermissionRecord(
  name: string,
  config?: PluginConfig,
): PermissionRecord {
  const permission = getPermission(name, config);
  expect(typeof permission).toBe('object');
  return permission as PermissionRecord;
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

  test('orchestrator has blanket allow permission', () => {
    expect(getPermission('orchestrator')).toBe('allow');
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

    // Forbid inline repo work (read/search/patch/verify) to keep delegation model intact.
    expect(prompt).toMatch(
      /NEVER\s+request\s+or\s+read\s+the\s+full\s+content\s+of\s+any\s+source\s+file/i,
    );
    expect(prompt).toContain(
      'Delegate all inspection, writing, searching, debugging, and verification.',
    );
    expect(prompt).toContain('Verify through delegation, not inline.');

    // Openspec is explicitly allowed for coordination artifacts.
    expect(prompt).toContain('openspec/');
    expect(prompt).toContain('openspec/changes/{change-name}/tasks.md');

    // SDD awareness / phase order must remain in the orchestrator prompt.
    expect(prompt).toContain('requirements-interview');
    expect(prompt).toMatch(/propose\s*->\s*spec\s*->\s*design\s*->\s*tasks/i);
    expect(prompt).toContain('dispatch sdd-init first');
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

describe('question permission defaults', () => {
  test('all agents set question permission to allow', () => {
    for (const agent of createAgents()) {
      const permission = getPermission(agent.name);

      if (permission === 'allow') {
        expect(permission).toBe('allow');
      } else if (typeof permission === 'object') {
        expect(permission.question).toBe('allow');
      } else {
        throw new Error(
          `Expected object or blanket allow permission for ${agent.name}`,
        );
      }
    }
  });
});

describe('granular permission defaults', () => {
  test('applies the built-in granular permission preset for each agent', () => {
    for (const [agentName, expectedPermission] of Object.entries(
      EXPECTED_DEFAULT_PERMISSIONS,
    )) {
      expect(getPermission(agentName)).toEqual(expectedPermission);
    }
  });

  test('explicit permission overrides take precedence over built-in presets', () => {
    const config = {
      agents: {
        explorer: {
          permission: {
            read: 'allow',
            edit: 'allow',
            question: 'deny',
          },
        },
      },
    } as unknown as PluginConfig;

    expect(getAgentConfigs(config).explorer.permission).toEqual({
      read: 'allow',
      edit: 'allow',
      question: 'deny',
    });
  });

  test('read-only discovery agents allow external_directory access', () => {
    expect(getPermissionRecord('explorer').external_directory).toBe('allow');
    expect(getPermissionRecord('librarian').external_directory).toBe('allow');
    expect(getPermissionRecord('oracle').external_directory).toBe('allow');
  });

  test('deep has blanket allow permission', () => {
    expect(getPermission('deep')).toBe('allow');
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

  test('getAgentConfigs returns exactly the built-in seven-agent roster', () => {
    expect(Object.keys(getAgentConfigs()).sort()).toEqual(
      ['orchestrator', ...SUBAGENT_NAMES].sort(),
    );
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

  test('does not include per-agent MCP assignments', () => {
    const configs = getAgentConfigs();
    expect('mcps' in configs.orchestrator).toBe(false);
    expect('mcps' in configs.librarian).toBe(false);
    expect('mcps' in configs.quick).toBe(false);
    expect('mcps' in configs.deep).toBe(false);
  });
});

describe('semantic color values', () => {
  test('all agents have semantic color values', () => {
    const agents = createAgents();
    const colorMap: Record<string, string> = {
      orchestrator: 'primary',
      explorer: 'info',
      librarian: 'info',
      oracle: 'warning',
      designer: 'accent',
      quick: 'success',
      deep: 'secondary',
    };

    for (const agent of agents) {
      expect(agent.config.color).toBe(colorMap[agent.name]);
    }
  });

  test('color values are valid semantic colors', () => {
    const validColors = [
      'primary',
      'secondary',
      'accent',
      'success',
      'warning',
      'error',
      'info',
    ];
    const agents = createAgents();

    for (const agent of agents) {
      const { color } = agent.config;
      expect(color).toBeDefined();
      if (!color) {
        throw new Error(`Expected color for agent ${agent.name}`);
      }
      expect(validColors).toContain(color);
    }
  });
});

describe('steps field for bounded execution', () => {
  test('write-capable agents have steps field', () => {
    const designer = getAgentByName('designer');
    const quick = getAgentByName('quick');
    const deep = getAgentByName('deep');

    expect(designer?.config.steps).toBeDefined();
    expect(quick?.config.steps).toBeDefined();
    expect(deep?.config.steps).toBeDefined();
  });

  test('orchestrator has steps field', () => {
    const orchestrator = getAgentByName('orchestrator');
    expect(orchestrator?.config.steps).toBeDefined();
  });

  test('steps values are reasonable bounds', () => {
    const agents = createAgents();
    const stepsMap: Record<string, number> = {
      orchestrator: 100,
      designer: 50,
      quick: 30,
      deep: 80,
    };

    for (const agent of agents) {
      if (agent.name in stepsMap) {
        expect(agent.config.steps).toBe(stepsMap[agent.name]);
      }
    }
  });
});

describe('hidden field design decision', () => {
  test('no agents are hidden from @ autocomplete', () => {
    const agents = createAgents();

    for (const agent of agents) {
      expect(agent.config.hidden).toBeUndefined();
    }
  });
});
