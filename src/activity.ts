export interface GitCommit {
  readonly hash: string;
  readonly author: string;
  readonly authoredAt: string;
  readonly subject: string;
  readonly paths: readonly string[];
}

export interface ActivityRecord {
  readonly hash: string;
  readonly author: string;
  readonly authoredAt: string;
  readonly subject: string;
  readonly paths: readonly string[];
  readonly ticketKeys: readonly string[];
}

export interface ActivityGroup {
  readonly ticketKey?: string;
  readonly records: readonly ActivityRecord[];
}

export interface DraftMetadata {
  readonly ticketKey?: string;
  readonly summary: string;
  readonly recordHashes: readonly string[];
  readonly paths: readonly string[];
  readonly source: 'local-git';
  readonly publishable: false;
}
