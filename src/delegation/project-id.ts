import { createHash } from 'node:crypto';
import path from 'node:path';

function sanitizeProjectName(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  return normalized.length > 0 ? normalized : 'project';
}

async function runGitCommand(
  directory: string,
  args: string[],
  timeoutMs: number,
): Promise<string | null> {
  const subprocess = Bun.spawn({
    cmd: ['git', ...args],
    cwd: directory,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      (async () => {
        const [stdout, exitCode] = await Promise.all([
          new Response(subprocess.stdout).text(),
          subprocess.exited,
        ]);

        if (exitCode !== 0) {
          return null;
        }

        const firstLine = stdout.trim().split(/\r?\n/, 1)[0];
        return firstLine.length > 0 ? firstLine : null;
      })(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          subprocess.kill();
          resolve(null);
        }, timeoutMs);
      }),
    ]);

    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildProjectId(baseDirectory: string, hash: string): string {
  const projectName = sanitizeProjectName(path.basename(baseDirectory));
  return `${projectName}-${hash.slice(0, 12)}`;
}

export async function getProjectId(
  directory: string,
  timeoutMs = 5_000,
): Promise<string | null> {
  const normalizedDirectory = directory.trim();
  if (normalizedDirectory.length === 0) {
    return null;
  }

  const repoRoot = await runGitCommand(
    normalizedDirectory,
    ['rev-parse', '--show-toplevel'],
    timeoutMs,
  );
  const rootCommit = await runGitCommand(
    normalizedDirectory,
    ['rev-list', '--max-parents=0', 'HEAD'],
    timeoutMs,
  );

  if (repoRoot && rootCommit) {
    return buildProjectId(repoRoot, rootCommit);
  }

  try {
    const resolvedDirectory = path.resolve(normalizedDirectory);
    const hash = createHash('sha256').update(resolvedDirectory).digest('hex');

    return buildProjectId(resolvedDirectory, hash);
  } catch {
    return null;
  }
}
