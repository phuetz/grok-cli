"use strict";
/**
 * Git Integration
 * Generate commit messages, PR descriptions, etc.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitIntegration = void 0;
const vscode = __importStar(require("vscode"));
class GitIntegration {
    constructor(aiClient) {
        this.aiClient = aiClient;
    }
    /**
     * Generate a commit message based on staged changes
     */
    async generateCommitMessage() {
        try {
            // Get the git extension
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                vscode.window.showErrorMessage('Git extension not found');
                return;
            }
            const git = gitExtension.exports.getAPI(1);
            if (!git.repositories.length) {
                vscode.window.showErrorMessage('No git repository found');
                return;
            }
            const repo = git.repositories[0];
            // Get staged changes
            const stagedChanges = repo.state.indexChanges;
            if (!stagedChanges.length) {
                vscode.window.showWarningMessage('No staged changes. Stage some files first.');
                return;
            }
            // Get diff of staged changes
            const diffs = [];
            for (const change of stagedChanges) {
                try {
                    const diff = await repo.diffIndexWithHEAD(change.uri.fsPath);
                    if (diff) {
                        diffs.push(`File: ${change.uri.fsPath}\n${diff}`);
                    }
                }
                catch {
                    // Skip files that can't be diffed
                }
            }
            if (!diffs.length) {
                vscode.window.showWarningMessage('Could not get diff for staged changes');
                return;
            }
            // Generate commit message
            const commitMessage = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Generating commit message...' }, async () => {
                return await this.aiClient.chat([
                    {
                        role: 'system',
                        content: `You are an expert at writing clear, concise git commit messages following conventional commits format.

Rules:
- Use format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep first line under 72 characters
- Add body with bullet points if needed
- Be specific about what changed and why`,
                    },
                    {
                        role: 'user',
                        content: `Generate a commit message for these changes:\n\n${diffs.slice(0, 3).join('\n\n---\n\n')}`,
                    },
                ]);
            });
            // Extract just the commit message (remove markdown formatting)
            const cleanMessage = commitMessage
                .replace(/```[a-z]*\n?/g, '')
                .replace(/```/g, '')
                .trim();
            // Insert into SCM input
            if (repo.inputBox) {
                repo.inputBox.value = cleanMessage;
                vscode.window.showInformationMessage('Commit message generated! Review and commit.');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to generate commit message: ${message}`);
        }
    }
    /**
     * Generate a PR description
     */
    async generatePRDescription() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                throw new Error('Git extension not found');
            }
            const git = gitExtension.exports.getAPI(1);
            if (!git.repositories.length) {
                throw new Error('No git repository found');
            }
            const repo = git.repositories[0];
            const currentBranch = repo.state.HEAD?.name;
            if (!currentBranch) {
                throw new Error('Could not determine current branch');
            }
            // Get commits on this branch (compared to main/master)
            const baseBranch = await this.getBaseBranch(repo);
            // Get log of commits
            const log = await repo.log({ range: `${baseBranch}..${currentBranch}`, maxEntries: 20 });
            if (!log.length) {
                throw new Error('No commits found on this branch');
            }
            const commitMessages = log.map((c) => c.message).join('\n');
            const prDescription = await this.aiClient.chat([
                {
                    role: 'system',
                    content: `You are an expert at writing clear PR descriptions. Create a well-structured PR description with:
- A summary of what this PR does
- Key changes as bullet points
- Any breaking changes or considerations
- Testing notes if applicable`,
                },
                {
                    role: 'user',
                    content: `Generate a PR description based on these commits:\n\n${commitMessages}`,
                },
            ]);
            return prDescription;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to generate PR description: ${message}`);
        }
    }
    async getBaseBranch(repo) {
        try {
            // Try common base branches
            const branches = await repo.getBranches({ remote: true });
            const baseBranches = ['main', 'master', 'develop'];
            for (const base of baseBranches) {
                if (branches.find((b) => b.name === `origin/${base}`)) {
                    return `origin/${base}`;
                }
            }
            return 'origin/main';
        }
        catch {
            return 'origin/main';
        }
    }
}
exports.GitIntegration = GitIntegration;
//# sourceMappingURL=git-integration.js.map