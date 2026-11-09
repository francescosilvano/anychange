import * as vscode from 'vscode';
import { LocalStateStore } from './localState';

export function activate(context: vscode.ExtensionContext): void {
  const state = new LocalStateStore(context);
  const openWorkspace = vscode.commands.registerCommand(
    'anychange.openWorkspace',
    async () => {
      try {
        await state.markInitialized();
        void vscode.window.showInformationMessage(
          'AnyChange workspace is ready for local changes.'
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(
          `AnyChange could not initialize the workspace: ${message}`
        );
      }
    }
  );

  context.subscriptions.push(openWorkspace);
}

export function deactivate(): void {}
