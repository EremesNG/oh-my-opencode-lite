import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { buildCompactionReminder, buildMemoryInstructions } from './protocol';

const memContextMock = mock(async () => null as string | null);
const memSessionStartMock = mock(async () => true);
const memSavePromptMock = mock(async () => true);
const createThothClientMock = mock(() => ({
  enabled: true,
  memContext: memContextMock,
  memSessionStart: memSessionStartMock,
  memSavePrompt: memSavePromptMock,
}));

mock.module('../../thoth', () => ({
  createThothClient: createThothClientMock,
}));

const { createThothMemHook } = await import('./index');

describe('createThothMemHook', () => {
  beforeEach(() => {
    createThothClientMock.mockReset();
    createThothClientMock.mockImplementation(() => ({
      enabled: true,
      memContext: memContextMock,
      memSessionStart: memSessionStartMock,
      memSavePrompt: memSavePromptMock,
    }));

    memContextMock.mockReset();
    memSessionStartMock.mockReset();
    memSavePromptMock.mockReset();

    memContextMock.mockResolvedValue(null);
    memSessionStartMock.mockResolvedValue(true);
    memSavePromptMock.mockResolvedValue(true);
  });

  test('creates the thoth client with HTTP settings', () => {
    createThothMemHook({
      project: 'oh-my-opencode-lite',
      directory: '/workspace/oh-my-opencode-lite',
      thoth: { timeout: 25000, http_port: 8123 },
      enabled: true,
    });

    expect(createThothClientMock).toHaveBeenCalledWith({
      project: 'oh-my-opencode-lite',
      directory: '/workspace/oh-my-opencode-lite',
      httpPort: 8123,
      timeoutMs: 25000,
      enabled: true,
    });
  });

  test('injects memory protocol guidance into tracked root session prompts', async () => {
    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
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

    const expectedInstructions = buildMemoryInstructions(
      'root-session',
      'oh-my-opencode-lite',
    );
    expect(output.system[0]).toContain('Base system prompt');
    expect(output.system[0]).toContain(expectedInstructions);
  });

  test('injects compaction instructions and retrieved memory context during compaction', async () => {
    memContextMock.mockResolvedValue('## Memory Context\n- Prior decision');

    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
      enabled: true,
    });

    const output = { context: [] as string[] };
    await hook['experimental.session.compacting']?.(
      { sessionID: 'root-session' },
      output,
    );

    expect(memSessionStartMock).toHaveBeenCalledWith('root-session');
    expect(output.context[0]).toContain('CRITICAL INSTRUCTION');
    expect(output.context[0]).toContain("Use project: 'oh-my-opencode-lite'.");
    expect(output.context).toContain('## Memory Context\n- Prior decision');
  });

  test('filters child sessions from root memory tracking', async () => {
    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
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

  test('captures user prompts from chat.message', async () => {
    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
      enabled: true,
    });

    await hook['chat.message']?.(
      { sessionID: 'root-session' },
      {
        parts: [{ type: 'text', text: 'User prompt content' } as never],
        message: {},
      },
    );

    expect(memSessionStartMock).toHaveBeenCalledWith('root-session');
    expect(memSavePromptMock).toHaveBeenCalledWith(
      'root-session',
      'User prompt content',
    );
  });

  test('strips private tags before saving prompts', async () => {
    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
      enabled: true,
    });

    await hook['chat.message']?.(
      { sessionID: 'root-session' },
      {
        parts: [
          {
            type: 'text',
            text: 'Please keep <private>secret</private> hidden in memory.',
          } as never,
        ],
        message: {},
      },
    );

    expect(memSavePromptMock).toHaveBeenCalledWith(
      'root-session',
      'Please keep [REDACTED] hidden in memory.',
    );
  });

  test('truncates prompts longer than 2000 characters before saving', async () => {
    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
      enabled: true,
    });

    await hook['chat.message']?.(
      { sessionID: 'root-session' },
      {
        parts: [{ type: 'text', text: 'a'.repeat(2005) } as never],
        message: {},
      },
    );

    expect(memSavePromptMock).toHaveBeenCalledTimes(1);
    expect(memSavePromptMock.mock.calls[0]?.[1]).toBe(`${'a'.repeat(2000)}...`);
  });

  test('ignores chat.message events without text content', async () => {
    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
      enabled: true,
    });

    await hook['chat.message']?.(
      { sessionID: 'root-session' },
      {
        parts: [{ type: 'tool-call', tool: 'read' } as never],
        message: {},
      },
    );

    expect(memSavePromptMock).not.toHaveBeenCalled();
  });

  test('clears compaction follow-up flag when mem_session_summary tool is called', async () => {
    const hook = createThothMemHook({
      project: 'oh-my-opencode-lite',
      enabled: true,
    });

    await hook.event({
      event: {
        type: 'session.created',
        properties: { info: { id: 'root-session' } },
      } as never,
    });

    await hook.event({
      event: {
        type: 'session.compacted',
        properties: { info: { id: 'root-session' } },
      } as never,
    });

    const expectedInstructions = buildMemoryInstructions(
      'root-session',
      'oh-my-opencode-lite',
    );

    const withReminder = { system: ['Base system prompt'] };
    await hook['experimental.chat.system.transform']?.(
      { sessionID: 'root-session', model: {} as never },
      withReminder,
    );

    expect(withReminder.system[0]).toContain(expectedInstructions);
    expect(withReminder.system[0]).toContain(
      buildCompactionReminder('root-session'),
    );

    await hook['tool.execute.after']?.(
      {
        tool: 'mcp_thoth_mem_mem_session_summary',
        sessionID: 'root-session',
        callID: 'call-1',
        args: {},
      },
      {
        title: 'Summary saved',
        output: 'ok',
        metadata: {},
      },
    );

    const withoutReminder = { system: ['Base system prompt'] };
    await hook['experimental.chat.system.transform']?.(
      { sessionID: 'root-session', model: {} as never },
      withoutReminder,
    );

    expect(withoutReminder.system[0]).toContain(expectedInstructions);
    expect(withoutReminder.system[0]).not.toContain(
      buildCompactionReminder('root-session'),
    );
  });
});
