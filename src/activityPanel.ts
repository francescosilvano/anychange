import type { ExtensionContext, WebviewPanel } from 'vscode';
import * as vscode from 'vscode';
import { LocalJsonStore } from './persistence';
import {
  createActivityPanelModel,
  serializeActivityPanelModel
} from './activityPanelModel';
import { resolveStorageDirectory } from './storageLocation';

const panelTitle = 'AnyChange Activity';

export class ActivityPanel {
  private static current: ActivityPanel | undefined;

  private constructor(
    private readonly panel: WebviewPanel,
    private readonly store: LocalJsonStore
  ) {
    panel.webview.html = createPanelHtml(panel.webview.cspSource);
    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'refresh'
      ) {
        void this.refresh();
      }
    });
    panel.onDidDispose(() => {
      if (ActivityPanel.current?.panel === panel) {
        ActivityPanel.current = undefined;
      }
    });
    void this.refresh();
  }

  public static open(context: ExtensionContext): void {
    if (ActivityPanel.current) {
      ActivityPanel.current.panel.reveal(vscode.ViewColumn.Active);
      void ActivityPanel.current.refresh();
      return;
    }

    const storageDirectory = resolveStorageDirectory(context);
    if (!storageDirectory) {
      throw new Error('AnyChange local storage is unavailable.');
    }

    const panel = vscode.window.createWebviewPanel(
      'anychange.activityPanel',
      panelTitle,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    ActivityPanel.current = new ActivityPanel(
      panel,
      new LocalJsonStore(storageDirectory)
    );
  }

  private async refresh(): Promise<void> {
    await this.panel.webview.postMessage({ type: 'loading' });
    try {
      const store = await this.store.loadOrCreate();
      const model = createActivityPanelModel(store, new Date().toISOString());
      await this.panel.webview.postMessage({
        type: 'data',
        model: JSON.parse(serializeActivityPanelModel(model))
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.panel.webview.postMessage({ type: 'error', message });
    }
  }
}

function createPanelHtml(cspSource: string): string {
  const nonce = createNonce();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';"
  >
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${panelTitle}</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 1rem; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 0.4rem 0.8rem; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .status { margin: 1rem 0; }
    .activity { border: 1px solid var(--vscode-panel-border); padding: 0.8rem; margin: 0.8rem 0; }
    .metadata { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 0.8rem; }
    dt { font-weight: 600; }
    dd { margin: 0; word-break: break-word; }
    ul { margin: 0.25rem 0 0; padding-left: 1.2rem; }
    .empty, .error { padding: 1rem; border: 1px solid var(--vscode-panel-border); }
    .error { color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <header>
    <h1>AnyChange Activity</h1>
    <button id="refresh" type="button">Refresh</button>
  </header>
  <main id="content" class="status" aria-live="polite">Loading activity...</main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const content = document.getElementById('content');
    document.getElementById('refresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    function addText(parent, tag, value) {
      const element = document.createElement(tag);
      element.textContent = value;
      parent.appendChild(element);
      return element;
    }

    function renderList(parent, values) {
      const list = document.createElement('ul');
      values.forEach((value) => addText(list, 'li', value));
      parent.appendChild(list);
    }

    function renderItem(item) {
      const article = document.createElement('article');
      article.className = 'activity';
      addText(article, 'h2', item.subject);
      const metadata = document.createElement('dl');
      metadata.className = 'metadata';
      [
        ['Repository', item.repositoryId],
        ['Commit', item.commitHash],
        ['Branch', item.branch],
        ['Author', item.author],
        ['Review state', item.reviewState],
        ['Authored', item.authoredAt],
        ['First seen', item.firstSeenAt],
        ['Last seen', item.lastSeenAt]
      ].forEach(([label, value]) => {
        addText(metadata, 'dt', label);
        addText(metadata, 'dd', value);
      });
      addText(metadata, 'dt', 'Jira keys');
      const ticketCell = document.createElement('dd');
      if (item.ticketKeys.length === 0) {
        ticketCell.textContent = 'None';
      } else {
        renderList(ticketCell, item.ticketKeys);
      }
      metadata.appendChild(ticketCell);
      addText(metadata, 'dt', 'Changed paths');
      const pathCell = document.createElement('dd');
      renderList(pathCell, item.paths);
      metadata.appendChild(pathCell);
      article.appendChild(metadata);
      return article;
    }

    function render(message) {
      content.replaceChildren();
      if (message.type === 'loading') {
        content.textContent = 'Loading activity...';
        return;
      }
      if (message.type === 'error') {
        const error = document.createElement('p');
        error.className = 'error';
        error.textContent = message.message;
        content.appendChild(error);
        return;
      }
      if (message.model.items.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'No persisted activity yet. Capture local activity to see it here.';
        content.appendChild(empty);
        return;
      }
      message.model.items.forEach((item) => content.appendChild(renderItem(item)));
    }

    window.addEventListener('message', (event) => render(event.data));
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () =>
    alphabet.charAt(Math.floor(Math.random() * alphabet.length))
  ).join('');
}
