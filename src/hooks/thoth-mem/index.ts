import type { PluginInput } from '@opencode-ai/plugin';
import type { Event, Message, Model, Part, Session } from '@opencode-ai/sdk';
import type { ThothConfig } from '../../config';
import { createThothClient } from '../../thoth';
import { log } from '../../utils/logger';
import { FIRST_ACTION_INSTRUCTION, MEMORY_INSTRUCTIONS } from './protocol';

const PASSIVE_LEARNINGS_PATTERN =
  /##\s*(Key Learnings|Aprendizajes Clave)\s*:/i;

type OpencodeClient = PluginInput['client'];

export interface CreateThothMemHookOptions {
  client: OpencodeClient;
  project: string;
  directory?: string;
  thoth?: ThothConfig;
  enabled?: boolean;
}

function isTextPart(part: Part): part is Extract<Part, { type: 'text' }> {
  return part.type === 'text';
}

function extractPromptText(parts: Part[]): string | null {
  const text = parts
    .filter(isTextPart)
    .map((part) => part.text.trim())
    .filter((part) => part.length > 0)
    .join('\n\n');

  return text.length > 0 ? text : null;
}

function isRootSession(session: Session): boolean {
  return !session.parentID;
}

function appendInstruction(target: string, instruction: string): string {
  if (target.includes(instruction)) {
    return target;
  }

  return `${target}\n\n${instruction}`;
}

export function createThothMemHook(options: CreateThothMemHookOptions) {
  const enabled = options.enabled !== false;
  const thoth = createThothClient({
    client: options.client,
    project: options.project,
    directory: options.directory,
    timeoutMs: options.thoth?.timeout,
    enabled,
  });

  const trackedRootSessions = new Set<string>();
  const capturedPromptIdsBySession = new Map<string, Set<string>>();

  async function handleSessionCreated(session: Session): Promise<void> {
    if (!enabled || !isRootSession(session)) {
      return;
    }

    trackedRootSessions.add(session.id);
    await thoth.memSessionStart(session.id);
  }

  function handleSessionDeleted(session: Session): void {
    trackedRootSessions.delete(session.id);
    capturedPromptIdsBySession.delete(session.id);
  }

  async function handleMessageUpdated(message: Message): Promise<void> {
    if (!enabled || message.role !== 'user') {
      return;
    }

    if (!trackedRootSessions.has(message.sessionID)) {
      return;
    }

    const existing = capturedPromptIdsBySession.get(message.sessionID);
    if (existing?.has(message.id)) {
      return;
    }

    try {
      const response = await options.client.session.message({
        path: {
          id: message.sessionID,
          messageID: message.id,
        },
      });
      const promptText = response.data
        ? extractPromptText(response.data.parts)
        : null;

      if (!promptText) {
        return;
      }

      const ids = existing ?? new Set<string>();
      ids.add(message.id);
      capturedPromptIdsBySession.set(message.sessionID, ids);
      await thoth.memSavePrompt(message.sessionID, promptText);
    } catch (error) {
      log('[thoth-hook] prompt capture unavailable', {
        sessionID: message.sessionID,
        messageID: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    event: async ({ event }: { event: Event }): Promise<void> => {
      switch (event.type) {
        case 'session.created':
          await handleSessionCreated(event.properties.info);
          break;
        case 'message.updated':
          await handleMessageUpdated(event.properties.info);
          break;
        case 'session.deleted':
          handleSessionDeleted(event.properties.info);
          break;
      }
    },

    'experimental.chat.system.transform': async (
      input: { sessionID?: string; model: Model },
      output: { system: string[] },
    ): Promise<void> => {
      void input.model;

      if (!enabled || !input.sessionID) {
        return;
      }

      if (!trackedRootSessions.has(input.sessionID)) {
        return;
      }

      if (output.system.length === 0) {
        output.system.push(MEMORY_INSTRUCTIONS);
        return;
      }

      const lastIndex = output.system.length - 1;
      output.system[lastIndex] = appendInstruction(
        output.system[lastIndex],
        MEMORY_INSTRUCTIONS,
      );
    },

    'experimental.session.compacting': async (
      input: { sessionID: string },
      output: { context: string[]; prompt?: string },
    ): Promise<void> => {
      void output.prompt;

      if (!enabled || !trackedRootSessions.has(input.sessionID)) {
        return;
      }

      output.context.push(FIRST_ACTION_INSTRUCTION);

      const memoryContext = await thoth.memContext(input.sessionID);
      if (memoryContext) {
        output.context.push(memoryContext);
      }
    },

    'tool.execute.after': async (
      input: {
        tool: string;
        sessionID: string;
        callID: string;
        args: unknown;
      },
      output: {
        title: string;
        output: string;
        metadata: unknown;
      },
    ): Promise<void> => {
      void input.callID;
      void input.args;
      void output.title;
      void output.metadata;

      if (!enabled) {
        return;
      }

      if (input.tool.toLowerCase() !== 'task') {
        return;
      }

      if (!trackedRootSessions.has(input.sessionID)) {
        return;
      }

      if (!PASSIVE_LEARNINGS_PATTERN.test(output.output)) {
        return;
      }

      await thoth.memCapturePassive(
        input.sessionID,
        output.output,
        'task-tool',
      );
    },
  };
}
