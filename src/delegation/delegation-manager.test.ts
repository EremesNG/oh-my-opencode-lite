import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PluginInput } from '@opencode-ai/plugin';

let generatedNames: string[] = [];

const uniqueNamesGeneratorMock = mock(
  () => generatedNames.shift() ?? 'steady-blue-otter',
);
const getProjectIdMock = mock(
  async (
    worktreeDirectory: string,
    _timeoutMs?: number,
    _projectName?: string,
    _shell?: unknown,
  ) => {
    if (worktreeDirectory.includes('repo-b')) {
      return 'project-b-123456789abc';
    }
    return 'project-a-123456789abc';
  },
);

function createMockShell() {
  return {
    nothrow: mock(() => ({
      cwd: mock(() =>
        mock(() => ({
          quiet: mock(async () => ({ exitCode: 0, text: () => '' })),
        })),
      ),
    })),
  } as unknown as PluginInput['$'];
}

function createManagerOptions(
  tempDir: string,
  repoName: string,
  overrides?: {
    storageDir?: string;
    timeout?: number;
    projectName?: string;
    shell?: PluginInput['$'];
    getActiveTaskIds?: () => Iterable<string>;
  },
) {
  return {
    directory: path.join(tempDir, repoName),
    worktreeDirectory: path.join(tempDir, `${repoName}-worktree`),
    projectName: overrides?.projectName ?? `${repoName}-project`,
    shell: overrides?.shell ?? createMockShell(),
    config: {
      storage_dir: overrides?.storageDir ?? path.join(tempDir, 'storage'),
      timeout: overrides?.timeout ?? 1000,
    },
    getActiveTaskIds: overrides?.getActiveTaskIds,
  };
}

mock.module('unique-names-generator', () => ({
  adjectives: [],
  animals: [],
  colors: [],
  uniqueNamesGenerator: uniqueNamesGeneratorMock,
}));

mock.module('./project-id', () => ({
  getProjectId: getProjectIdMock,
}));

import { DelegationManager } from './delegation-manager';

describe('DelegationManager', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'delegation-manager-test-'));
    generatedNames = [];
    uniqueNamesGeneratorMock.mockClear();
    getProjectIdMock.mockClear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('writes and reads persisted delegation records with parsed metadata', async () => {
    const storageDir = path.join(tempDir, 'storage');
    const manager = new DelegationManager(
      createManagerOptions(tempDir, 'repo-a', { storageDir }),
    );

    const persisted = await manager.persist({
      rootSessionId: 'root-session',
      record: {
        id: 'bg_clever-indigo-otter',
        agent: 'explorer',
        status: 'complete',
        title: 'Scan repository layout',
        summary: 'Found the main modules and test coverage gaps.',
        startedAt: '2026-03-24T10:00:00.000Z',
        completedAt: '2026-03-24T10:05:00.000Z',
        content: 'First paragraph.\n\nSecond paragraph.',
      },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.path).toContain('project-a-123456789abc');
    expect(persisted?.path).toContain('root-session');

    const readBack = await manager.read(
      'bg_clever-indigo-otter',
      'root-session',
    );

    expect(readBack).not.toBeNull();
    expect(readBack?.header).toMatchObject({
      id: 'bg_clever-indigo-otter',
      title: 'Scan repository layout',
      summary: 'Found the main modules and test coverage gaps.',
      agent: 'explorer',
      status: 'complete',
      projectId: 'project-a-123456789abc',
      rootSessionId: 'root-session',
      startedAt: '2026-03-24T10:00:00.000Z',
      completedAt: '2026-03-24T10:05:00.000Z',
    });
    expect(readBack?.record.content.trim()).toBe(
      'First paragraph.\n\nSecond paragraph.',
    );
  });

  test('reuses the same project directory for the same repository and isolates different repositories', async () => {
    const storageDir = path.join(tempDir, 'storage');
    const managerA1 = new DelegationManager(
      createManagerOptions(tempDir, 'repo-a', { storageDir }),
    );
    const managerA2 = new DelegationManager(
      createManagerOptions(tempDir, 'repo-a', { storageDir }),
    );
    const managerB = new DelegationManager(
      createManagerOptions(tempDir, 'repo-b', { storageDir }),
    );

    const persistedA1 = await managerA1.persist({
      rootSessionId: 'root-a-1',
      record: {
        id: 'bg_a1',
        agent: 'explorer',
        status: 'complete',
        title: 'A1',
        summary: 'one',
        startedAt: '2026-03-24T10:00:00.000Z',
        completedAt: '2026-03-24T10:01:00.000Z',
        content: 'content',
      },
    });
    const persistedA2 = await managerA2.persist({
      rootSessionId: 'root-a-2',
      record: {
        id: 'bg_a2',
        agent: 'explorer',
        status: 'complete',
        title: 'A2',
        summary: 'two',
        startedAt: '2026-03-24T10:02:00.000Z',
        completedAt: '2026-03-24T10:03:00.000Z',
        content: 'content',
      },
    });
    const persistedB = await managerB.persist({
      rootSessionId: 'root-b-1',
      record: {
        id: 'bg_b1',
        agent: 'librarian',
        status: 'complete',
        title: 'B1',
        summary: 'three',
        startedAt: '2026-03-24T10:04:00.000Z',
        completedAt: '2026-03-24T10:05:00.000Z',
        content: 'content',
      },
    });

    expect(persistedA1?.path).toContain('project-a-123456789abc');
    expect(persistedA2?.path).toContain('project-a-123456789abc');
    expect(persistedB?.path).toContain('project-b-123456789abc');
    expect(persistedA1?.path).not.toContain('project-b-123456789abc');
  });

  test('avoids reusing colliding human-readable task ids', async () => {
    generatedNames = [
      'curious-red-panda',
      'curious-red-panda',
      'steady-blue-otter',
    ];

    const manager = new DelegationManager(
      createManagerOptions(tempDir, 'repo-a', {
        getActiveTaskIds: () => ['bg_curious-red-panda'],
      }),
    );

    const taskId = await manager.createTaskId('root-session');

    expect(taskId).toBe('bg_steady-blue-otter');
  });

  test('threads worktreeDirectory, shell, and projectName into project id resolution', async () => {
    const shell = createMockShell();
    const manager = new DelegationManager(
      createManagerOptions(tempDir, 'repo-a', {
        shell,
        projectName: 'Phase 2 Project',
        timeout: 4321,
      }),
    );

    await manager.resolveProjectId();

    expect(getProjectIdMock).toHaveBeenCalledWith(
      path.join(tempDir, 'repo-a-worktree'),
      4321,
      'Phase 2 Project',
      shell,
    );
  });

  test('returns null instead of throwing when persistence storage is unavailable', async () => {
    const blockedPath = path.join(tempDir, 'blocked-storage');
    writeFileSync(blockedPath, 'not-a-directory');

    const manager = new DelegationManager(
      createManagerOptions(tempDir, 'repo-a', { storageDir: blockedPath }),
    );

    const persisted = await manager.persist({
      rootSessionId: 'root-session',
      record: {
        id: 'bg_unavailable',
        agent: 'explorer',
        status: 'complete',
        title: 'Unavailable storage',
        summary: 'storage failure',
        startedAt: '2026-03-24T10:00:00.000Z',
        completedAt: '2026-03-24T10:01:00.000Z',
        content: 'result still exists in memory',
      },
    });

    expect(persisted).toBeNull();
  });

  test('lists persisted records by parsing metadata from markdown headers', async () => {
    const storageDir = path.join(tempDir, 'storage');
    const manager = new DelegationManager(
      createManagerOptions(tempDir, 'repo-a', { storageDir }),
    );

    await manager.persist({
      rootSessionId: 'root-session',
      record: {
        id: 'bg_older',
        agent: 'explorer',
        status: 'complete',
        title: 'Older task',
        summary: 'older summary',
        startedAt: '2026-03-24T09:00:00.000Z',
        completedAt: '2026-03-24T09:05:00.000Z',
        content: 'older content',
      },
    });
    await manager.persist({
      rootSessionId: 'root-session',
      record: {
        id: 'bg_newer',
        agent: 'librarian',
        status: 'complete',
        title: 'Newer task',
        summary: 'newer summary',
        startedAt: '2026-03-24T10:00:00.000Z',
        completedAt: '2026-03-24T10:06:00.000Z',
        content: 'newer content',
      },
    });

    const listed = await manager.list('root-session');

    expect(listed).toHaveLength(2);
    expect(listed[0]).toMatchObject({
      id: 'bg_newer',
      agent: 'librarian',
      title: 'Newer task',
      summary: 'newer summary',
      status: 'complete',
    });
    expect(listed[1]?.id).toBe('bg_older');
  });
});
