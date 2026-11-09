import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ActivityRecord } from './activity';

export type ReviewState = 'new' | 'reviewed' | 'dismissed';

export interface PersistedActivity extends ActivityRecord {
  readonly activityId: string;
  readonly repositoryId: string;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly reviewState: ReviewState;
}

export interface PersistedStore {
  readonly schemaVersion: 1;
  readonly activities: readonly PersistedActivity[];
}

export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  rename(source: string, destination: string): Promise<void>;
  mkdir(path: string): Promise<void>;
}

const storeFileName = 'anychange-store.json';
const backupFileName = 'anychange-store.json.backup';
const temporaryFileName = 'anychange-store.json.tmp';

const nodeFileSystem: FileSystem = {
  readFile: (path) => readFile(path, 'utf8'),
  writeFile: (path, content) => writeFile(path, content, 'utf8'),
  rename,
  mkdir: (path) => mkdir(path, { recursive: true }).then(() => undefined)
};

function isReviewState(value: unknown): value is ReviewState {
  return value === 'new' || value === 'reviewed' || value === 'dismissed';
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function migrateStore(value: unknown): PersistedStore {
  if (!value || typeof value !== 'object') {
    throw new Error('AnyChange storage contains invalid JSON data.');
  }

  const candidate = value as { schemaVersion?: unknown; activities?: unknown };
  if (candidate.schemaVersion !== 1) {
    throw new Error(
      `AnyChange storage schema version ${String(candidate.schemaVersion)} is unsupported.`
    );
  }
  if (!Array.isArray(candidate.activities)) {
    throw new Error('AnyChange storage is missing its activity list.');
  }

  for (const activity of candidate.activities) {
    if (
      !activity ||
      typeof activity !== 'object' ||
      typeof (activity as PersistedActivity).activityId !== 'string' ||
      typeof (activity as PersistedActivity).repositoryId !== 'string' ||
      !isReviewState((activity as PersistedActivity).reviewState)
    ) {
      throw new Error('AnyChange storage contains an invalid activity record.');
    }
  }

  return {
    schemaVersion: 1,
    activities: candidate.activities as PersistedActivity[]
  };
}

export function activityId(repositoryId: string, hash: string): string {
  return `${repositoryId}:${hash}`;
}

export function mergeActivity(
  existing: readonly PersistedActivity[],
  repositoryId: string,
  records: readonly ActivityRecord[],
  now: string
): readonly PersistedActivity[] {
  const merged = new Map(existing.map((record) => [record.activityId, record]));

  for (const record of records) {
    const id = activityId(repositoryId, record.hash);
    const previous = merged.get(id);
    merged.set(id, {
      ...record,
      activityId: id,
      repositoryId,
      firstSeenAt: previous?.firstSeenAt ?? now,
      lastSeenAt: now,
      reviewState: previous?.reviewState ?? 'new'
    });
  }

  return [...merged.values()].sort(
    (left, right) =>
      right.authoredAt.localeCompare(left.authoredAt) ||
      left.activityId.localeCompare(right.activityId)
  );
}

export class LocalJsonStore {
  private readonly filePath: string;
  private readonly backupPath: string;
  private readonly temporaryPath: string;

  public constructor(
    storageDirectory: string,
    private readonly fileSystem: FileSystem = nodeFileSystem
  ) {
    this.filePath = join(storageDirectory, storeFileName);
    this.backupPath = join(storageDirectory, backupFileName);
    this.temporaryPath = join(storageDirectory, temporaryFileName);
  }

  public async load(): Promise<PersistedStore> {
    let primaryError: unknown;
    try {
      return migrateStore(JSON.parse(await this.fileSystem.readFile(this.filePath)));
    } catch (error) {
      primaryError = error;
    }

    try {
      return migrateStore(
        JSON.parse(await this.fileSystem.readFile(this.backupPath))
      );
    } catch (backupError) {
      if (isNotFound(primaryError) && isNotFound(backupError)) {
        throw primaryError;
      }
      try {
        throw primaryError;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`AnyChange could not recover local storage: ${message}`);
      }
    }
  }

  public async loadOrCreate(): Promise<PersistedStore> {
    try {
      return await this.load();
    } catch (error) {
      if (isNotFound(error)) {
        return { schemaVersion: 1, activities: [] };
      }
      throw error;
    }
  }

  public async save(store: PersistedStore): Promise<void> {
    const serialized = `${JSON.stringify(store, null, 2)}\n`;
    await this.fileSystem.mkdir(dirname(this.filePath));
    try {
      await this.fileSystem.rename(this.filePath, this.backupPath);
    } catch {
      // The first save has no primary file to back up.
    }
    await this.fileSystem.writeFile(this.temporaryPath, serialized);
    await this.fileSystem.rename(this.temporaryPath, this.filePath);
  }
}
