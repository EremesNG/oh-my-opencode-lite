import type { PluginInput } from '@opencode-ai/plugin';
import { log } from '../utils/logger';

const DEFAULT_THOTH_TIMEOUT_MS = 15_000;
const THOTH_TOOL_PREFIX = 'thoth_mem_';

type OpencodeClient = PluginInput['client'];

type StoreCallArgs = {
  tool: string;
  sessionID?: string;
  args?: Record<string, unknown>;
};

type StoreCallResponse = {
  output?: unknown;
  result?: unknown;
};

type RuntimeStore = {
  call(args: StoreCallArgs): Promise<StoreCallResponse | unknown>;
};

type ClientWithStore = {
  store: RuntimeStore;
};

export interface CreateThothClientOptions {
  client: OpencodeClient | unknown;
  project: string;
  directory?: string;
  timeoutMs?: number;
  enabled?: boolean;
}

export interface ThothClient {
  readonly enabled: boolean;
  memContext(sessionId?: string, limit?: number): Promise<string | null>;
  memSessionStart(sessionId: string): Promise<boolean>;
  memSessionSummary(sessionId: string, content: string): Promise<boolean>;
  memSavePrompt(sessionId: string, content: string): Promise<boolean>;
  memCapturePassive(
    sessionId: string,
    content: string,
    source?: string,
  ): Promise<boolean>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasRuntimeStore(client: unknown): client is ClientWithStore {
  if (!isRecord(client)) {
    return false;
  }

  const { store } = client;
  return isRecord(store) && typeof store.call === 'function';
}

function normalizeStringResult(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidates = [value.output, value.result, value.content, value.text];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  return null;
}

class StoreBackedThothClient implements ThothClient {
  readonly enabled: boolean;
  private readonly timeoutMs: number;

  constructor(private readonly options: CreateThothClientOptions) {
    this.enabled = options.enabled !== false;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_THOTH_TIMEOUT_MS;
  }

  async memContext(sessionId?: string, limit = 10): Promise<string | null> {
    const args: Record<string, unknown> = {
      project: this.options.project,
      scope: 'project',
      limit,
    };
    if (sessionId) {
      args.session_id = sessionId;
    }
    const result = await this.callTool('mem_context', args);

    return normalizeStringResult(result);
  }

  async memSessionStart(sessionId: string): Promise<boolean> {
    const result = await this.callTool('mem_session_start', {
      id: sessionId,
      project: this.options.project,
      directory: this.options.directory,
    });

    return result !== null;
  }

  async memSessionSummary(
    sessionId: string,
    content: string,
  ): Promise<boolean> {
    const result = await this.callTool('mem_session_summary', {
      project: this.options.project,
      session_id: sessionId,
      content,
    });

    return result !== null;
  }

  async memSavePrompt(sessionId: string, content: string): Promise<boolean> {
    const result = await this.callTool('mem_save_prompt', {
      project: this.options.project,
      session_id: sessionId,
      content,
    });

    return result !== null;
  }

  async memCapturePassive(
    sessionId: string,
    content: string,
    source = 'task-tool',
  ): Promise<boolean> {
    const result = await this.callTool('mem_capture_passive', {
      project: this.options.project,
      session_id: sessionId,
      source,
      content,
    });

    return result !== null;
  }

  private async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<StoreCallResponse | unknown | null> {
    if (!this.enabled) {
      return null;
    }

    const { client } = this.options;
    if (!hasRuntimeStore(client)) {
      log('[thoth] OpenCode Store unavailable', { toolName });
      return null;
    }

    const tool = `${THOTH_TOOL_PREFIX}${toolName}`;

    try {
      return await Promise.race([
        client.store.call({
          tool,
          args,
          sessionID:
            typeof args.session_id === 'string' ? args.session_id : undefined,
        }),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), this.timeoutMs);
        }),
      ]);
    } catch (error) {
      log('[thoth] tool call unavailable', {
        tool,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

export function createThothClient(
  options: CreateThothClientOptions,
): ThothClient {
  return new StoreBackedThothClient(options);
}
