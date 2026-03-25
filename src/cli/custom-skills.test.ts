import { describe, expect, test } from 'bun:test';
import { CUSTOM_SKILLS } from './custom-skills';

describe('CUSTOM_SKILLS', () => {
  test('registers the executing-plans skill for orchestrator use', () => {
    expect(CUSTOM_SKILLS).toContainEqual({
      name: 'executing-plans',
      description:
        'Execute SDD task lists with real-time progress tracking, sub-agent dispatch, and verification checkpoints',
      allowedAgents: ['orchestrator'],
      sourcePath: 'src/skills/executing-plans',
    });
  });
});
