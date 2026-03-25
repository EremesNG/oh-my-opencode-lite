import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfigDir } from './paths';

/**
 * A custom skill bundled in this repository.
 * Unlike npx-installed skills, these are copied from src/skills/ to the OpenCode skills directory
 */
export interface CustomSkill {
  /** Skill name (folder name) */
  name: string;
  /** Human-readable description */
  description: string;
  /** List of agents that should auto-allow this skill */
  allowedAgents: string[];
  /** Source path in this repo (relative to project root) */
  sourcePath: string;
}

const SHARED_SKILL_DIRECTORY = '_shared';
const SHARED_SKILL_SOURCE_PATH = `src/skills/${SHARED_SKILL_DIRECTORY}`;

/**
 * Registry of custom skills bundled in this repository.
 */
export const CUSTOM_SKILLS: CustomSkill[] = [
  {
    name: 'brainstorming',
    description:
      'Understand user intent and scope through structured clarification before implementation',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/brainstorming',
  },
  {
    name: 'cartography',
    description: 'Repository understanding and hierarchical codemap generation',
    allowedAgents: ['orchestrator', 'explorer'],
    sourcePath: 'src/skills/cartography',
  },
  {
    name: 'plan-reviewer',
    description:
      'Review SDD task plans for execution blockers and valid references',
    allowedAgents: ['orchestrator', 'oracle'],
    sourcePath: 'src/skills/plan-reviewer',
  },
  {
    name: 'sdd-propose',
    description: 'Create change proposals for OpenSpec workflows',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/sdd-propose',
  },
  {
    name: 'sdd-spec',
    description: 'Write OpenSpec delta specifications',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/sdd-spec',
  },
  {
    name: 'sdd-design',
    description: 'Create technical design artifacts for changes',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/sdd-design',
  },
  {
    name: 'sdd-tasks',
    description: 'Generate phased implementation task checklists',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/sdd-tasks',
  },
  {
    name: 'sdd-apply',
    description: 'Execute tasks and persist implementation progress',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/sdd-apply',
  },
  {
    name: 'executing-plans',
    description:
      'Execute SDD task lists with real-time progress tracking, sub-agent dispatch, and verification checkpoints',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/executing-plans',
  },
  {
    name: 'sdd-verify',
    description: 'Build verification reports and compliance matrices',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/sdd-verify',
  },
  {
    name: 'sdd-archive',
    description: 'Archive completed OpenSpec changes with audit trails',
    allowedAgents: ['orchestrator'],
    sourcePath: 'src/skills/sdd-archive',
  },
];

/**
 * Get the target directory for custom skills installation.
 */
export function getCustomSkillsDir(): string {
  return join(getConfigDir(), 'skills');
}

/**
 * Recursively copy a directory.
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      copyFileSync(srcPath, destPath);
    }
  }
}

function installSharedSkillAssets(packageRoot: string): boolean {
  const sharedSourcePath = join(packageRoot, SHARED_SKILL_SOURCE_PATH);
  const sharedTargetPath = join(getCustomSkillsDir(), SHARED_SKILL_DIRECTORY);

  if (!existsSync(sharedSourcePath)) {
    console.error(`Custom skill shared assets not found: ${sharedSourcePath}`);
    return false;
  }

  copyDirRecursive(sharedSourcePath, sharedTargetPath);
  return true;
}

/**
 * Install a custom skill by copying from src/skills/ to the OpenCode skills directory
 * @param skill - The custom skill to install
 * @param projectRoot - Root directory of oh-my-opencode-lite project
 * @returns True if installation succeeded, false otherwise
 */
export function installCustomSkill(skill: CustomSkill): boolean {
  try {
    const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
    const sourcePath = join(packageRoot, skill.sourcePath);
    const targetPath = join(getCustomSkillsDir(), skill.name);

    if (!installSharedSkillAssets(packageRoot)) {
      return false;
    }

    // Validate source exists
    if (!existsSync(sourcePath)) {
      console.error(`Custom skill source not found: ${sourcePath}`);
      return false;
    }

    // Copy skill directory
    copyDirRecursive(sourcePath, targetPath);

    return true;
  } catch (error) {
    console.error(`Failed to install custom skill: ${skill.name}`, error);
    return false;
  }
}
