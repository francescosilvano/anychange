# AnyChange

AnyChange is a local-first Visual Studio Code extension for tracking and applying intentional workspace changes.

## Foundation slice

The initial slice provides:

- A TypeScript-based VS Code extension scaffold.
- A local `WorkspaceState` boundary backed by `ExtensionContext.workspaceState`.
- The `AnyChange: Open Workspace` command, which initializes local state and reports failures explicitly.

No network service or remote persistence is used by this foundation.

## Development

Requirements: Node.js 20 or newer and Visual Studio Code 1.85 or newer.

```sh
npm install
npm run check
npm test
npm run build
```

The compiled extension is written to `dist/`. Changes are intentionally uncommitted in this worktree for review.
