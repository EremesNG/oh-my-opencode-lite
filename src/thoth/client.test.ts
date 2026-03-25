import { describe, expect, mock, test } from 'bun:test';
import { createThothClient } from './client';

function createStoreClient(
  impl?: (args: { tool: string; args?: Record<string, unknown> }) => unknown,
) {
  const call = mock(
    async (args: { tool: string; args?: Record<string, unknown> }) => {
      if (impl) {
        return impl(args);
      }

      return { output: 'ok' };
    },
  );

  return {
    client: {
      store: {
        call,
      },
    },
    call,
  };
}

describe('createThothClient', () => {
  test('applies custom config to thoth tool calls', async () => {
    const { client, call } = createStoreClient(() => ({
      output: 'memory block',
    }));
    const thoth = createThothClient({
      client,
      project: 'oh-my-opencode-lite',
      directory: '/workspace/oh-my-opencode-lite',
      timeoutMs: 23456,
      enabled: true,
    });

    await thoth.memSessionStart('root-session');
    const context = await thoth.memContext(undefined, 7);

    expect(context).toBe('memory block');
    expect(call.mock.calls[0]?.[0]).toMatchObject({
      tool: 'thoth_mem_mem_session_start',
      args: {
        id: 'root-session',
        project: 'oh-my-opencode-lite',
        directory: '/workspace/oh-my-opencode-lite',
      },
    });
    expect(
      (call.mock.calls[0]?.[0] as { sessionID?: string } | undefined)
        ?.sessionID,
    ).toBeUndefined();
    expect(call.mock.calls[1]?.[0]).toMatchObject({
      tool: 'thoth_mem_mem_context',
      args: {
        project: 'oh-my-opencode-lite',
        scope: 'project',
        limit: 7,
      },
    });
  });

  test('falls back to default behavior for omitted optional settings', async () => {
    const { client, call } = createStoreClient(() => ({
      result: 'default context',
    }));
    const thoth = createThothClient({
      client,
      project: 'oh-my-opencode-lite',
    });

    const context = await thoth.memContext();

    expect(context).toBe('default context');
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]?.[0]).toMatchObject({
      tool: 'thoth_mem_mem_context',
      args: {
        project: 'oh-my-opencode-lite',
        scope: 'project',
        limit: 10,
      },
    });
  });

  test('passes session_id to memContext when provided', async () => {
    const { client, call } = createStoreClient(() => ({
      result: 'session context',
    }));
    const thoth = createThothClient({
      client,
      project: 'oh-my-opencode-lite',
    });

    const context = await thoth.memContext('test-session-123');

    expect(context).toBe('session context');
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]?.[0]).toMatchObject({
      tool: 'thoth_mem_mem_context',
      args: {
        project: 'oh-my-opencode-lite',
        scope: 'project',
        limit: 10,
        session_id: 'test-session-123',
      },
    });
    expect(
      (call.mock.calls[0]?.[0] as { sessionID?: string } | undefined)
        ?.sessionID,
    ).toBe('test-session-123');
  });

  test('surfaces unavailable thoth integration as disabled operations', async () => {
    const thothWithoutStore = createThothClient({
      client: {},
      project: 'oh-my-opencode-lite',
    });
    const thothThrowing = createThothClient({
      client: {
        store: {
          call: async () => {
            throw new Error('spawn failed');
          },
        },
      },
      project: 'oh-my-opencode-lite',
    });

    expect(await thothWithoutStore.memContext()).toBeNull();
    expect(await thothWithoutStore.memSessionStart('root-session')).toBe(false);
    expect(await thothThrowing.memSavePrompt('root-session', 'hello')).toBe(
      false,
    );
  });
});
