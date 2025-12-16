/**
 * Flow State Detection
 * Windsurf-inspired feature that detects what the user is working on
 * and provides contextual suggestions
 */
import * as vscode from 'vscode';
import { AIClient } from './ai-client';
export interface FlowContext {
    currentTask: string;
    relevantFiles: string[];
    recentEdits: EditInfo[];
    suggestedActions: FlowAction[];
    confidence: number;
}
export interface EditInfo {
    file: string;
    timestamp: number;
    changeType: 'add' | 'modify' | 'delete';
    summary: string;
}
export interface FlowAction {
    id: string;
    label: string;
    description: string;
    command: string;
    args?: unknown[];
    priority: number;
}
export declare class FlowStateDetector implements vscode.Disposable {
    private readonly aiClient;
    private disposables;
    private recentEdits;
    private currentFlow;
    private flowUpdateTimer;
    private readonly maxRecentEdits;
    private readonly flowUpdateDebounce;
    private _onFlowChange;
    readonly onFlowChange: vscode.Event<FlowContext>;
    constructor(aiClient: AIClient);
    private setupListeners;
    private trackEdit;
    private trackFileOpen;
    private trackFileSave;
    private scheduleFlowUpdate;
    /**
     * Update the current flow state using AI
     */
    private updateFlow;
    /**
     * Get the current flow context
     */
    getFlow(): FlowContext | null;
    /**
     * Get suggested actions based on current flow
     */
    getSuggestedActions(): FlowAction[];
    /**
     * Get default actions when no flow is detected
     */
    private getDefaultActions;
    /**
     * Get contextual actions based on current state
     */
    private getContextualActions;
    /**
     * Clear flow state
     */
    clearFlow(): void;
    dispose(): void;
}
//# sourceMappingURL=flow-state.d.ts.map