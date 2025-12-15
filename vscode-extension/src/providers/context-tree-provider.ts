/**
 * Context Tree Provider
 * Shows files added to AI context in the sidebar
 */

import * as vscode from 'vscode';

export class ContextTreeProvider implements vscode.TreeDataProvider<ContextFileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ContextFileItem | undefined | void> =
    new vscode.EventEmitter<ContextFileItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<ContextFileItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private contextFiles: vscode.Uri[] = [];

  /**
   * Add a file to context
   */
  addFile(uri: vscode.Uri): void {
    if (!this.contextFiles.find(f => f.toString() === uri.toString())) {
      this.contextFiles.push(uri);
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Remove a file from context
   */
  removeFile(uri: vscode.Uri): void {
    this.contextFiles = this.contextFiles.filter(f => f.toString() !== uri.toString());
    this._onDidChangeTreeData.fire();
  }

  /**
   * Clear all context files
   */
  clear(): void {
    this.contextFiles = [];
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get all context files
   */
  getFiles(): vscode.Uri[] {
    return [...this.contextFiles];
  }

  /**
   * Get context as text for AI
   */
  async getContextText(): Promise<string> {
    const contents: string[] = [];

    for (const uri of this.contextFiles) {
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        const relativePath = vscode.workspace.asRelativePath(uri);
        contents.push(`--- ${relativePath} ---\n\`\`\`${doc.languageId}\n${doc.getText()}\n\`\`\`\n`);
      } catch {
        // Skip files that can't be read
      }
    }

    return contents.join('\n');
  }

  getTreeItem(element: ContextFileItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ContextFileItem): Thenable<ContextFileItem[]> {
    if (element) {
      return Promise.resolve([]);
    }

    if (this.contextFiles.length === 0) {
      return Promise.resolve([
        new ContextFileItem(
          'No files in context',
          vscode.Uri.parse('empty'),
          'empty',
          vscode.TreeItemCollapsibleState.None
        ),
      ]);
    }

    return Promise.resolve(
      this.contextFiles.map(
        uri =>
          new ContextFileItem(
            vscode.workspace.asRelativePath(uri),
            uri,
            'file',
            vscode.TreeItemCollapsibleState.None
          )
      )
    );
  }
}

class ContextFileItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly fileUri: vscode.Uri,
    public readonly type: 'file' | 'empty',
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);

    if (type === 'file') {
      this.tooltip = fileUri.fsPath;
      this.iconPath = new vscode.ThemeIcon('file');
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [fileUri],
      };
      this.contextValue = 'contextFile';
    } else {
      this.iconPath = new vscode.ThemeIcon('info');
    }
  }
}
