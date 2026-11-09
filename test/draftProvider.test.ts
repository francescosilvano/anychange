import { describe, expect, it } from 'vitest';
import { MetadataOnlyDraftProvider } from '../src/draftProvider';

describe('MetadataOnlyDraftProvider', () => {
  it('returns deterministic non-publishable metadata', () => {
    const provider = new MetadataOnlyDraftProvider();

    expect(
      provider.createDraftMetadata({
        ticketKey: 'PROJ-1',
        records: [
          {
            hash: 'abc',
            author: 'A',
            authoredAt: '2026-01-01T00:00:00Z',
            subject: 'PROJ-1 implement',
            paths: ['src/z.ts', 'src/a.ts'],
            ticketKeys: ['PROJ-1']
          }
        ]
      })
    ).toEqual({
      ticketKey: 'PROJ-1',
      summary: 'PROJ-1 implement',
      recordHashes: ['abc'],
      paths: ['src/a.ts', 'src/z.ts'],
      source: 'local-git',
      publishable: false
    });
  });
});
