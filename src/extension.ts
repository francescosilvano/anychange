import * as vscode from 'vscode';
import { groupActivity, normalizeCommits } from './activityPipeline';
import { MetadataOnlyDraftProvider } from './draftProvider';
import { LocalGitAdapter } from './gitAdapter';
import { LocalStateStore } from './localState';
import { LocalJsonStore, mergeActivity } from './persistence';

export function activate(context: vscode.ExtensionContext): void {
  const state = new LocalStateStore(context);
  const git = new LocalGitAdapter();
  const drafts = new MetadataOnlyDraftProvider();
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

  const captureActivity = vscode.commands.registerCommand(
    'anychange.captureActivity',
    async () => {
      try {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
          throw new Error('Open a workspace folder before capturing activity.');
        }

        const commits = await git.getRecentCommits(workspace.uri.fsPath, 50);
        const records = normalizeCommits(commits);
        const storageDirectory = context.storageUri?.fsPath;
        if (!storageDirectory) {
          throw new Error('AnyChange local storage is unavailable.');
        }

        const store = new LocalJsonStore(storageDirectory);
        const previous = await store.loadOrCreate();
        const merged = mergeActivity(
          previous.activities,
          workspace.uri.fsPath,
          records,
          new Date().toISOString()
        );
        await store.save({ schemaVersion: 1, activities: merged });
        const groups = groupActivity(records);
        const metadata = groups.map((group) =>
          drafts.createDraftMetadata(group)
        );
        void vscode.window.showInformationMessage(
          `AnyChange stored ${merged.length} local activity record(s) across ${metadata.length} new group(s).`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(
          `AnyChange could not capture local activity: ${message}`
        );
      }
    }
  );

  context.subscriptions.push(openWorkspace, captureActivity);
}

export function deactivate(): void {}
