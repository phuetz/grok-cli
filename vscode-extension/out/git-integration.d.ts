/**
 * Git Integration
 * Generate commit messages, PR descriptions, etc.
 */
import { AIClient } from './ai-client';
export declare class GitIntegration {
    private readonly aiClient;
    constructor(aiClient: AIClient);
    /**
     * Generate a commit message based on staged changes
     */
    generateCommitMessage(): Promise<void>;
    /**
     * Generate a PR description
     */
    generatePRDescription(): Promise<string>;
    private getBaseBranch;
}
//# sourceMappingURL=git-integration.d.ts.map