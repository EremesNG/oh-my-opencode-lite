import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { DelegationManager } from '../delegation';
import { LITE_INTERNAL_INITIATOR_MARKER } from '../utils';
import { BackgroundTaskManager } from './background-manager';

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
