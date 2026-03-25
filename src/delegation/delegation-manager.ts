import { readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import type { DelegationConfig } from '../config';
import { log } from '../utils/logger';
import { ensureDelegationDirectories, resolvePaths } from './paths';
import { getProjectId } from './project-id';
import {
  DELEGATION_STATUSES,
  type DelegationHeader,
  type DelegationListEntry,
  type DelegationRecord,
  type DelegationStatus,
  type PersistedDelegationRecord,
} from './types';

const DEFAULT_INJECTION_LIMIT = 5;
const HEADER_SCAN_BYTES = 8 * 1024;
const MAX_ID_ATTEMPTS = 64;

export interface DelegationManagerOptions {
  directory: string;
  config?: DelegationConfig;
  getActiveTaskIds?: (rootSessionId: string) => Iterable<string>;
}

export interface PersistDelegationInput {
  rootSessionId: string;
  record: DelegationRecord;
}

function isDelegationStatus(value: unknown): value is DelegationStatus {
  return (
    typeof value === 'string' &&
    DELEGATION_STATUSES.includes(value as DelegationStatus)
  );
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value;
}

function parseHeaderValue(value: unknown): DelegationHeader | null {
  if (!isRecordLike(value)) {
    return null;
  }

  const id = value.id;
  const title = value.title;
  const summary = value.summary;
  const agent = value.agent;
  const status = value.status;
  const projectId = value.project_id;
  const rootSessionId = value.root_session_id;
  const startedAt = value.started_at;
  const persistedAt = value.persisted_at;
  const completedAt = value.completed_at;

  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof summary !== 'string' ||
    typeof agent !== 'string' ||
    !isDelegationStatus(status) ||
    typeof projectId !== 'string' ||
    typeof rootSessionId !== 'string' ||
    typeof startedAt !== 'string' ||
    typeof persistedAt !== 'string'
  ) {
    return null;
  }

  return {
    id,
    title,
    summary,
    agent,
    status,
    projectId,
    rootSessionId,
    startedAt,
    completedAt: toOptionalString(completedAt),
    persistedAt,
  };
}

function buildRecord(
  header: DelegationHeader,
  content: string,
): DelegationRecord {
  return {
    id: header.id,
    agent: header.agent,
    status: header.status,
    title: header.title,
    summary: header.summary,
    startedAt: header.startedAt,
    completedAt: header.completedAt,
    content,
  };
}

function serializeHeader(header: DelegationHeader): string {
  return Bun.YAML.stringify(
    {
      id: header.id,
      title: header.title,
      summary: header.summary,
      agent: header.agent,
      status: header.status,
      project_id: header.projectId,
      root_session_id: header.rootSessionId,
      started_at: header.startedAt,
      completed_at: header.completedAt,
      persisted_at: header.persistedAt,
    },
    null,
    2,
  ).trimEnd();
}

function serializeRecord(header: DelegationHeader, content: string): string {
  const body = content.length > 0 ? content : '(No output)';
  return `---\n${serializeHeader(header)}\n---\n\n${body}`;
}

function extractFrontmatter(markdown: string): {
  headerText: string;
  body: string;
} | null {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return null;
  }

  return {
    headerText: match[1],
    body: match[2] ?? '',
  };
}

function parseHeaderFromMarkdown(markdown: string): DelegationHeader | null {
  const frontmatter = extractFrontmatter(markdown);
  if (!frontmatter) {
    return null;
  }

  try {
    const parsed = Bun.YAML.parse(frontmatter.headerText);
    return parseHeaderValue(parsed);
  } catch {
    return null;
  }
}

function parsePersistedRecord(
  filePath: string,
  markdown: string,
): PersistedDelegationRecord | null {
  const frontmatter = extractFrontmatter(markdown);
  if (!frontmatter) {
    return null;
  }

  try {
    const parsed = Bun.YAML.parse(frontmatter.headerText);
    const header = parseHeaderValue(parsed);
    if (!header) {
      return null;
    }

    return {
      path: filePath,
      header,
      record: buildRecord(header, frontmatter.body),
    };
  } catch {
    return null;
  }
}

function sortByCompletionDesc<T extends { completedAt: string | null }>(
  left: T,
  right: T,
): number {
  const leftTime = left.completedAt ? Date.parse(left.completedAt) : 0;
  const rightTime = right.completedAt ? Date.parse(right.completedAt) : 0;
  return rightTime - leftTime;
}

export class DelegationManager {
  private readonly directory: string;
  private readonly config?: DelegationConfig;
  private readonly getActiveTaskIds?: (
    rootSessionId: string,
  ) => Iterable<string>;

  constructor(options: DelegationManagerOptions) {
    this.directory = options.directory;
    this.config = options.config;
    this.getActiveTaskIds = options.getActiveTaskIds;
  }

  async resolveProjectId(directory = this.directory): Promise<string | null> {
    return getProjectId(directory, this.config?.timeout);
  }

  async createTaskId(rootSessionId: string): Promise<string> {
    const reservedTaskIds = await this.getReservedTaskIds(rootSessionId);

    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      const candidate = `bg_${uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: '-',
        length: 3,
        style: 'lowerCase',
      })}`;

      if (!reservedTaskIds.has(candidate)) {
        return candidate;
      }
    }

    const fallback = `bg_${uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: '-',
      length: 3,
      style: 'lowerCase',
    })}-${Date.now().toString(36)}`;

    if (!reservedTaskIds.has(fallback)) {
      return fallback;
    }

    return `bg_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async persist(
    input: PersistDelegationInput,
  ): Promise<PersistedDelegationRecord | null> {
    const projectId = await this.resolveProjectId();
    if (!projectId) {
      return null;
    }

    const header: DelegationHeader = {
      id: input.record.id,
      title: input.record.title,
      summary: input.record.summary,
      agent: input.record.agent,
      status: input.record.status,
      projectId,
      rootSessionId: input.rootSessionId,
      startedAt: input.record.startedAt,
      completedAt: input.record.completedAt,
      persistedAt: new Date().toISOString(),
    };

    const paths = resolvePaths({
      config: this.config,
      projectId,
      rootSessionId: input.rootSessionId,
      taskId: input.record.id,
    });

    try {
      await ensureDelegationDirectories(paths);
      await Bun.write(
        paths.taskFile,
        serializeRecord(header, input.record.content),
      );

      return {
        path: paths.taskFile,
        header,
        record: {
          ...input.record,
          completedAt: input.record.completedAt,
        },
      };
    } catch (error) {
      log('[delegation-manager] failed to persist delegation record', {
        taskId: input.record.id,
        rootSessionId: input.rootSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async read(
    taskId: string,
    rootSessionId: string,
  ): Promise<PersistedDelegationRecord | null> {
    const projectId = await this.resolveProjectId();
    if (!projectId) {
      return null;
    }

    const paths = resolvePaths({
      config: this.config,
      projectId,
      rootSessionId,
      taskId,
    });

    try {
      const markdown = await Bun.file(paths.taskFile).text();
      return parsePersistedRecord(paths.taskFile, markdown);
    } catch {
      return null;
    }
  }

  async list(rootSessionId: string): Promise<DelegationListEntry[]> {
    const projectId = await this.resolveProjectId();
    if (!projectId) {
      return [];
    }

    const paths = resolvePaths({
      config: this.config,
      projectId,
      rootSessionId,
      taskId: 'placeholder',
    });

    try {
      const entries = await readdir(paths.sessionDir, { withFileTypes: true });
      const records = await Promise.all(
        entries
          .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
          .map(async (entry) => {
            const filePath = path.join(paths.sessionDir, entry.name);
            try {
              const preview = await Bun.file(filePath)
                .slice(0, HEADER_SCAN_BYTES)
                .text();
              const header = parseHeaderFromMarkdown(preview);
              if (!header) {
                return null;
              }

              return {
                path: filePath,
                id: header.id,
                agent: header.agent,
                status: header.status,
                title: header.title,
                summary: header.summary,
                startedAt: header.startedAt,
                completedAt: header.completedAt,
              } satisfies DelegationListEntry;
            } catch {
              return null;
            }
          }),
      );

      return records
        .filter((record): record is DelegationListEntry => record !== null)
        .sort(sortByCompletionDesc);
    } catch {
      return [];
    }
  }

  async listCompleted(rootSessionId: string): Promise<DelegationListEntry[]> {
    const records = await this.list(rootSessionId);
    return records.filter((record) => record.status === 'complete');
  }

  async summarizeForInjection(
    rootSessionId: string,
    limit = DEFAULT_INJECTION_LIMIT,
  ): Promise<string | null> {
    const completedRecords = await this.listCompleted(rootSessionId);
    if (completedRecords.length === 0) {
      return null;
    }

    const selected = completedRecords.slice(0, Math.max(limit, 1));
    const lines = ['## Delegation Digest'];

    for (const record of selected) {
      const title = record.title.trim().length > 0 ? record.title : record.id;
      const summary = record.summary.trim();
      lines.push(
        `- ${record.id} (@${record.agent}) ${title}${summary.length > 0 ? ` — ${summary}` : ''}`,
      );
    }

    return lines.join('\n');
  }

  private async getReservedTaskIds(
    rootSessionId: string,
  ): Promise<Set<string>> {
    const reservedTaskIds = new Set<string>();

    for (const taskId of this.getActiveTaskIds?.(rootSessionId) ?? []) {
      reservedTaskIds.add(taskId);
    }

    const projectId = await this.resolveProjectId();
    if (!projectId) {
      return reservedTaskIds;
    }

    const paths = resolvePaths({
      config: this.config,
      projectId,
      rootSessionId,
      taskId: 'placeholder',
    });

    try {
      const entries = await readdir(paths.sessionDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          reservedTaskIds.add(entry.name.slice(0, -'.md'.length));
        }
      }
    } catch {
      // Missing directory is a normal case for a new root session.
    }

    return reservedTaskIds;
  }
}
