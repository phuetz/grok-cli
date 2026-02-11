/**
 * Workflow Types and Interfaces
 */

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  action: string | ((context: WorkflowContext) => Promise<StepResult>);
  condition?: string | ((context: WorkflowContext) => boolean);
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  onSuccess?: string;  // Next step ID on success
  onFailure?: string;  // Next step ID on failure
  metadata?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  initialContext?: Record<string, unknown>;
  timeout?: number;
  onComplete?: string;   // Action to run on completion
  onError?: string;      // Action to run on error
  tags?: string[];
}

export interface StepResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface StepExecution {
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  result?: StepResult;
  retries: number;
}

export interface WorkflowContext {
  workflowId: string;
  instanceId: string;
  variables: Record<string, unknown>;
  stepResults: Map<string, StepResult>;
  currentStep?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowState {
  instanceId: string;
  workflowId: string;
  status: WorkflowStatus;
  context: WorkflowContext;
  stepExecutions: Map<string, StepExecution>;
  currentStepIndex: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  error?: string;
  totalDuration?: number;
}

export interface WorkflowResult {
  success: boolean;
  instanceId: string;
  workflowId: string;
  status: WorkflowStatus;
  stepResults: Map<string, StepResult>;
  finalContext: Record<string, unknown>;
  duration: number;
  error?: string;
  completedSteps: number;
  totalSteps: number;
}

export interface WorkflowExecutionOptions {
  initialContext?: Record<string, unknown>;
  startFromStep?: string;
  timeout?: number;
  onStepComplete?: (step: StepExecution) => void;
  onStepStart?: (stepId: string) => void;
}
