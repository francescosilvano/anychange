import { describe, expect, it, vi } from 'vitest';
import type { ActivityRecord } from '../src/activity';
import { ReviewStateService } from '../src/reviewState';
import type { PersistedActivity } from '../src/persistence';

const record: ActivityRecord = {
  hash: 'abc',
  author: 'A',
  authoredAt: '2026-01-01T00:00:00Z',
  subject: 'PROJ-1 implement',
  paths: ['src/a.ts'],
  ticketKeys: ['PROJ-1']
};

describe('ReviewStateService', () => {
  it('changes the local review state for a stored activity', async () => {
    const stored: PersistedActivity = {
      ...record,
      activityId: '/repo:abc',
      repositoryId: '/repo',
      firstSeenAt: '2026-01-01T00:00:00Z',
      lastSeenAt: '2026-01-01T00:00:00Z',
      reviewState: 'new'
    };
    const save = vi.fn().mockResolvedValue(undefined);
    const service = new ReviewStateService(
      async () => [stored],
      save
    );

    await service.setState('/repo', record, 'reviewed');

    expect(save).toHaveBeenCalledWith([{ ...stored, reviewState: 'reviewed' }]);
  });

  it('rejects state changes for unknown activities', async () => {
    const service = new ReviewStateService(async () => [], vi.fn());

    await expect(
      service.setState('/repo', record, 'dismissed')
    ).rejects.toThrow('was not found');
  });
});
