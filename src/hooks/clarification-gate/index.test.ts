import { describe, expect, test } from 'bun:test';
import { LITE_INTERNAL_INITIATOR_MARKER } from '../../utils';
import { PHASE_REMINDER } from '../phase-reminder';
import { createClarificationGateHook } from './index';

function createOutput(text: string, agent?: string) {
  return {
    messages: [
      {
        info: agent ? { role: 'user', agent } : { role: 'user' },
        parts: [{ type: 'text', text }],
      },
    ],
  };
}

describe('createClarificationGateHook', () => {
  test('injects clarification gate for explicit brainstorming keywords', async () => {
    const hook = createClarificationGateHook();
    const output = createOutput(
      'Can you help me brainstorm the architecture for this?',
      'orchestrator',
    );

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain('<clarification-gate>');
    expect(output.messages[0].parts[0].text).toContain(
      '- explicit keywords: brainstorm, architecture',
    );
    expect(output.messages[0].parts[0].text).toEndWith(
      'Can you help me brainstorm the architecture for this?',
    );
  });

  test('injects in auto mode when scope signal threshold is met', async () => {
    const hook = createClarificationGateHook();
    const output = createOutput(
      'We need a dashboard backed by an API and database migration.',
      'orchestrator',
    );

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain('<clarification-gate>');
    expect(output.messages[0].parts[0].text).toContain(
      '- scope signal — multiple views/pages: dashboard',
    );
    expect(output.messages[0].parts[0].text).toContain(
      '- scope signal — api/data: api, migration, database',
    );
  });

  test('skips scope-only requests in explicit-only mode', async () => {
    const hook = createClarificationGateHook({
      clarificationGate: { mode: 'explicit-only' },
    });
    const output = createOutput(
      'We need a dashboard backed by an API and database migration.',
      'orchestrator',
    );

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toBe(
      'We need a dashboard backed by an API and database migration.',
    );
  });

  test('injects in auto-for-planning mode for planning plus one scope signal', async () => {
    const hook = createClarificationGateHook({
      clarificationGate: { mode: 'auto-for-planning' },
    });
    const output = createOutput('Please build a dashboard for admins.');

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain('<clarification-gate>');
    expect(output.messages[0].parts[0].text).toContain(
      '- planning keywords: build',
    );
    expect(output.messages[0].parts[0].text).toContain(
      '- scope signal — multiple views/pages: dashboard',
    );
  });

  test('injects in auto-for-planning mode for hard complexity threshold without planning keywords', async () => {
    const hook = createClarificationGateHook({
      clarificationGate: { mode: 'auto-for-planning' },
    });
    const output = createOutput(
      'We need a dashboard with an API and database migration across the app.',
    );

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain('<clarification-gate>');
    expect(output.messages[0].parts[0].text).toContain(
      '- scope signal — multiple views/pages: dashboard',
    );
    expect(output.messages[0].parts[0].text).toContain(
      '- scope signal — api/data: api, migration, database',
    );
    expect(output.messages[0].parts[0].text).toContain(
      '- scope signal — cross-directory: across the app',
    );
  });

  test('uses custom explicit keywords from config overrides', async () => {
    const hook = createClarificationGateHook({
      clarificationGate: {
        mode: 'explicit-only',
        explicit_keywords: ['workshop'],
      },
    });
    const output = createOutput('Let us workshop the solution together.');

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain('<clarification-gate>');
    expect(output.messages[0].parts[0].text).toContain(
      '- explicit keywords: workshop',
    );
  });

  test('respects off mode', async () => {
    const hook = createClarificationGateHook({
      clarificationGate: { mode: 'off' },
    });
    const output = createOutput('Can you brainstorm the options?');

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toBe(
      'Can you brainstorm the options?',
    );
  });

  test('skips non-orchestrator sessions', async () => {
    const hook = createClarificationGateHook();
    const output = createOutput('Can you brainstorm the options?', 'explorer');

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toBe(
      'Can you brainstorm the options?',
    );
  });

  test('skips internal notification turns', async () => {
    const hook = createClarificationGateHook();
    const output = createOutput(
      `[Background task "x" completed]\n${LITE_INTERNAL_INITIATOR_MARKER}`,
    );

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain(
      LITE_INTERNAL_INITIATOR_MARKER,
    );
    expect(output.messages[0].parts[0].text).not.toContain(
      '<clarification-gate>',
    );
  });

  test('detects ambiguity from the visible user text after phase reminder', async () => {
    const hook = createClarificationGateHook();
    const output = createOutput(
      `${PHASE_REMINDER}\n\n---\n\nHelp me think through the options`,
    );

    await hook['experimental.chat.messages.transform']({}, output);

    expect(output.messages[0].parts[0].text).toContain('<clarification-gate>');
    expect(output.messages[0].parts[0].text).toContain(
      '- explicit keywords: think through, options',
    );
  });
});
