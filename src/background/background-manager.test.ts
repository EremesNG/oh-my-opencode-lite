import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { DelegationManager } from '../delegation';
import { LITE_INTERNAL_INITIATOR_MARKER } from '../utils';
import { BackgroundTaskManager } from './background-manager';

function createMockShell() {
  return {
    nothrow: mock(() => ({
      cwd: mock(() =>
        mock(() => ({
          quiet: mock(async () => ({ exitCode: 0, text: () => '' })),
        })),
      ),
    })),
  };
}

function createMockContext(overrides?: {
  sessionCreateResult?: { data?: { id?: string } };
  sessionMessagesResult?: {
    data?: Array<{
      info?: { role: string };
      parts?: Array<{ type: string; text?: string }>;
    }>;
  };
  promptImpl?: (args: unknown) => Promise<unknown>;
}) {
  let callCount = 0;
  const worktreeDirectory = '/test/worktree';
  return {
    client: {
      session: {
        create: mock(async () => {
          callCount += 1;
          return (
            overrides?.sessionCreateResult ?? {
              data: { id: `test-session-${callCount}` },
            }
          );
        }),
        messages: mock(
          async () => overrides?.sessionMessagesResult ?? { data: [] },
        ),
        prompt: mock(async (args: unknown) => {
          if (overrides?.promptImpl) {
            return overrides.promptImpl(args);
          }

          return {};
        }),
        abort: mock(async () => ({})),
      },
    },
    directory: '/test/directory',
    worktree: worktreeDirectory,
    worktreeDirectory,
    serverUrl: new URL('http://localhost:4317'),
    project: { name: 'phase-2-project' },
    $: createMockShell(),
  } as const;
}

function createDelegationManagerMock(overrides?: {
  createTaskId?: (rootSessionId: string) => Promise<string>;
  persist?: DelegationManager['persist'];
  read?: DelegationManager['read'];
  summarizeForInjection?: DelegationManager['summarizeForInjection'];
}) {
  return {
    createTaskId: mock(
      overrides?.createTaskId ?? (async () => 'bg_clever-blue-otter'),
    ),
    persist: mock(overrides?.persist ?? (async () => null)),
    read: mock(overrides?.read ?? (async () => null)),
    summarizeForInjection: mock(
      overrides?.summarizeForInjection ?? (async () => null),
    ),
  } as unknown as DelegationManager;
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function getSessionCreateArgs(ctx: ReturnType<typeof createMockContext>) {
  return ctx.client.session.create.mock.calls[0]?.[0] as
    | {
        body?: {
          permission?: Array<{
            permission: string;
            pattern: string;
            action: 'allow' | 'deny' | 'ask';
          }>;
        };
      }
    | undefined;
}

function getInitialPromptArgs(ctx: ReturnType<typeof createMockContext>) {
  return ctx.client.session.prompt.mock.calls[0]?.[0] as
    | {
        body?: {
          permission?: Record<string, unknown>;
          tools?: Record<string, boolean>;
        };
      }
    | undefined;
}

describe('BackgroundTaskManager', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('launchBackgroundTask assigns human-readable ids from the delegation manager', async () => {
    const ctx = createMockContext();
    const delegationManager = createDelegationManagerMock({
      createTaskId: async () => 'bg_clever-blue-otter',
    });
    const manager = new BackgroundTaskManager(
      ctx as never,
      undefined,
      undefined,
      delegationManager,
    );

    const task = await manager.launchBackgroundTask({
      agent: 'explorer',
      prompt: 'Find interesting files',
      description: 'Repository scan',
      parentSessionId: 'root-session',
    });

    expect(task.id).toBe('bg_clever-blue-otter');
  });

  test('retries fallback id generation until it avoids active collisions', async () => {
    const ctx = createMockContext();
    const manager = new BackgroundTaskManager(ctx as never);
    const randomSpy = spyOn(Math, 'random')
      .mockReturnValueOnce(0.123456)
      .mockReturnValueOnce(0.123456)
      .mockReturnValueOnce(0.987654);

    const first = await manager.launchBackgroundTask({
      agent: 'explorer',
      prompt: 'one',
      description: 'one',
      parentSessionId: 'root-session',
    });
    const second = await manager.launchBackgroundTask({
      agent: 'explorer',
      prompt: 'two',
      description: 'two',
      parentSessionId: 'root-session',
    });

    expect(first.id).not.toBe(second.id);

    randomSpy.mockRestore();
  });

  test('threads worktreeDirectory into background session creation and prompting', async () => {
    const ctx = createMockContext();
    const manager = new BackgroundTaskManager(
      ctx as never,
      undefined,
      undefined,
      undefined,
      ctx.worktreeDirectory,
    );

    const task = manager.launch({
      agent: 'explorer',
      prompt: 'Inspect the worktree',
      description: 'Worktree scan',
      parentSessionId: 'root-session',
    });

    await flushAsyncWork();

    expect(ctx.client.session.create.mock.calls[0]?.[0]).toMatchObject({
      body: {
        parentID: 'root-session',
        title: 'Background: Worktree scan',
      },
      query: { directory: ctx.worktreeDirectory },
    });

    const promptCalls = ctx.client.session.prompt.mock.calls as Array<
      [
        {
          path?: { id?: string };
          query?: { directory?: string };
        },
      ]
    >;

    expect(promptCalls[0]?.[0]).toMatchObject({
      path: { id: task.sessionId },
      query: { directory: ctx.worktreeDirectory },
    });
  });

  test('denies delegation permissions for leaf child sessions and keeps legacy tool fallback', async () => {
    const ctx = createMockContext();
    const manager = new BackgroundTaskManager(ctx as never);

    manager.launch({
      agent: 'quick',
      prompt: 'Implement the task',
      description: 'Leaf work',
      parentSessionId: 'root-session',
    });

    await flushAsyncWork();

    expect(getSessionCreateArgs(ctx)).toMatchObject({
      body: {
        permission: expect.arrayContaining([
          { permission: 'task', pattern: '*', action: 'deny' },
          { permission: 'background_task', pattern: '*', action: 'deny' },
          { permission: 'background_output', pattern: '*', action: 'deny' },
          { permission: 'background_cancel', pattern: '*', action: 'deny' },
        ]),
      },
    });

    expect(getInitialPromptArgs(ctx)).toMatchObject({
      body: {
        permission: {
          task: 'deny',
          background_task: 'deny',
          background_output: 'deny',
          background_cancel: 'deny',
        },
        tools: {
          task: false,
          background_task: false,
          background_output: false,
          background_cancel: false,
        },
      },
    });
  });

  test('allows only configured subagents in delegation permissions for delegating child sessions', async () => {
    const ctx = createMockContext();
    const manager = new BackgroundTaskManager(ctx as never);

    manager.launch({
      agent: 'orchestrator',
      prompt: 'Coordinate the task',
      description: 'Delegating work',
      parentSessionId: 'root-session',
    });

    await flushAsyncWork();

    expect(getSessionCreateArgs(ctx)).toMatchObject({
      body: {
        permission: expect.arrayContaining([
          { permission: 'task', pattern: 'explorer', action: 'allow' },
          { permission: 'task', pattern: 'librarian', action: 'allow' },
          { permission: 'task', pattern: 'oracle', action: 'allow' },
          { permission: 'task', pattern: 'designer', action: 'allow' },
          { permission: 'task', pattern: 'quick', action: 'allow' },
          { permission: 'task', pattern: 'deep', action: 'allow' },
          { permission: 'task', pattern: '*', action: 'deny' },
          {
            permission: 'background_task',
            pattern: 'explorer',
            action: 'allow',
          },
          {
            permission: 'background_task',
            pattern: 'librarian',
            action: 'allow',
          },
          {
            permission: 'background_task',
            pattern: '*',
            action: 'deny',
          },
        ]),
      },
    });

    expect(getInitialPromptArgs(ctx)).toMatchObject({
      body: {
        permission: {
          task: {
            explorer: 'allow',
            librarian: 'allow',
            oracle: 'allow',
            designer: 'allow',
            quick: 'allow',
            deep: 'allow',
            '*': 'deny',
          },
          background_task: {
            explorer: 'allow',
            librarian: 'allow',
            '*': 'deny',
          },
          background_output: 'allow',
          background_cancel: 'allow',
        },
        tools: {
          task: true,
          background_task: true,
          background_output: true,
          background_cancel: true,
        },
      },
    });
  });

  test('persists completed tasks and keeps results when persistence fails', async () => {
    const ctx = createMockContext({
      sessionMessagesResult: {
        data: [
          {
            info: { role: 'assistant' },
            parts: [{ type: 'text', text: 'Delegated result output' }],
          },
        ],
      },
    });
    const delegationManager = createDelegationManagerMock({
      persist: async () => {
        throw new Error('disk unavailable');
      },
    });
    const manager = new BackgroundTaskManager(
      ctx as never,
      undefined,
      undefined,
      delegationManager,
    );

    const task = await manager.launchBackgroundTask({
      agent: 'explorer',
      prompt: 'test',
      description: 'test',
      parentSessionId: 'root-session',
    });

    await flushAsyncWork();
    await manager.handleSessionStatus({
      type: 'session.status',
      properties: {
        sessionID: task.sessionId,
        status: { type: 'idle' },
      },
    });
    await flushAsyncWork();

    expect(task.status).toBe('completed');
    expect(task.result).toBe('Delegated result output');
    expect(task.persistenceError).toBe(
      'Persistent delegation storage unavailable',
    );
  });

  test('reads disk-backed delegation results when memory state is gone', async () => {
    const ctx = createMockContext();
    const delegationManager = createDelegationManagerMock({
      read: async () => ({
        path: '/tmp/bg_saved.md',
        header: {
          id: 'bg_saved',
          title: 'Saved task',
          summary: 'Saved summary',
          agent: 'explorer',
          status: 'complete',
          projectId: 'project-a-123456789abc',
          rootSessionId: 'root-session',
          startedAt: '2026-03-24T10:00:00.000Z',
          completedAt: '2026-03-24T10:01:00.000Z',
          persistedAt: '2026-03-24T10:01:30.000Z',
        },
        record: {
          id: 'bg_saved',
          agent: 'explorer',
          status: 'complete',
          title: 'Saved task',
          summary: 'Saved summary',
          startedAt: '2026-03-24T10:00:00.000Z',
          completedAt: '2026-03-24T10:01:00.000Z',
          content: 'Saved body',
        },
      }),
    });
    const manager = new BackgroundTaskManager(
      ctx as never,
      undefined,
      undefined,
      delegationManager,
    );

    const record = await manager.readDelegation('bg_saved', 'root-session');

    expect(record?.record.content).toBe('Saved body');
  });

  test('prefers persisted delegation context when building injection summary', async () => {
    const ctx = createMockContext();
    const delegationManager = createDelegationManagerMock({
      summarizeForInjection: async () =>
        '## Delegation Digest\n- bg_saved (@explorer) Saved task — Saved summary',
    });
    const manager = new BackgroundTaskManager(
      ctx as never,
      undefined,
      undefined,
      delegationManager,
    );

    const summary = await manager.getDelegationSummary('root-session');

    expect(summary).toBe(
      '## Delegation Digest\n- bg_saved (@explorer) Saved task — Saved summary',
    );
  });

  test('sends completion notifications with the internal initiator marker', async () => {
    const ctx = createMockContext({
      sessionMessagesResult: {
        data: [
          {
            info: { role: 'assistant' },
            parts: [{ type: 'text', text: 'Finished work' }],
          },
        ],
      },
    });
    const manager = new BackgroundTaskManager(ctx as never);

    const task = manager.launch({
      agent: 'explorer',
      prompt: 'do the work',
      description: 'Background work',
      parentSessionId: 'parent-session',
    });

    await flushAsyncWork();
    await manager.handleSessionStatus({
      type: 'session.status',
      properties: {
        sessionID: task.sessionId,
        status: { type: 'idle' },
      },
    });
    await flushAsyncWork();

    const promptCalls = ctx.client.session.prompt.mock.calls as Array<
      [{ body?: { parts?: Array<{ text?: string }> } }]
    >;
    const notificationCall = promptCalls[promptCalls.length - 1];
    expect(notificationCall?.[0].body?.parts?.[0]?.text).toContain(
      LITE_INTERNAL_INITIATOR_MARKER,
    );
  });

  test('uses background timeout instead of fallback failover timeout', async () => {
    const ctx = createMockContext({
      sessionMessagesResult: {
        data: [
          {
            info: { role: 'assistant' },
            parts: [{ type: 'text', text: 'Completed after slow prompt' }],
          },
        ],
      },
      promptImpl: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {};
      },
    });
    const manager = new BackgroundTaskManager(ctx as never, undefined, {
      background: {
        maxConcurrentStarts: 10,
        timeoutMs: 50,
      },
      fallback: {
        enabled: true,
        timeoutMs: 1,
        retryDelayMs: 0,
        chains: {},
      },
    });

    const task = manager.launch({
      agent: 'explorer',
      prompt: 'do the work',
      description: 'Slow background work',
      parentSessionId: 'parent-session',
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    await flushAsyncWork();

    expect(task.status).toBe('running');
    expect(task.error).toBeUndefined();

    await manager.handleSessionStatus({
      type: 'session.status',
      properties: {
        sessionID: task.sessionId,
        status: { type: 'idle' },
      },
    });
    await flushAsyncWork();

    expect(task.status).toBe('completed');
    expect(task.result).toBe('Completed after slow prompt');
  });

  test('ignores idle events while aborting for timeout', async () => {
    const ctx = createMockContext();
    const manager = new BackgroundTaskManager(ctx as never);
    const extractSpy = spyOn(
      manager as unknown as {
        extractAndCompleteTask: (task: unknown) => unknown;
      },
      'extractAndCompleteTask',
    );

    const task = {
      id: 'bg_timeout_guard',
      sessionId: 'session-timeout-guard',
      rootSessionId: 'root-session',
      description: 'guard timeout abort',
      agent: 'explorer',
      status: 'running',
      config: {
        maxConcurrentStarts: 10,
        timeoutMs: 300_000,
      },
      parentSessionId: 'parent-session',
      startedAt: new Date(),
      prompt: 'prompt',
      _abortingForTimeout: true,
    };

    const managerState = manager as unknown as {
      tasks: Map<string, typeof task>;
      tasksBySessionId: Map<string, string>;
    };
    managerState.tasks.set(task.id, task);
    managerState.tasksBySessionId.set(task.sessionId, task.id);

    await manager.handleSessionStatus({
      type: 'session.status',
      properties: {
        sessionID: task.sessionId,
        status: { type: 'idle' },
      },
    });

    expect(extractSpy).not.toHaveBeenCalled();
    expect(task.status).toBe('running');
  });

  test('enforces the new seven-agent delegation rules', async () => {
    const ctx = createMockContext();
    const manager = new BackgroundTaskManager(ctx as never);

    const orchestratorTask = manager.launch({
      agent: 'orchestrator',
      prompt: 'coordinate',
      description: 'coordinate',
      parentSessionId: 'root-session',
    });

    await flushAsyncWork();

    expect(
      manager.getAllowedSubagents(orchestratorTask.sessionId ?? 'missing'),
    ).toEqual(['explorer', 'librarian', 'oracle', 'designer', 'quick', 'deep']);
    expect(manager.isAgentAllowed('unknown-session', 'quick')).toBe(true);
    expect(manager.isAgentAllowed('unknown-session', 'fixer')).toBe(false);

    const quickTask = manager.launch({
      agent: 'quick',
      prompt: 'implement',
      description: 'implement',
      parentSessionId: 'root-session',
    });
    await flushAsyncWork();

    expect(
      manager.getAllowedSubagents(quickTask.sessionId ?? 'missing'),
    ).toEqual([]);
    expect(
      manager.isAgentAllowed(quickTask.sessionId ?? 'missing', 'explorer'),
    ).toBe(false);
  });
});
