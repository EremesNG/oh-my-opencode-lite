import { describe, expect, it } from 'bun:test';
import { CUSTOM_SKILLS } from './custom-skills';
import { getSkillPermissionsForAgent } from './skills';

describe('skills permissions', () => {
  it('should allow all skills for orchestrator by default', () => {
    const permissions = getSkillPermissionsForAgent('orchestrator');
    expect(permissions['*']).toBe('allow');
  });

  it('should deny all skills for other agents by default', () => {
    const permissions = getSkillPermissionsForAgent('designer');
    expect(permissions['*']).toBe('deny');
  });

  it('should allow recommended skills for specific agents', () => {
    // Designer should have agent-browser allowed
    const designerPerms = getSkillPermissionsForAgent('designer');
    expect(designerPerms['agent-browser']).toBe('allow');

    // Developer (orchestrator) should have simplify allowed (and everything else via *)
    const orchPerms = getSkillPermissionsForAgent('orchestrator');
    expect(orchPerms.simplify).toBe('allow');
  });

  it('should auto-allow SDD skills only for orchestrator by default', () => {
    const orchestratorPerms = getSkillPermissionsForAgent('orchestrator');
    const designerPerms = getSkillPermissionsForAgent('designer');

    expect(orchestratorPerms['sdd-propose']).toBe('allow');
    expect(orchestratorPerms['sdd-spec']).toBe('allow');
    expect(orchestratorPerms['sdd-design']).toBe('allow');
    expect(orchestratorPerms['sdd-tasks']).toBe('allow');
    expect(orchestratorPerms['sdd-apply']).toBe('allow');
    expect(orchestratorPerms['sdd-verify']).toBe('allow');
    expect(orchestratorPerms['sdd-archive']).toBe('allow');

    expect(designerPerms['sdd-propose']).toBe('deny');
    expect(designerPerms['sdd-spec']).toBe('deny');
    expect(designerPerms['sdd-design']).toBe('deny');
    expect(designerPerms['sdd-tasks']).toBe('deny');
    expect(designerPerms['sdd-apply']).toBe('deny');
    expect(designerPerms['sdd-verify']).toBe('deny');
    expect(designerPerms['sdd-archive']).toBe('deny');
  });

  it('bundled SDD skills are orchestrator-only in the custom skill registry', () => {
    const sddSkills = CUSTOM_SKILLS.filter((skill) =>
      skill.name.startsWith('sdd-'),
    );

    expect(sddSkills.length).toBeGreaterThan(0);
    for (const skill of sddSkills) {
      expect(skill.allowedAgents).toEqual(['orchestrator']);
    }
  });

  it('should honor explicit skill list overrides', () => {
    // Override with empty list
    const emptyPerms = getSkillPermissionsForAgent('orchestrator', []);
    expect(emptyPerms['*']).toBe('deny');
    expect(Object.keys(emptyPerms).length).toBe(1);

    // Override with specific list
    const specificPerms = getSkillPermissionsForAgent('designer', [
      'my-skill',
      '!bad-skill',
    ]);
    expect(specificPerms['*']).toBe('deny');
    expect(specificPerms['my-skill']).toBe('allow');
    expect(specificPerms['bad-skill']).toBe('deny');
  });

  it('should honor wildcard in explicit list', () => {
    const wildcardPerms = getSkillPermissionsForAgent('designer', ['*']);
    expect(wildcardPerms['*']).toBe('allow');
  });

  it('should allow SDD skills for other agents when explicitly overridden', () => {
    const permissions = getSkillPermissionsForAgent('designer', ['sdd-spec']);

    expect(permissions['*']).toBe('deny');
    expect(permissions['sdd-spec']).toBe('allow');
  });
});
