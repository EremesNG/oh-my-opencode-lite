import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { FIRST_ACTION_INSTRUCTION, MEMORY_INSTRUCTIONS } from './protocol';

const memContextMock = mock(async () => null as string | null);
const memSessionStartMock = mock(async () => true);
const memSessionSummaryMock = mock(async () => true);
const memSavePromptMock = mock(async () => true);
const memCapturePassiveMock = mock(async () => true);

mock.module('../../thoth', () => ({
  createThothClient: () => ({
    enabled: true,
    memContext: memContextMock,
    memSessionStart: memSessionStartMock,
    memSessionSummary: memSessionSummaryMock,
    memSavePrompt: memSavePromptMock,
    memCapturePassive: memCapturePassiveMock,
  }),
}));

const { createThothMemHook } = await import('./index');

function createClient() {
  return {
    session: {
      message: mock(async () => ({
        data: {
          parts: [{ type: 'text', text: 'User prompt content' }],
        },
      })),
    },
  } as const;
}

describe('createThothMemHook', () => {
  beforeEach(() => {
    memContextMock.mockReset();
    memSessionStartMock.mockReset();
    memSessionSummaryMock.mockReset();
    memSavePromptMock.mockReset();
    memCapturePassiveMock.mockReset();

    memContextMock.mockResolvedValue(null);
    memSessionStartMock.mockResolvedValue(true);
    memSessionSummaryMock.mockResolvedValue(true);
    memSavePromptMock.mockResolvedValue(true);
    memCapturePassiveMock.mockResolvedValue(true);
  });

  test('injects memory protocol guidance into tracked root session prompts', async () => {
    const client = createClient();
    const hook = createThothMemHook({
      client: client as never,
      project: 'omolite',
      enabled: true,
    });

    await hook.event({
      event: {
        type: 'session.created',
        properties: { info: { id: 'root-session' } },
      } as never,
    });

    const output = { system: ['Base system prompt'] };
    await hook['experimental.chat.system.transform']?.(
      { sessionID: 'root-session', model: {} as never },
      output,
    );

    expect(output.system[0]).toContain('Base system prompt');
    expect(output.system[0]).toContain(MEMORY_INSTRUCTIONS);
  });

  test('injects compaction recovery instructions and retrieved memory context', async () => {
    memContextMock.mockResolvedValue('## Memory Context\n- Prior decision');

    const client = createClient();
    const hook = createThothMemHook({
      client: client as never,
      project: 'omolite',
      enabled: true,
    });

    await hook.event({
      event: {
        type: 'session.created',
        properties: { info: { id: 'root-session' } },
      } as never,
    });

    const output = { context: [] as string[] };
    await hook['experimental.session.compacting']?.(
      { sessionID: 'root-session' },
      output,
    );

    expect(output.context).toEqual([
      FIRST_ACTION_INSTRUCTION,
      '## Memory Context\n- Prior decision',
    ]);
  });

  test('captures passive learnings only for tracked root task output', async () => {
    const client = createClient();
    const hook = createThothMemHook({
      client: client as never,
      project: 'omolite',
      enabled: true,
    });

    await hook.event({
      event: {
        type: 'session.created',
        properties: { info: { id: 'root-session' } },
      } as never,
    });

    await hook['tool.execute.after']?.(
      {
        tool: 'task',
        sessionID: 'root-session',
        callID: 'call-1',
        args: {},
      },
      {
        title: 'Task output',
        output: '## Key Learnings:\n- Capture this learning',
        metadata: {},
      },
    );

    expect(memCapturePassiveMock).toHaveBeenCalledWith(
      'root-session',
      '## Key Learnings:\n- Capture this learning',
      'task-tool',
    );
  });

  test('filters child sessions from root memory tracking', async () => {
    const client = createClient();
    const hook = createThothMemHook({
      client: client as never,
      project: 'omolite',
      enabled: true,
    });

    await hook.event({
      event: {
        type: 'session.created',
        properties: { info: { id: 'child-session', parentID: 'root-session' } },
      } as never,
    });

    expect(memSessionStartMock).not.toHaveBeenCalled();
  });

  test('captures user prompts from message updates only once per tracked root session', async () => {
    const client = createClient();
    const hook = createThothMemHook({
      client: client as never,
      project: 'omolite',
      enabled: true,
    });

    await hook.event({
      event: {
        type: 'session.created',
        properties: { info: { id: 'root-session' } },
      } as never,
    });

    const event = {
      event: {
        type: 'message.updated',
        properties: {
          info: {
            id: 'message-1',
            sessionID: 'root-session',
            role: 'user',
          },
        },
      } as never,
    };

    await hook.event(event);
    await hook.event(event);

    expect(client.session.message).toHaveBeenCalledTimes(1);
    expect(memSavePromptMock).toHaveBeenCalledTimes(1);
    expect(memSavePromptMock).toHaveBeenCalledWith(
      'root-session',
      'User prompt content',
    );
  });
});
