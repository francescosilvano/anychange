import type { PersistedActivity, PersistedStore } from './persistence';

export interface ActivityPanelItem {
  readonly activityId: string;
  readonly repositoryId: string;
  readonly commitHash: string;
  readonly branch: string;
  readonly author: string;
  readonly subject: string;
  readonly paths: readonly string[];
  readonly ticketKeys: readonly string[];
  readonly authoredAt: string;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly reviewState: PersistedActivity['reviewState'];
}

export interface ActivityPanelModel {
  readonly items: readonly ActivityPanelItem[];
  readonly generatedAt: string;
}

export function createActivityPanelModel(
  store: PersistedStore,
  generatedAt: string
): ActivityPanelModel {
  return {
    generatedAt,
    items: store.activities.map((activity) => ({
      activityId: activity.activityId,
      repositoryId: activity.repositoryId,
      commitHash: activity.hash,
      branch: 'Unavailable',
      author: activity.author,
      subject: activity.subject,
      paths: activity.paths,
      ticketKeys: activity.ticketKeys,
      authoredAt: activity.authoredAt,
      firstSeenAt: activity.firstSeenAt,
      lastSeenAt: activity.lastSeenAt,
      reviewState: activity.reviewState
    }))
  };
}

export function serializeActivityPanelModel(model: ActivityPanelModel): string {
  return JSON.stringify(model);
}
