import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { DelegationConfig } from '../config';
import { getEnv } from '../utils/env';

export interface DelegationPaths {
  storageDir: string;
  projectDir: string;
  sessionDir: string;
  taskFile: string;
}

function sanitizePathSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
  return normalized.length > 0 ? normalized : 'unknown';
}

export function resolveStorageDir(config?: DelegationConfig): string {
  if (config?.storage_dir) {
    return path.resolve(config.storage_dir);
  }

  const xdgDataHome = getEnv('XDG_DATA_HOME');
  const dataHome = xdgDataHome
    ? path.resolve(xdgDataHome)
    : path.join(homedir(), '.local', 'share');

  return path.join(dataHome, 'opencode', 'delegations');
}

export function resolvePaths(input: {
  config?: DelegationConfig;
  projectId: string;
  rootSessionId: string;
  taskId: string;
}): DelegationPaths {
  const storageDir = resolveStorageDir(input.config);
  const projectDir = path.join(
    storageDir,
    sanitizePathSegment(input.projectId),
  );
  const sessionDir = path.join(
    projectDir,
    sanitizePathSegment(input.rootSessionId),
  );
  const taskFile = path.join(
    sessionDir,
    `${sanitizePathSegment(input.taskId)}.md`,
  );

  return {
    storageDir,
    projectDir,
    sessionDir,
    taskFile,
  };
}

export async function ensureDelegationDirectories(
  paths: Pick<DelegationPaths, 'projectDir' | 'sessionDir'>,
): Promise<void> {
  await mkdir(paths.projectDir, { recursive: true });
  await mkdir(paths.sessionDir, { recursive: true });
}
