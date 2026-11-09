import { describe, expect, it } from 'vitest';
import { resolveStorageDirectory } from '../src/storageLocation';

describe('resolveStorageDirectory', () => {
  it('prefers workspace storage when available', () => {
    expect(
      resolveStorageDirectory({
        storageUri: { fsPath: 'workspace-storage' },
        globalStorageUri: { fsPath: 'global-storage' }
      })
    ).toBe('workspace-storage');
  });

  it('falls back to global extension storage without a workspace', () => {
    expect(
      resolveStorageDirectory({
        globalStorageUri: { fsPath: 'global-storage' }
      })
    ).toBe('global-storage');
  });
});
