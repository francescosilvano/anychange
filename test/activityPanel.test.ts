import { describe, expect, it } from 'vitest';
import {
  createActivityPanelModel,
  serializeActivityPanelModel
} from '../src/activityPanelModel';

describe('activity panel model', () => {
  it('maps persisted activity into displayable metadata without inventing a branch', () => {
    const model = createActivityPanelModel(
      {
        schemaVersion: 1,
        activities: [
          {
            activityId: '/repo:abc',
            repositoryId: '/repo',
            hash: 'abc',
            author: 'A',
            authoredAt: '2026-01-01T00:00:00Z',
            subject: 'PROJ-1 implement',
            paths: ['src/a.ts'],
            ticketKeys: ['PROJ-1'],
            firstSeenAt: '2026-01-01T01:00:00Z',
            lastSeenAt: '2026-01-01T02:00:00Z',
            reviewState: 'reviewed'
          }
        ]
      },
      '2026-01-02T00:00:00Z'
    );

    expect(model.items[0]).toMatchObject({
      activityId: '/repo:abc',
      commitHash: 'abc',
      branch: 'Unavailable',
      ticketKeys: ['PROJ-1'],
      reviewState: 'reviewed'
    });
  });

  it('serializes the model as structured JSON', () => {
    const model = createActivityPanelModel(
      { schemaVersion: 1, activities: [] },
      '2026-01-02T00:00:00Z'
    );

    expect(JSON.parse(serializeActivityPanelModel(model))).toEqual(model);
  });
});
