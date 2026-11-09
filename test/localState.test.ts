import { describe, expect, it, vi } from 'vitest';
import { LocalStateStore } from '../src/localState';

describe('LocalStateStore', () => {
  it('returns an uninitialized state when no value is persisted', () => {
    const get = vi.fn((_key: string, defaultValue: { initialized: boolean }) => defaultValue);
    const store = new LocalStateStore({
      workspaceState: { get }
    } as never);

    expect(store.get()).toEqual({ initialized: false });
    expect(get).toHaveBeenCalledWith(
      'anychange.workspaceState',
      { initialized: false }
    );
  });

  it('persists initialized state locally', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const store = new LocalStateStore({
      workspaceState: { update }
    } as never);

    await store.markInitialized();

    expect(update).toHaveBeenCalledWith(
      'anychange.workspaceState',
      { initialized: true }
    );
  });
});
