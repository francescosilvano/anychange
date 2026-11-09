import type { ActivityGroup, DraftMetadata } from './activity';

export interface DraftProvider {
  createDraftMetadata(group: ActivityGroup): DraftMetadata;
}

export class MetadataOnlyDraftProvider implements DraftProvider {
  public createDraftMetadata(group: ActivityGroup): DraftMetadata {
    const paths = [...new Set(group.records.flatMap((record) => record.paths))]
      .sort();
    const subjects = group.records.map((record) => record.subject);

    return {
      ...(group.ticketKey === undefined ? {} : { ticketKey: group.ticketKey }),
      summary: subjects.join('; '),
      recordHashes: group.records.map((record) => record.hash),
      paths,
      source: 'local-git',
      publishable: false
    };
  }
}
