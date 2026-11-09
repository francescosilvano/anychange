import type { ActivityRecord } from './activity';
import {
  activityId,
  type PersistedActivity,
  type ReviewState
} from './persistence';

export class ReviewStateService {
  public constructor(
    private readonly loadStore: () => Promise<readonly PersistedActivity[]>,
    private readonly saveStore: (
      activities: readonly PersistedActivity[]
    ) => Promise<void>
  ) {}

  public async list(): Promise<readonly PersistedActivity[]> {
    return this.loadStore();
  }

  public async setState(
    repositoryId: string,
    record: ActivityRecord,
    state: ReviewState
  ): Promise<void> {
    const id = activityId(repositoryId, record.hash);
    const activities = await this.loadStore();
    const target = activities.find((activity) => activity.activityId === id);
    if (!target) {
      throw new Error(`AnyChange activity ${id} was not found.`);
    }

    await this.saveStore(
      activities.map((activity) =>
        activity.activityId === id
          ? { ...activity, reviewState: state }
          : activity
      )
    );
  }
}
