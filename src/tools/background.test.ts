import { describe, expect, mock, test } from 'bun:test';
import { createBackgroundTools } from './background';

function createManager(
  overrides?: Partial<{
    isBackgroundCapableAgent: (agent: string) => boolean;
    isAgentAllowed: (sessionId: string, agent: string) => boolean;
    getAllowedSubagents: (sessionId: string) => readonly string[];
    launchBackgroundTask: (args: unknown) => Promise<unknown>;
    getResult: (taskId: string) => unknown;
    waitForCompletion: (taskId: string, timeout: number) => Promise<unknown>;
    readDelegation: (taskId: string, sessionId: string) => Promise<unknown>;
    cancel: (taskId?: string) => number;
  }>,
) {
  return {
    isBackgroundCapableAgent:
      overrides?.isBackgroundCapableAgent ?? ((agent) => agent === 'explorer'),
    isAgentAllowed: overrides?.isAgentAllowed ?? (() => true),
    getAllowedSubagents:
      overrides?.getAllowedSubagents ?? (() => ['explorer', 'librarian']),
    launchBackgroundTask:
      overrides?.launchBackgroundTask ??
      (mock(async () => ({
        id: 'bg_clever-blue-otter',
        status: 'pending',
      })) as never),
    getResult: overrides?.getResult ?? (() => null),
    waitForCompletion: overrides?.waitForCompletion ?? (async () => null),
    readDelegation: overrides?.readDelegation ?? (async () => null),
    cancel: overrides?.cancel ?? (() => 0),
  };
}

describe('createBackgroundTools', () => {
  const toolContext = {
    sessionID: 'root-session',
    messageID: 'message-1',
    agent: 'orchestrator',
    directory: '.',
    worktree: '.',
    abortSignal: new AbortController().signal,
    metadata: {},
    values: {},
  } as never;

  test('rejects non-background-capable agents', async () => {
    const manager = createManager({
      isBackgroundCapableAgent: () => false,
    });
    const tools = createBackgroundTools(
      { client: {}, directory: '.' } as never,
      manager as never,
    );

    const result = await tools.background_task.execute(
      {
        agent: 'quick',
        prompt: 'do work',
        description: 'do work',
      },
      toolContext,
    );

    expect(result).toContain("Agent 'quick' is not background-capable");
  });

  test('background_output falls back to persisted disk delegation when memory is missing', async () => {
    const manager = createManager({
      readDelegation: async () => ({
        header: {
          id: 'bg_saved',
        },
        record: {
          title: 'Saved task',
          startedAt: '2026-03-24T10:00:00.000Z',
          completedAt: '2026-03-24T10:01:00.000Z',
          content: 'Persisted output body',
        },
      }),
    });
    const tools = createBackgroundTools(
      { client: {}, directory: '.' } as never,
      manager as never,
    );

    const result = await tools.background_output.execute(
      {
        task_id: 'bg_saved',
      },
      toolContext,
    );

    expect(result).toContain('Task: bg_saved');
    expect(result).toContain('Persisted output body');
  });

  test('background_output reports missing tasks as unavailable', async () => {
    const manager = createManager();
    const tools = createBackgroundTools(
      { client: {}, directory: '.' } as never,
      manager as never,
    );

    const result = await tools.background_output.execute(
      {
        task_id: 'bg_missing',
      },
      toolContext,
    );

    expect(result).toBe('Task unavailable: bg_missing');
  });
});
