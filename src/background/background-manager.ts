/**
 * Background Task Manager
 *
 * Manages long-running AI agent tasks that execute in separate sessions.
 * Background tasks run independently from the main conversation flow, allowing
 * the user to continue working while tasks complete asynchronously.
 *
 * Key features:
 * - Fire-and-forget launch (returns task_id immediately)
 * - Creates isolated sessions for background work
 * - Event-driven completion detection via session.status
 * - Start queue with configurable concurrency limit
 * - Supports task cancellation and result retrieval
 */

import path from 'node:path';
import type { PluginInput } from '@opencode-ai/plugin';
import type {
  PermissionActionConfig,
  PermissionConfig,
  PermissionRuleConfig,
  PermissionRuleset,
  SessionCreateData,
} from '@opencode-ai/sdk/v2';
import type { BackgroundTaskConfig, PluginConfig } from '../config';
import {
  BACKGROUND_TASK_TIMEOUT_MS,
  SUBAGENT_DELEGATION_RULES,
} from '../config';
import type { TmuxConfig } from '../config/schema';
import type {
  DelegationManager,
  PersistedDelegationRecord,
} from '../delegation';
import {
  applyAgentVariant,
  createInternalAgentTextPart,
  resolveAgentVariant,
} from '../utils';
import { log } from '../utils/logger';

type LegacyToolConfig = Record<string, boolean>;

type ModelReference = { providerID: string; modelID: string };

type SessionPromptContext = {
  model?: ModelReference;
  variant?: string;
};

function resolveProjectName(project: unknown, directory: string): string {
  const runtimeProjectName =
    typeof project === 'object' &&
    project !== null &&
    'name' in project &&
    typeof project.name === 'string' &&
    project.name.trim().length > 0
      ? project.name.trim()
      : undefined;

  return runtimeProjectName || path.basename(directory) || 'project';
}

type PromptBody = {
  messageID?: string;
  model?: ModelReference;
  agent?: string;
  noReply?: boolean;
  system?: string;
  tools?: LegacyToolConfig;
  parts: Array<{ type: 'text'; text: string }>;
  variant?: string;
  // The plugin client still exposes pre-v2 prompt typings, so we attach the
  // v2 permission field locally and keep the legacy tools fallback below.
  permission?: PermissionConfig;
};

type SessionCreateBody = NonNullable<SessionCreateData['body']>;

type DelegationPermissionPayload = {
  permission: PermissionConfig;
  ruleset: PermissionRuleset;
  legacyTools: LegacyToolConfig;
};

type OpencodeClient = PluginInput['client'];

export const BACKGROUND_CAPABLE_AGENTS = ['explorer', 'librarian'] as const;
export type BackgroundCapableAgent = (typeof BACKGROUND_CAPABLE_AGENTS)[number];
export type BackgroundTaskStatus =
  | 'pending'
  | 'starting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

const DEFAULT_DELEGATION_SUMMARY_LIMIT = 5;
const ANY_PERMISSION_PATTERN = '*';
const TASK_PERMISSION = 'task';
const BACKGROUND_TASK_PERMISSION = 'background_task';
const BACKGROUND_OUTPUT_PERMISSION = 'background_output';
const BACKGROUND_CANCEL_PERMISSION = 'background_cancel';

function generateFallbackTaskId(): string {
  return `bg_${Math.random().toString(36).substring(2, 10)}`;
}

function normalizeSummary(text: string, maxLength = 160): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return '(No output)';
  }

  const collapsed = firstLine.replace(/\s+/g, ' ');
  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, maxLength - 1)}…`;
}

function formatDelegationDigestLine(
  id: string,
  agent: string,
  title: string,
  summary: string,
): string {
  const normalizedTitle = title.trim().length > 0 ? title.trim() : id;
  const normalizedSummary = summary.trim();
  return `- ${id} (@${agent}) ${normalizedTitle}${
    normalizedSummary.length > 0 ? ` — ${normalizedSummary}` : ''
  }`;
}

function parseModelReference(model: string): {
  providerID: string;
  modelID: string;
} | null {
  const slashIndex = model.indexOf('/');
  if (slashIndex <= 0 || slashIndex >= model.length - 1) {
    return null;
  }

  return {
    providerID: model.slice(0, slashIndex),
    modelID: model.slice(slashIndex + 1),
  };
}

/**
 * Represents a background task running in an isolated session.
 * Tasks are tracked from creation through completion or failure.
 */
export interface BackgroundTask {
  id: string; // Unique task identifier (e.g., "bg_abc123")
  sessionId?: string; // OpenCode session ID (set when starting)
  rootSessionId: string; // Root session ID used for delegation persistence
  description: string; // Human-readable task description
  agent: string; // Agent name handling the task
  status: BackgroundTaskStatus;
  result?: string; // Final output from the agent (when completed)
  error?: string; // Error message (when failed)
  persistencePath?: string; // Delegation persistence path when available
  persistenceError?: string; // Persistence failure details when unavailable
  config: BackgroundTaskConfig; // Task configuration
  parentSessionId: string; // Parent session ID for notifications
  parentModel?: ModelReference; // Parent session model to preserve on notification
  parentVariant?: string; // Parent session variant to preserve on notification
  startedAt: Date; // Task creation timestamp
  completedAt?: Date; // Task completion/failure timestamp
  prompt: string; // Initial prompt
  _abortingForTimeout?: boolean; // Internal flag to suppress timeout-abort idle races
}

/**
 * Options for launching a new background task.
 */
export interface LaunchOptions {
  agent: string; // Agent to handle the task
  prompt: string; // Initial prompt to send to the agent
  description: string; // Human-readable task description
  parentSessionId: string; // Parent session ID for task hierarchy
  parentModel?: ModelReference;
  parentVariant?: string;
}

export class BackgroundTaskManager {
  private tasks = new Map<string, BackgroundTask>();
  private tasksBySessionId = new Map<string, string>();
  // Track which agent type owns each session for delegation permission checks
  private agentBySessionId = new Map<string, string>();
  private client: OpencodeClient;
  private directory: string;
  private worktreeDirectory: string;
  private tmuxEnabled: boolean;
  private config?: PluginConfig;
  private backgroundConfig: BackgroundTaskConfig;
  private delegationManager?: DelegationManager;
  private readonly projectName: string;

  // Start queue
  private startQueue: BackgroundTask[] = [];
  private activeStarts = 0;
  private maxConcurrentStarts: number;

  // Completion waiting
  private completionResolvers = new Map<
    string,
    (task: BackgroundTask) => void
  >();

  constructor(
    ctx: PluginInput,
    tmuxConfig?: TmuxConfig,
    config?: PluginConfig,
    delegationManager?: DelegationManager,
    worktreeDirectory?: string,
    private readonly getSessionContext?:
      | ((sessionId: string) => SessionPromptContext | undefined)
      | undefined,
  ) {
    this.client = ctx.client;
    this.directory = ctx.directory;
    this.worktreeDirectory = worktreeDirectory ?? ctx.directory;
    this.projectName = resolveProjectName(ctx.project, this.worktreeDirectory);
    this.tmuxEnabled = tmuxConfig?.enabled ?? false;
    this.config = config;
    this.delegationManager = delegationManager;
    this.backgroundConfig = {
      maxConcurrentStarts: config?.background?.maxConcurrentStarts ?? 10,
      timeoutMs: config?.background?.timeoutMs ?? BACKGROUND_TASK_TIMEOUT_MS,
    };
    this.maxConcurrentStarts = this.backgroundConfig.maxConcurrentStarts;
  }

  private resolveRootSessionId(sessionId: string): string {
    const taskId = this.tasksBySessionId.get(sessionId);
    if (!taskId) {
      return sessionId;
    }

    return this.tasks.get(taskId)?.rootSessionId ?? sessionId;
  }

  private async createTaskId(rootSessionId: string): Promise<string> {
    if (!this.delegationManager) {
      let candidate = generateFallbackTaskId();
      const activeTaskIds = new Set(this.getActiveTaskIds(rootSessionId));
      while (activeTaskIds.has(candidate)) {
        candidate = generateFallbackTaskId();
      }
      return candidate;
    }

    try {
      return await this.delegationManager.createTaskId(rootSessionId);
    } catch (error) {
      log(
        '[background-manager] delegation id generation failed; using fallback',
        {
          rootSessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      let candidate = generateFallbackTaskId();
      const activeTaskIds = new Set(this.getActiveTaskIds(rootSessionId));
      while (activeTaskIds.has(candidate)) {
        candidate = generateFallbackTaskId();
      }
      return candidate;
    }
  }

  private buildDelegationSummary(task: BackgroundTask): string {
    return normalizeSummary(task.result ?? '');
  }

  private async persistCompletedTask(task: BackgroundTask): Promise<void> {
    if (!this.delegationManager || task.status !== 'completed') {
      return;
    }

    try {
      const persistedRecord = await this.delegationManager.persist({
        rootSessionId: task.rootSessionId,
        record: {
          id: task.id,
          agent: task.agent,
          status: 'complete',
          title: task.description,
          summary: this.buildDelegationSummary(task),
          startedAt: task.startedAt.toISOString(),
          completedAt: task.completedAt?.toISOString() ?? null,
          content: task.result ?? '(No output)',
        },
      });

      if (!persistedRecord) {
        task.persistenceError = 'Persistent delegation storage unavailable';
        log('[background-manager] delegation persistence unavailable', {
          taskId: task.id,
          rootSessionId: task.rootSessionId,
        });
        return;
      }

      task.persistencePath = persistedRecord.path;
      task.persistenceError = undefined;
    } catch (error) {
      task.persistenceError = 'Persistent delegation storage unavailable';
      log('[background-manager] delegation persistence failed', {
        taskId: task.id,
        rootSessionId: task.rootSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Look up the delegation rules for an agent type.
   * Unknown agent types default to explorer-only access, making it easy
   * to add new background agent types without updating SUBAGENT_DELEGATION_RULES.
   */
  private getSubagentRules(agentName: string): readonly string[] {
    return (
      SUBAGENT_DELEGATION_RULES[
        agentName as keyof typeof SUBAGENT_DELEGATION_RULES
      ] ?? ['explorer']
    );
  }

  /**
   * Check if a parent session is allowed to delegate to a specific agent type.
   * @param parentSessionId - The session ID of the parent
   * @param requestedAgent - The agent type being requested
   * @returns true if allowed, false if not
   */
  isAgentAllowed(parentSessionId: string, requestedAgent: string): boolean {
    // Untracked sessions are the root orchestrator (created by OpenCode, not by us)
    const parentAgentName =
      this.agentBySessionId.get(parentSessionId) ?? 'orchestrator';

    const allowedSubagents = this.getSubagentRules(parentAgentName);

    if (allowedSubagents.length === 0) return false;

    return allowedSubagents.includes(requestedAgent);
  }

  /**
   * Get the list of allowed subagents for a parent session.
   * @param parentSessionId - The session ID of the parent
   * @returns Array of allowed agent names, empty if none
   */
  getAllowedSubagents(parentSessionId: string): readonly string[] {
    // Untracked sessions are the root orchestrator (created by OpenCode, not by us)
    const parentAgentName =
      this.agentBySessionId.get(parentSessionId) ?? 'orchestrator';

    return this.getSubagentRules(parentAgentName);
  }

  isBackgroundCapableAgent(
    agentName: string,
  ): agentName is BackgroundCapableAgent {
    return (BACKGROUND_CAPABLE_AGENTS as readonly string[]).includes(agentName);
  }

  getBackgroundCapableAgents(): readonly BackgroundCapableAgent[] {
    return BACKGROUND_CAPABLE_AGENTS;
  }

  getActiveTaskIds(rootSessionId: string): string[] {
    return Array.from(this.tasks.values())
      .filter((task) => task.rootSessionId === rootSessionId)
      .map((task) => task.id);
  }

  private createTaskRecord(
    opts: LaunchOptions,
    taskId: string,
    rootSessionId: string,
  ): BackgroundTask {
    return {
      id: taskId,
      sessionId: undefined,
      rootSessionId,
      description: opts.description,
      agent: opts.agent,
      status: 'pending',
      startedAt: new Date(),
      config: {
        maxConcurrentStarts: this.maxConcurrentStarts,
        timeoutMs: this.backgroundConfig.timeoutMs,
      },
      parentSessionId: opts.parentSessionId,
      parentModel: opts.parentModel,
      parentVariant: opts.parentVariant,
      prompt: opts.prompt,
    };
  }

  private registerLaunchedTask(task: BackgroundTask): BackgroundTask {
    this.tasks.set(task.id, task);

    // Queue task for background start
    this.enqueueStart(task);

    log(`[background-manager] task launched: ${task.id}`, {
      agent: task.agent,
      description: task.description,
      rootSessionId: task.rootSessionId,
    });

    return task;
  }

  /**
   * Launch a new background task (fire-and-forget).
   *
   * Phase A (sync): Creates task record and returns immediately.
   * Phase B (async): Session creation and prompt sending happen in background.
   *
   * @param opts - Task configuration options
   * @returns The created background task with pending status
   */
  launch(opts: LaunchOptions): BackgroundTask {
    const rootSessionId = this.resolveRootSessionId(opts.parentSessionId);
    return this.registerLaunchedTask(
      this.createTaskRecord(opts, generateFallbackTaskId(), rootSessionId),
    );
  }

  async launchBackgroundTask(opts: LaunchOptions): Promise<BackgroundTask> {
    if (!this.isBackgroundCapableAgent(opts.agent)) {
      throw new Error(
        `Agent '${opts.agent}' is not background-capable. Allowed agents: ${BACKGROUND_CAPABLE_AGENTS.join(', ')}`,
      );
    }

    const rootSessionId = this.resolveRootSessionId(opts.parentSessionId);
    const parentSessionContext = this.getSessionContext?.(opts.parentSessionId);
    const launchOptions: LaunchOptions = {
      ...opts,
      parentModel: opts.parentModel ?? parentSessionContext?.model,
      parentVariant: opts.parentVariant ?? parentSessionContext?.variant,
    };
    const task = this.createTaskRecord(
      launchOptions,
      await this.createTaskId(rootSessionId),
      rootSessionId,
    );
    return this.registerLaunchedTask(task);
  }

  /**
   * Enqueue task for background start.
   */
  private enqueueStart(task: BackgroundTask): void {
    this.startQueue.push(task);
    this.processQueue();
  }

  /**
   * Process start queue with concurrency limit.
   */
  private processQueue(): void {
    while (
      this.activeStarts < this.maxConcurrentStarts &&
      this.startQueue.length > 0
    ) {
      const task = this.startQueue.shift();
      if (!task) break;
      this.startTask(task);
    }
  }

  private resolveFallbackChain(agentName: string): string[] {
    const fallback = this.config?.fallback;
    const chains = fallback?.chains as
      | Record<string, string[] | undefined>
      | undefined;
    const configuredChain = chains?.[agentName] ?? [];
    const primary = this.config?.agents?.[agentName]?.model;

    const chain: string[] = [];
    const seen = new Set<string>();

    // primary may be a string, an array of string|{id,variant?}, or undefined
    let primaryIds: string[];
    if (Array.isArray(primary)) {
      primaryIds = primary.map((m) => (typeof m === 'string' ? m : m.id));
    } else if (typeof primary === 'string') {
      primaryIds = [primary];
    } else {
      primaryIds = [];
    }
    for (const model of [...primaryIds, ...configuredChain]) {
      if (!model || seen.has(model)) continue;
      seen.add(model);
      chain.push(model);
    }

    return chain;
  }

  private async promptWithTimeout(
    args: Parameters<OpencodeClient['session']['prompt']>[0],
    timeoutMs: number,
    onTimeout?: () => void,
  ): Promise<void> {
    // No timeout when fallback disabled (timeoutMs = 0)
    if (timeoutMs <= 0) {
      await this.client.session.prompt(args);
      return;
    }

    const sessionId = args.path.id;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      // Attach a no-op .catch() so that when the timeout fires and
      // session.abort() causes the prompt to reject after the race has
      // already settled, the late rejection does not become unhandled
      // (which would crash the process in Node ≥15 / Bun).
      const promptPromise = this.client.session.prompt(args);
      promptPromise.catch(() => {});

      await Promise.race([
        promptPromise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            onTimeout?.();
            // Abort the running prompt so the session is no longer busy.
            // Without this, session.prompt() continues running server-side
            // and blocks subsequent fallback attempts on the same session.
            this.client.session
              .abort({ path: { id: sessionId } })
              .catch(() => {});
            reject(new Error(`Prompt timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private createPatternPermission(
    allowedPatterns: readonly string[],
  ): PermissionRuleConfig {
    if (allowedPatterns.length === 0) {
      return 'deny';
    }

    const permission: Record<string, PermissionActionConfig> =
      Object.fromEntries(
        allowedPatterns.map((pattern) => [pattern, 'allow' as const]),
      );
    permission[ANY_PERMISSION_PATTERN] = 'deny';
    return permission;
  }

  private createPatternRuleset(
    permission: string,
    allowedPatterns: readonly string[],
  ): PermissionRuleset {
    if (allowedPatterns.length === 0) {
      return [
        {
          permission,
          pattern: ANY_PERMISSION_PATTERN,
          action: 'deny',
        },
      ];
    }

    return [
      ...allowedPatterns.map((pattern) => ({
        permission,
        pattern,
        action: 'allow' as const,
      })),
      {
        permission,
        pattern: ANY_PERMISSION_PATTERN,
        action: 'deny' as const,
      },
    ];
  }

  /**
   * Calculate delegation permissions for a spawned agent based on its own
   * delegation rules.
   *
   * The permission payload is the primary control for child sessions. Legacy
   * `tools` flags remain as a backward-compatible fallback because the plugin
   * client still exposes pre-v2 prompt typings.
   *
   * @param agentName - The agent type being spawned
   * @returns Permission payload plus legacy tool toggles for compatibility
   */
  private calculateDelegationPermissions(
    agentName: string,
  ): DelegationPermissionPayload {
    const allowedSubagents = this.getSubagentRules(agentName);
    const allowedBackgroundSubagents = allowedSubagents.filter((subagent) =>
      this.isBackgroundCapableAgent(subagent),
    );
    const canManageBackgroundTasks = allowedBackgroundSubagents.length > 0;

    const permission = {
      [TASK_PERMISSION]: this.createPatternPermission(allowedSubagents),
      [BACKGROUND_TASK_PERMISSION]: this.createPatternPermission(
        allowedBackgroundSubagents,
      ),
      [BACKGROUND_OUTPUT_PERMISSION]: canManageBackgroundTasks
        ? 'allow'
        : 'deny',
      [BACKGROUND_CANCEL_PERMISSION]: canManageBackgroundTasks
        ? 'allow'
        : 'deny',
    } satisfies Record<string, PermissionRuleConfig | PermissionActionConfig>;

    return {
      permission,
      ruleset: [
        ...this.createPatternRuleset(TASK_PERMISSION, allowedSubagents),
        ...this.createPatternRuleset(
          BACKGROUND_TASK_PERMISSION,
          allowedBackgroundSubagents,
        ),
        {
          permission: BACKGROUND_OUTPUT_PERMISSION,
          pattern: ANY_PERMISSION_PATTERN,
          action: canManageBackgroundTasks ? 'allow' : 'deny',
        },
        {
          permission: BACKGROUND_CANCEL_PERMISSION,
          pattern: ANY_PERMISSION_PATTERN,
          action: canManageBackgroundTasks ? 'allow' : 'deny',
        },
      ],
      legacyTools: {
        [TASK_PERMISSION]: allowedSubagents.length > 0,
        [BACKGROUND_TASK_PERMISSION]: canManageBackgroundTasks,
        [BACKGROUND_OUTPUT_PERMISSION]: canManageBackgroundTasks,
        [BACKGROUND_CANCEL_PERMISSION]: canManageBackgroundTasks,
      },
    };
  }

  /**
   * Start a task in the background (Phase B).
   */
  private async startTask(task: BackgroundTask): Promise<void> {
    task.status = 'starting';
    this.activeStarts++;

    // Check if cancelled after incrementing activeStarts (to catch race)
    // Use type assertion since cancel() can change status during race condition
    if ((task as BackgroundTask & { status: string }).status === 'cancelled') {
      this.completeTask(task, 'cancelled', 'Task cancelled before start');
      return;
    }

    try {
      const delegationPermissions = this.calculateDelegationPermissions(
        task.agent,
      );

      // Create session
      const session = await this.client.session.create({
        body: {
          parentID: task.parentSessionId,
          title: `Background: ${task.description}`,
          permission: delegationPermissions.ruleset,
        } as SessionCreateBody,
        query: { directory: this.worktreeDirectory },
      });

      if (!session.data?.id) {
        throw new Error('Failed to create background session');
      }

      task.sessionId = session.data.id;
      this.tasksBySessionId.set(session.data.id, task.id);
      // Track the agent type for this session for delegation checks
      this.agentBySessionId.set(session.data.id, task.agent);
      task.status = 'running';

      // Give TmuxSessionManager time to spawn the pane
      if (this.tmuxEnabled) {
        await new Promise((r) => setTimeout(r, 500));
      }

      // Send prompt
      const promptQuery: Record<string, string> = {
        directory: this.worktreeDirectory,
      };
      const resolvedVariant = resolveAgentVariant(this.config, task.agent);
      const basePromptBody = applyAgentVariant(resolvedVariant, {
        agent: task.agent,
        permission: delegationPermissions.permission,
        tools: delegationPermissions.legacyTools,
        parts: [
          {
            type: 'text' as const,
            text: `${task.prompt}\n\n## Orchestrator Session Context\n- session_id: ${task.rootSessionId}\n- project: ${this.projectName}\n\nUse these values for ALL thoth-mem tool calls.`,
          },
        ],
      } as PromptBody) as unknown as PromptBody;

      const fallbackEnabled = this.config?.fallback?.enabled ?? true;
      const backgroundTimeoutMs =
        this.backgroundConfig.timeoutMs ?? BACKGROUND_TASK_TIMEOUT_MS;
      const timeoutMs = fallbackEnabled ? backgroundTimeoutMs : 0;
      const retryDelayMs = this.config?.fallback?.retryDelayMs ?? 500;
      const chain = fallbackEnabled
        ? this.resolveFallbackChain(task.agent)
        : [];
      const attemptModels = chain.length > 0 ? chain : [undefined];

      const errors: string[] = [];
      let succeeded = false;
      const sessionId = session.data.id;

      for (let i = 0; i < attemptModels.length; i++) {
        const model = attemptModels[i];
        const modelLabel = model ?? 'default-model';
        try {
          const body: PromptBody = {
            ...basePromptBody,
            model: undefined,
          };

          if (model) {
            const ref = parseModelReference(model);
            if (!ref) {
              throw new Error(`Invalid fallback model format: ${model}`);
            }
            body.model = ref;
          }

          if (i > 0) {
            log(
              `[background-manager] fallback attempt ${i + 1}/${attemptModels.length}: ${modelLabel}`,
              { taskId: task.id },
            );
          }

          task._abortingForTimeout = false;
          await this.promptWithTimeout(
            {
              path: { id: sessionId },
              body,
              query: promptQuery,
            },
            timeoutMs,
            () => {
              task._abortingForTimeout = true;
            },
          );
          task._abortingForTimeout = false;

          succeeded = true;
          break;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          const timedOut = msg.includes('Prompt timed out after');

          if (!timedOut) {
            task._abortingForTimeout = false;
          }

          errors.push(`${modelLabel}: ${msg}`);
          log(`[background-manager] model failed: ${modelLabel} — ${msg}`, {
            taskId: task.id,
          });

          // Abort the session before trying the next model.
          // The previous prompt may still be running server-side;
          // without aborting, the session stays busy and rejects
          // subsequent prompts, breaking the entire fallback chain.
          if (i < attemptModels.length - 1) {
            try {
              await this.client.session.abort({
                path: { id: sessionId },
              });
              // Allow server time to finalize the abort before
              // the next prompt attempt (matches reference impl).
              await new Promise((r) => setTimeout(r, retryDelayMs));
            } catch {
              // Session may already be idle; safe to ignore.
            }
          }
        }
      }

      if (!succeeded) {
        throw new Error(`All fallback models failed. ${errors.join(' | ')}`);
      }

      log(`[background-manager] task started: ${task.id}`, {
        sessionId: session.data.id,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.completeTask(task, 'failed', errorMessage);
    } finally {
      this.activeStarts--;
      this.processQueue();
    }
  }

  /**
   * Handle session.status events for completion detection.
   * Uses session.status instead of deprecated session.idle.
   */
  async handleSessionStatus(event: {
    type: string;
    properties?: { sessionID?: string; status?: { type: string } };
  }): Promise<void> {
    if (event.type !== 'session.status') return;

    const sessionId = event.properties?.sessionID;
    if (!sessionId) return;

    const taskId = this.tasksBySessionId.get(sessionId);
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') return;
    if (task._abortingForTimeout) return;

    // Check if session is idle (completed)
    if (event.properties?.status?.type === 'idle') {
      await this.extractAndCompleteTask(task);
    }
  }

  /**
   * Handle session.deleted events for cleanup.
   * When a session is deleted, cancel associated tasks and clean up.
   */
  async handleSessionDeleted(event: {
    type: string;
    properties?: { info?: { id?: string }; sessionID?: string };
  }): Promise<void> {
    if (event.type !== 'session.deleted') return;

    const sessionId = event.properties?.info?.id ?? event.properties?.sessionID;
    if (!sessionId) return;

    const taskId = this.tasksBySessionId.get(sessionId);
    if (!taskId) return;

    const task = this.tasks.get(taskId);
    if (!task) return;

    // Only handle if task is still active
    if (task.status === 'running' || task.status === 'pending') {
      log(`[background-manager] Session deleted, cancelling task: ${task.id}`);

      // Mark as cancelled
      (task as BackgroundTask & { status: string }).status = 'cancelled';
      task.completedAt = new Date();
      task.error = 'Session deleted';

      // Clean up session tracking
      this.tasksBySessionId.delete(sessionId);
      this.agentBySessionId.delete(sessionId);

      // Resolve any waiting callers
      const resolver = this.completionResolvers.get(taskId);
      if (resolver) {
        resolver(task);
        this.completionResolvers.delete(taskId);
      }

      log(
        `[background-manager] Task cancelled due to session deletion: ${task.id}`,
      );
    }
  }

  /**
   * Extract task result and mark complete.
   */
  private async extractAndCompleteTask(task: BackgroundTask): Promise<void> {
    if (!task.sessionId) return;

    try {
      const messagesResult = await this.client.session.messages({
        path: { id: task.sessionId },
      });
      const messages = (messagesResult.data ?? []) as Array<{
        info?: { role: string };
        parts?: Array<{ type: string; text?: string }>;
      }>;
      const assistantMessages = messages.filter(
        (m) => m.info?.role === 'assistant',
      );

      const extractedContent: string[] = [];
      for (const message of assistantMessages) {
        for (const part of message.parts ?? []) {
          if (
            (part.type === 'text' || part.type === 'reasoning') &&
            part.text
          ) {
            extractedContent.push(part.text);
          }
        }
      }

      const responseText = extractedContent
        .filter((t) => t.length > 0)
        .join('\n\n');

      if (responseText) {
        this.completeTask(task, 'completed', responseText);
      } else {
        this.completeTask(task, 'completed', '(No output)');
      }
    } catch (error) {
      this.completeTask(
        task,
        'failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Complete a task and notify waiting callers.
   */
  private completeTask(
    task: BackgroundTask,
    status: 'completed' | 'failed' | 'cancelled',
    resultOrError: string,
  ): void {
    // Don't check for 'cancelled' here - cancel() may set status before calling
    if (task.status === 'completed' || task.status === 'failed') {
      return; // Already completed
    }

    task.status = status;
    task.completedAt = new Date();
    task._abortingForTimeout = false;

    if (status === 'completed') {
      task.result = resultOrError;
      void this.persistCompletedTask(task);
    } else {
      task.error = resultOrError;
    }

    // Clean up session tracking maps as fallback
    // (handleSessionDeleted also does this when session.deleted event fires)
    if (task.sessionId) {
      this.tasksBySessionId.delete(task.sessionId);
      this.agentBySessionId.delete(task.sessionId);
    }

    // Abort session to trigger pane cleanup and free resources
    if (task.sessionId) {
      this.client.session
        .abort({
          path: { id: task.sessionId },
        })
        .catch(() => {});
    }

    // Send notification to parent session
    if (task.parentSessionId) {
      this.sendCompletionNotification(task).catch((err) => {
        log(`[background-manager] notification failed: ${err}`);
      });
    }

    // Resolve waiting callers
    const resolver = this.completionResolvers.get(task.id);
    if (resolver) {
      resolver(task);
      this.completionResolvers.delete(task.id);
    }

    log(`[background-manager] task ${status}: ${task.id}`, {
      description: task.description,
    });
  }

  /**
   * Send completion notification to parent session.
   */
  private async sendCompletionNotification(
    task: BackgroundTask,
  ): Promise<void> {
    const message =
      task.status === 'completed'
        ? `[Background task "${task.description}" completed]`
        : `[Background task "${task.description}" failed: ${task.error}]`;

    const body: PromptBody = {
      parts: [createInternalAgentTextPart(message)],
    };

    if (task.parentModel) {
      body.model = task.parentModel;
    }

    if (task.parentVariant) {
      // TODO: remove cast when @opencode-ai/sdk types include variant field
      (body as PromptBody & { variant?: string }).variant = task.parentVariant;
    }

    await this.client.session.prompt({
      path: { id: task.parentSessionId },
      body,
    });
  }

  /**
   * Retrieve the current state of a background task.
   *
   * @param taskId - The task ID to retrieve
   * @returns The task object, or null if not found
   */
  getResult(taskId: string): BackgroundTask | null {
    return this.tasks.get(taskId) ?? null;
  }

  async readDelegation(
    taskId: string,
    sessionId: string,
  ): Promise<PersistedDelegationRecord | null> {
    if (!this.delegationManager) {
      return null;
    }

    const rootSessionId = this.resolveRootSessionId(sessionId);
    const record = await this.delegationManager.read(taskId, rootSessionId);
    if (record?.header.status !== 'complete') {
      return null;
    }

    return record;
  }

  async getDelegationSummary(
    sessionId: string,
    limit = DEFAULT_DELEGATION_SUMMARY_LIMIT,
  ): Promise<string | null> {
    const rootSessionId = this.resolveRootSessionId(sessionId);

    if (this.delegationManager) {
      try {
        const persistedSummary =
          await this.delegationManager.summarizeForInjection(
            rootSessionId,
            limit,
          );
        if (persistedSummary) {
          return persistedSummary;
        }
      } catch (error) {
        log('[background-manager] delegation summary unavailable', {
          rootSessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const completedTasks = Array.from(this.tasks.values())
      .filter(
        (task) =>
          task.rootSessionId === rootSessionId && task.status === 'completed',
      )
      .sort(
        (left, right) =>
          (right.completedAt?.getTime() ?? 0) -
          (left.completedAt?.getTime() ?? 0),
      )
      .slice(0, Math.max(limit, 1));

    if (completedTasks.length === 0) {
      return null;
    }

    return [
      '## Delegation Digest',
      ...completedTasks.map((task) =>
        formatDelegationDigestLine(
          task.id,
          task.agent,
          task.description,
          this.buildDelegationSummary(task),
        ),
      ),
    ].join('\n');
  }

  /**
   * Wait for a task to complete.
   *
   * @param taskId - The task ID to wait for
   * @param timeout - Maximum time to wait in milliseconds (0 = no timeout)
   * @returns The completed task, or null if not found/timeout
   */
  async waitForCompletion(
    taskId: string,
    timeout = 0,
  ): Promise<BackgroundTask | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (
      task.status === 'completed' ||
      task.status === 'failed' ||
      task.status === 'cancelled'
    ) {
      return task;
    }

    return new Promise((resolve) => {
      const resolver = (t: BackgroundTask) => resolve(t);
      this.completionResolvers.set(taskId, resolver);

      if (timeout > 0) {
        setTimeout(() => {
          this.completionResolvers.delete(taskId);
          resolve(this.tasks.get(taskId) ?? null);
        }, timeout);
      }
    });
  }

  /**
   * Cancel one or all running background tasks.
   *
   * @param taskId - Optional task ID to cancel. If omitted, cancels all pending/running tasks.
   * @returns Number of tasks cancelled
   */
  cancel(taskId?: string): number {
    if (taskId) {
      const task = this.tasks.get(taskId);
      if (
        task &&
        (task.status === 'pending' ||
          task.status === 'starting' ||
          task.status === 'running')
      ) {
        // Clean up any waiting resolver
        this.completionResolvers.delete(taskId);

        // Check if in start queue (must check before marking cancelled)
        const inStartQueue = task.status === 'pending';

        // Mark as cancelled FIRST to prevent race with startTask
        // Use type assertion since we're deliberately changing status before completeTask
        (task as BackgroundTask & { status: string }).status = 'cancelled';

        // Remove from start queue if pending
        if (inStartQueue) {
          const idx = this.startQueue.findIndex((t) => t.id === taskId);
          if (idx >= 0) {
            this.startQueue.splice(idx, 1);
          }
        }

        this.completeTask(task, 'cancelled', 'Cancelled by user');
        return 1;
      }
      return 0;
    }

    let count = 0;
    for (const task of this.tasks.values()) {
      if (
        task.status === 'pending' ||
        task.status === 'starting' ||
        task.status === 'running'
      ) {
        // Clean up any waiting resolver
        this.completionResolvers.delete(task.id);

        // Check if in start queue (must check before marking cancelled)
        const inStartQueue = task.status === 'pending';

        // Mark as cancelled FIRST to prevent race with startTask
        // Use type assertion since we're deliberately changing status before completeTask
        (task as BackgroundTask & { status: string }).status = 'cancelled';

        // Remove from start queue if pending
        if (inStartQueue) {
          const idx = this.startQueue.findIndex((t) => t.id === task.id);
          if (idx >= 0) {
            this.startQueue.splice(idx, 1);
          }
        }

        this.completeTask(task, 'cancelled', 'Cancelled by user');
        count++;
      }
    }
    return count;
  }

  /**
   * Clean up all tasks.
   */
  cleanup(): void {
    this.startQueue = [];
    this.completionResolvers.clear();
    this.tasks.clear();
    this.tasksBySessionId.clear();
    this.agentBySessionId.clear();
  }
}
