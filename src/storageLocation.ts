export interface StorageLocationContext {
  readonly storageUri?: { readonly fsPath: string };
  readonly globalStorageUri: { readonly fsPath: string };
}

export function resolveStorageDirectory(
  context: StorageLocationContext
): string {
  return context.storageUri?.fsPath ?? context.globalStorageUri.fsPath;
}
