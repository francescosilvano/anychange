import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitCommit } from './activity';

const execFileAsync = promisify(execFile);

export interface GitAdapter {
  getRecentCommits(
    cwd: string,
    limit: number
  ): Promise<readonly GitCommit[]>;
}

export class LocalGitAdapter implements GitAdapter {
  public async getRecentCommits(
    cwd: string,
    limit: number
  ): Promise<readonly GitCommit[]> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('Git commit limit must be a positive integer.');
    }

    const { stdout } = await execFileAsync(
      'git',
      ['log', `-${limit}`, '--format=%H%x1f%an%x1f%aI%x1f%s'],
      { cwd, windowsHide: true, maxBuffer: 1024 * 1024 }
    );
    const commits: GitCommit[] = [];

    for (const line of stdout.trim().split(/\r?\n/).filter(Boolean)) {
      const [hash, author, authoredAt, subject] = line.split('\x1f');
      if (!hash || !author || !authoredAt || !subject) {
        continue;
      }

      const paths = await execFileAsync(
        'git',
        ['show', '--format=', '--name-only', hash],
        { cwd, windowsHide: true, maxBuffer: 1024 * 1024 }
      );

      commits.push({
        hash,
        author,
        authoredAt,
        subject,
        paths: paths.stdout
          .split(/\r?\n/)
          .map((path) => path.trim())
          .filter(Boolean)
      });
    }

    return commits;
  }
}
