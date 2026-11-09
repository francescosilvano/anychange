import { describe, expect, it } from 'vitest';
import {
  extractTicketKeys,
  filterNoisePaths,
  groupActivity,
  normalizeCommits
} from '../src/activityPipeline';

describe('activity pipeline', () => {
  it('detects and normalizes Jira keys from subjects and paths', () => {
    expect(
      extractTicketKeys('fix abc-12 and ABC-2 in PROJ-10')
    ).toEqual(['ABC-2', 'ABC-12', 'PROJ-10']);
  });

  it('filters generated and dependency noise while preserving source paths', () => {
    expect(
      filterNoisePaths([
        'src/feature.ts',
        'node_modules/tool/index.js',
        'package-lock.json',
        'dist/extension.js'
      ])
    ).toEqual(['src/feature.ts']);
  });

  it('groups records deterministically and keeps untagged activity last', () => {
    const records = normalizeCommits([
      {
        hash: 'b',
        author: 'A',
        authoredAt: '2026-01-02T00:00:00Z',
        subject: 'PROJ-2 later',
        paths: ['src/b.ts']
      },
      {
        hash: 'a',
        author: 'A',
        authoredAt: '2026-01-01T00:00:00Z',
        subject: 'untracked maintenance',
        paths: ['src/a.ts']
      },
      {
        hash: 'c',
        author: 'A',
        authoredAt: '2026-01-03T00:00:00Z',
        subject: 'PROJ-1 first',
        paths: ['src/c.ts']
      }
    ]);

    expect(groupActivity(records).map((group) => group.ticketKey)).toEqual([
      'PROJ-1',
      'PROJ-2',
      undefined
    ]);
  });
});
