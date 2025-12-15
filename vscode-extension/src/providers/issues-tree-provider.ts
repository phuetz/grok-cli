/**
 * Issues Tree Provider
 * Shows code issues detected by AI review in the sidebar
 */

import * as vscode from 'vscode';

export interface CodeIssue {
  id: string;
  file: string;
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  timestamp: number;
}

export class IssuesTreeProvider implements vscode.TreeDataProvider<IssueItem>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<IssueItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private issues: Map<string, CodeIssue[]> = new Map();
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Listen for diagnostics changes
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(e => {
        for (const uri of e.uris) {
          this.updateIssuesFromDiagnostics(uri);
        }
        this.refresh();
      })
    );
  }

  private updateIssuesFromDiagnostics(uri: vscode.Uri): void {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    const codeBuddyIssues = diagnostics
      .filter(d => d.source === 'Code Buddy')
      .map((d, i) => ({
        id: `${uri.fsPath}-${d.range.start.line}-${i}`,
        file: uri.fsPath,
        line: d.range.start.line + 1,
        severity: this.mapSeverity(d.severity),
        message: d.message,
        timestamp: Date.now(),
      }));

    if (codeBuddyIssues.length > 0) {
      this.issues.set(uri.fsPath, codeBuddyIssues);
    } else {
      this.issues.delete(uri.fsPath);
    }
  }

  private mapSeverity(severity: vscode.DiagnosticSeverity): 'error' | 'warning' | 'info' {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      default:
        return 'info';
    }
  }

  addIssues(file: string, issues: CodeIssue[]): void {
    this.issues.set(file, issues);
    this.refresh();
  }

  clearIssues(file?: string): void {
    if (file) {
      this.issues.delete(file);
    } else {
      this.issues.clear();
    }
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: IssueItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: IssueItem): Thenable<IssueItem[]> {
    if (!element) {
      // Root level - show files with issues
      const files = Array.from(this.issues.keys());
      if (files.length === 0) {
        return Promise.resolve([
          new IssueItem(
            'No issues detected',
            '',
            vscode.TreeItemCollapsibleState.None,
            'empty'
          ),
        ]);
      }
      return Promise.resolve(
        files.map(file => {
          const fileIssues = this.issues.get(file) || [];
          const errorCount = fileIssues.filter(i => i.severity === 'error').length;
          const warnCount = fileIssues.filter(i => i.severity === 'warning').length;
          const relativePath = vscode.workspace.asRelativePath(file);

          return new IssueItem(
            relativePath,
            file,
            vscode.TreeItemCollapsibleState.Expanded,
            'file',
            undefined,
            `${errorCount} errors, ${warnCount} warnings`
          );
        })
      );
    } else if (element.type === 'file') {
      // File level - show individual issues
      const fileIssues = this.issues.get(element.filePath) || [];
      return Promise.resolve(
        fileIssues.map(issue => new IssueItem(
          `Line ${issue.line}: ${issue.message}`,
          element.filePath,
          vscode.TreeItemCollapsibleState.None,
          'issue',
          issue
        ))
      );
    }
    return Promise.resolve([]);
  }

  getTotalIssueCount(): { errors: number; warnings: number; info: number } {
    let errors = 0;
    let warnings = 0;
    let info = 0;

    for (const issues of this.issues.values()) {
      for (const issue of issues) {
        if (issue.severity === 'error') errors++;
        else if (issue.severity === 'warning') warnings++;
        else info++;
      }
    }

    return { errors, warnings, info };
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

class IssueItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'file' | 'issue' | 'empty',
    public readonly issue?: CodeIssue,
    public readonly description?: string
  ) {
    super(label, collapsibleState);

    this.tooltip = issue?.suggestion || this.label;
    this.description = description;

    if (type === 'file') {
      this.iconPath = new vscode.ThemeIcon('file');
      this.contextValue = 'issueFile';
    } else if (type === 'issue' && issue) {
      this.iconPath = new vscode.ThemeIcon(
        issue.severity === 'error' ? 'error' :
        issue.severity === 'warning' ? 'warning' : 'info'
      );
      this.contextValue = 'issue';
      this.command = {
        command: 'codebuddy.goToIssue',
        title: 'Go to Issue',
        arguments: [this.filePath, issue.line],
      };
    } else if (type === 'empty') {
      this.iconPath = new vscode.ThemeIcon('check');
    }
  }
}
