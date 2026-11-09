import type { ActivityGroup, ActivityRecord, GitCommit } from './activity';

const defaultTicketPattern = /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/gi;
const noisePatterns = [
  /^node_modules\//,
  /^dist\//,
  /^coverage\//,
  /^\.git\//,
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/,
  /(^|\/)(\.DS_Store|Thumbs\.db)$/
];

function compareTicketKeys(left: string, right: string): number {
  const leftParts = /^(.+)-(\d+)$/.exec(left);
  const rightParts = /^(.+)-(\d+)$/.exec(right);
  if (!leftParts || !rightParts) {
    return left.localeCompare(right);
  }

  return (
    leftParts[1].localeCompare(rightParts[1]) ||
    Number(leftParts[2]) - Number(rightParts[2])
  );
}

export function extractTicketKeys(
  text: string,
  pattern: RegExp = defaultTicketPattern
): readonly string[] {
  const keys = new Set<string>();
  const globalPattern = new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  );
  for (const match of text.matchAll(globalPattern)) {
    const key = match[1] ?? match[0];
    keys.add(key.toUpperCase());
  }
  return [...keys].sort(compareTicketKeys);
}

export function filterNoisePaths(paths: readonly string[]): readonly string[] {
  return paths
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => !noisePatterns.some((pattern) => pattern.test(path)))
    .sort();
}

export function normalizeCommits(
  commits: readonly GitCommit[],
  ticketPattern?: RegExp
): readonly ActivityRecord[] {
  return commits
    .map((commit) => {
      const paths = filterNoisePaths(commit.paths);
      return {
        hash: commit.hash,
        author: commit.author,
        authoredAt: commit.authoredAt,
        subject: commit.subject.trim(),
        paths,
        ticketKeys: extractTicketKeys(
          [commit.subject, ...paths].join(' '),
          ticketPattern
        )
      };
    })
    .sort((left, right) => {
      const dateOrder = right.authoredAt.localeCompare(left.authoredAt);
      return dateOrder || left.hash.localeCompare(right.hash);
    });
}

export function groupActivity(
  records: readonly ActivityRecord[]
): readonly ActivityGroup[] {
  const groups = new Map<string | undefined, ActivityRecord[]>();
  for (const record of records) {
    const keys = record.ticketKeys.length > 0 ? record.ticketKeys : [undefined];
    for (const key of keys) {
      const group = groups.get(key) ?? [];
      group.push(record);
      groups.set(key, group);
    }
  }

  return [...groups.entries()]
    .sort(([left], [right]) => {
      if (left === undefined) return 1;
      if (right === undefined) return -1;
      return compareTicketKeys(left, right);
    })
    .map(([ticketKey, groupedRecords]) => ({
      ...(ticketKey === undefined ? {} : { ticketKey }),
      records: groupedRecords
    }));
}
