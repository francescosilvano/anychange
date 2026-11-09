# AnyChange

AnyChange is a local-first Visual Studio Code extension for tracking and applying intentional workspace changes.

## Foundation slice

The initial slice provides:

- A TypeScript-based VS Code extension scaffold.
- A local `WorkspaceState` boundary backed by `ExtensionContext.workspaceState`.
- The `AnyChange: Open Workspace` command, which initializes local state and reports failures explicitly.
- Local Git activity capture through the `AnyChange: Capture Local Activity` command.
- Jira-style ticket-key detection, noise filtering, deterministic grouping, and metadata-only draft output.
- Durable local activity history with idempotent capture deduplication.
- Initial local review states: `new`, `reviewed`, and `dismissed`.

The activity pipeline invokes the local `git` executable only. It does not publish to Jira,
use network services, or persist hosted data. Activity without a detected ticket key is kept
in an explicit ungrouped bucket. Durable history is stored as a versioned JSON file under
the VS Code extension storage directory, with atomic replacement and backup recovery.

## Development

Requirements: Node.js 20 or newer and Visual Studio Code 1.85 or newer.

```sh
npm install
npm run check
npm test
npm run build
```

The compiled extension is written to `dist/`. Changes are intentionally uncommitted in this worktree for review.
