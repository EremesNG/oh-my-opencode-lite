import { describe, expect, test } from 'bun:test';
import type { PluginConfig } from '../config';
import { PRIMARY_NAMES, SUBAGENT_NAMES } from '../config';
import { createAgents, getAgentConfigs, isPrimary, isSubagent } from './index';

describe('agent alias backward compatibility', () => {
  test("applies 'explore' config to 'explorer' agent", () => {
    const config: PluginConfig = {
      agents: {
        explore: { model: 'test/old-explore-model' },
      },
    };
    const agents = createAgents(config);
    const explorer = agents.find((a) => a.name === 'explorer');
    expect(explorer).toBeDefined();
    expect(explorer?.config.model).toBe('test/old-explore-model');
  });

  test("applies 'frontend-ui-ux-engineer' config to 'designer' agent", () => {
    const config: PluginConfig = {
      agents: {
        'frontend-ui-ux-engineer': { model: 'test/old-frontend-model' },
      },
    };
    const agents = createAgents(config);
    const designer = agents.find((a) => a.name === 'designer');
    expect(designer).toBeDefined();
    expect(designer?.config.model).toBe('test/old-frontend-model');
  });

  test('new name takes priority over old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { model: 'old-model' },
        explorer: { model: 'new-model' },
      },
    };
    const agents = createAgents(config);
    const explorer = agents.find((a) => a.name === 'explorer');
    expect(explorer?.config.model).toBe('new-model');
  });

  test('new agent names work directly', () => {
    const config: PluginConfig = {
      agents: {
        explorer: { model: 'direct-explorer' },
        designer: { model: 'direct-designer' },
      },
    };
    const agents = createAgents(config);
    expect(agents.find((a) => a.name === 'explorer')?.config.model).toBe(
      'direct-explorer',
    );
    expect(agents.find((a) => a.name === 'designer')?.config.model).toBe(
      'direct-designer',
    );
  });

  test('temperature override via old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { temperature: 0.5 },
      },
    };
    const agents = createAgents(config);
    const explorer = agents.find((a) => a.name === 'explorer');
    expect(explorer?.config.temperature).toBe(0.5);
  });

  test('variant override via old alias', () => {
    const config: PluginConfig = {
      agents: {
        explore: { variant: 'low' },
      },
    };
    const agents = createAgents(config);
    const explorer = agents.find((a) => a.name === 'explorer');
    expect(explorer?.config.variant).toBe('low');
  });
});

describe('engineer agent (default primary)', () => {
  test('engineer is first in agents array', () => {
    const agents = createAgents();
    // Primaries come first: planner, architect, engineer
    expect(agents[0].name).toBe('planner');
    expect(agents[1].name).toBe('architect');
    expect(agents[2].name).toBe('engineer');
  });

  test('engineer has question permission set to allow', () => {
    const agents = createAgents();
    const engineer = agents.find((a) => a.name === 'engineer');
    expect(engineer?.config.permission).toBeDefined();
    expect((engineer?.config.permission as any).question).toBe('allow');
  });

  test('engineer accepts overrides', () => {
    const config: PluginConfig = {
      agents: {
        engineer: { model: 'custom-engineer-model', temperature: 0.3 },
      },
    };
    const agents = createAgents(config);
    const engineer = agents.find((a) => a.name === 'engineer');
    expect(engineer?.config.model).toBe('custom-engineer-model');
    expect(engineer?.config.temperature).toBe(0.3);
  });

  test('engineer accepts variant override', () => {
    const config: PluginConfig = {
      agents: {
        engineer: { variant: 'high' },
      },
    };
    const agents = createAgents(config);
    const engineer = agents.find((a) => a.name === 'engineer');
    expect(engineer?.config.variant).toBe('high');
  });

  test('engineer stores model array with per-model variants in _modelArray', () => {
    const config: PluginConfig = {
      agents: {
        engineer: {
          model: [
            { id: 'google/gemini-3-pro', variant: 'high' },
            { id: 'github-copilot/claude-3.5-haiku' },
            'openai/gpt-4',
          ],
        },
      },
    };
    const agents = createAgents(config);
    const engineer = agents.find((a) => a.name === 'engineer');
    expect(engineer?._modelArray).toEqual([
      { id: 'google/gemini-3-pro', variant: 'high' },
      { id: 'github-copilot/claude-3.5-haiku' },
      { id: 'openai/gpt-4' },
    ]);
    expect(engineer?.config.model).toBeUndefined();
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
    const agents = createAgents(config);
    const explorer = agents.find((a) => a.name === 'explorer');
    expect(explorer?._modelArray).toEqual([
      { id: 'google/gemini-3-flash', variant: 'low' },
      { id: 'openai/gpt-4o-mini' },
    ]);
    expect(explorer?.config.model).toBeUndefined();
  });

  test('top-level variant preserved alongside per-model variants', () => {
    const config: PluginConfig = {
      agents: {
        engineer: {
          model: [
            { id: 'google/gemini-3-pro', variant: 'high' },
            'openai/gpt-4',
          ],
          variant: 'low',
        },
      },
    };
    const agents = createAgents(config);
    const engineer = agents.find((a) => a.name === 'engineer');
    // top-level variant still set as default
    expect(engineer?.config.variant).toBe('low');
    // per-model variants stored in _modelArray
    expect(engineer?._modelArray?.[0]?.variant).toBe('high');
    expect(engineer?._modelArray?.[1]?.variant).toBeUndefined();
  });
});

describe('skill permissions', () => {
  test('engineer gets cartography skill allowed by default', () => {
    const agents = createAgents();
    const engineer = agents.find((a) => a.name === 'engineer');
    expect(engineer).toBeDefined();
    const skillPerm = (engineer?.config.permission as Record<string, unknown>)
      ?.skill as Record<string, string>;
    // engineer gets wildcard allow (primary agents get all skills)
    expect(skillPerm?.['*']).toBe('allow');
    // CUSTOM_SKILLS loop must also add a named cartography entry for engineer
    expect(skillPerm?.cartography).toBe('allow');
  });

  test('explorer gets cartography skill allowed by default', () => {
    const agents = createAgents();
    const explorer = agents.find((a) => a.name === 'explorer');
    expect(explorer).toBeDefined();
    const skillPerm = (explorer?.config.permission as Record<string, unknown>)
      ?.skill as Record<string, string>;
    expect(skillPerm?.cartography).toBe('allow');
  });

  test('oracle gets requesting-code-review skill allowed by default', () => {
    const agents = createAgents();
    const oracle = agents.find((a) => a.name === 'oracle');
    expect(oracle).toBeDefined();
    const skillPerm = (oracle?.config.permission as Record<string, unknown>)
      ?.skill as Record<string, string>;
    expect(skillPerm?.['requesting-code-review']).toBe('allow');
  });
});

describe('isSubagent type guard', () => {
  test('returns true for valid subagent names', () => {
    expect(isSubagent('explorer')).toBe(true);
    expect(isSubagent('librarian')).toBe(true);
    expect(isSubagent('oracle')).toBe(true);
    expect(isSubagent('designer')).toBe(true);
    expect(isSubagent('junior')).toBe(true);
  });

  test('returns false for primary agents', () => {
    expect(isSubagent('engineer')).toBe(false);
    expect(isSubagent('planner')).toBe(false);
    expect(isSubagent('architect')).toBe(false);
  });

  test('returns false for invalid agent names', () => {
    expect(isSubagent('invalid-agent')).toBe(false);
    expect(isSubagent('')).toBe(false);
    expect(isSubagent('explore')).toBe(false); // old alias, not actual agent name
  });
});

describe('isPrimary type guard', () => {
  test('returns true for primary agent names', () => {
    expect(isPrimary('planner')).toBe(true);
    expect(isPrimary('architect')).toBe(true);
    expect(isPrimary('engineer')).toBe(true);
  });

  test('returns false for subagents', () => {
    expect(isPrimary('explorer')).toBe(false);
    expect(isPrimary('junior')).toBe(false);
  });
});

describe('agent classification', () => {
  test('SUBAGENT_NAMES excludes primary agents', () => {
    expect(SUBAGENT_NAMES).not.toContain('engineer');
    expect(SUBAGENT_NAMES).not.toContain('planner');
    expect(SUBAGENT_NAMES).not.toContain('architect');
    expect(SUBAGENT_NAMES).toContain('explorer');
    expect(SUBAGENT_NAMES).toContain('junior');
  });

  test('getAgentConfigs applies correct classification visibility and mode', () => {
    const configs = getAgentConfigs();

    // Primary agents
    for (const name of PRIMARY_NAMES) {
      expect(configs[name].mode).toBe('primary');
    }

    // Subagents
    for (const name of SUBAGENT_NAMES) {
      expect(configs[name].mode).toBe('subagent');
    }
  });
});

describe('createAgents', () => {
  test('creates all agents without config', () => {
    const agents = createAgents();
    const names = agents.map((a) => a.name);
    expect(names).toContain('planner');
    expect(names).toContain('architect');
    expect(names).toContain('engineer');
    expect(names).toContain('explorer');
    expect(names).toContain('designer');
    expect(names).toContain('oracle');
    expect(names).toContain('librarian');
    expect(names).toContain('junior');
  });

  test('creates exactly 8 agents (3 primaries + 5 subagents)', () => {
    const agents = createAgents();
    expect(agents.length).toBe(8);
  });
});

describe('getAgentConfigs', () => {
  test('returns config record keyed by agent name', () => {
    const configs = getAgentConfigs();
    expect(configs.engineer).toBeDefined();
    expect(configs.explorer).toBeDefined();
    // engineer has no hardcoded default model; resolved at runtime
    expect(configs.explorer.model).toBeDefined();
  });

  test('includes description in SDK config', () => {
    const configs = getAgentConfigs();
    expect(configs.engineer.description).toBeDefined();
    expect(configs.explorer.description).toBeDefined();
  });
});
