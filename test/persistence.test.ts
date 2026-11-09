import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import type { ActivityRecord } from '../src/activity';
import {
  LocalJsonStore,
  mergeActivity,
  type FileSystem,
  type PersistedActivity
} from '../src/persistence';

const record: ActivityRecord = {
  hash: 'abc',
  author: 'A',
  authoredAt: '2026-01-01T00:00:00Z',
  subject: 'PROJ-1 implement',
  paths: ['src/a.ts'],
  ticketKeys: ['PROJ-1']
};

function fakeFileSystem(files: Record<string, string> = {}) {
  const writes = new Map(Object.entries(files));
  const fileSystem: FileSystem = {
    readFile: async (path) => {
      const value = writes.get(path);
      if (value === undefined) {
        const error = new Error('not found') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return value;
    },
    writeFile: async (path, content) => {
      writes.set(path, content);
    },
    rename: async (source, destination) => {
      const value = writes.get(source);
      if (value === undefined) {
        const error = new Error('not found') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      writes.set(destination, value);
      writes.delete(source);
    },
    mkdir: async () => undefined
  };
  return { fileSystem, writes };
}

describe('local persistence', () => {
  it('deduplicates by repository and commit while preserving review state', () => {
    const existing: PersistedActivity[] = [
      {
        ...record,
        activityId: '/repo:abc',
        repositoryId: '/repo',
        firstSeenAt: '2026-01-01T01:00:00Z',
        lastSeenAt: '2026-01-01T01:00:00Z',
        reviewState: 'reviewed'
      }
    ];

    expect(mergeActivity(existing, '/repo', [record], '2026-01-02T00:00:00Z'))
      .toEqual([
        {
          ...record,
          activityId: '/repo:abc',
          repositoryId: '/repo',
          firstSeenAt: '2026-01-01T01:00:00Z',
          lastSeenAt: '2026-01-02T00:00:00Z',
          reviewState: 'reviewed'
        }
      ]);
  });

  it('writes through a temporary file and loads the persisted schema', async () => {
    const { fileSystem, writes } = fakeFileSystem();
    const store = new LocalJsonStore('/storage', fileSystem);
    const value = { schemaVersion: 1 as const, activities: [] };

    await store.save(value);

    expect(writes.get(join('/storage', 'anychange-store.json'))).toContain(
      '"schemaVersion": 1'
    );
    await expect(store.load()).resolves.toEqual(value);
  });

  it('recovers from a valid backup when the primary is malformed', async () => {
    const backup = JSON.stringify({ schemaVersion: 1, activities: [] });
    const { fileSystem } = fakeFileSystem({
      [join('/storage', 'anychange-store.json')]: '{invalid',
      [join('/storage', 'anychange-store.json.backup')]: backup
    });
    const store = new LocalJsonStore('/storage', fileSystem);

    await expect(store.load()).resolves.toEqual({
      schemaVersion: 1,
      activities: []
    });
  });

  it('creates an empty store only when no files exist', async () => {
    const { fileSystem } = fakeFileSystem();
    const store = new LocalJsonStore('/storage', fileSystem);

    await expect(store.loadOrCreate()).resolves.toEqual({
      schemaVersion: 1,
      activities: []
    });
  });
});
