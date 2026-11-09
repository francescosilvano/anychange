import type * as vscode from 'vscode';

export interface WorkspaceState {
  readonly initialized: boolean;
}

const stateKey = 'anychange.workspaceState';

export class LocalStateStore {
  public constructor(private readonly context: vscode.ExtensionContext) {}

  public get(): WorkspaceState {
    return this.context.workspaceState.get<WorkspaceState>(stateKey, {
      initialized: false
    });
  }

  public async markInitialized(): Promise<void> {
    await this.context.workspaceState.update(stateKey, { initialized: true });
  }
}
