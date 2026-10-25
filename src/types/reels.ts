export type ReelStatus = 'Pending' | 'Processing' | 'Posted' | 'Failed';

export interface ReelItem {
  id: string;
  rowNumber: number;
  fileName: string;
  outline: string;
  status: ReelStatus;
  caption?: string;
  videoUrl?: string;
  instagramCreationId?: string;
  instagramPublishId?: string;
  postedAt?: string;
  scheduledTime?: string;
  error?: string;
}

export type AutomationWorkflowState = 'idle' | 'running' | 'success' | 'error';

export interface ReelsAutomationOverview {
  status: 'active' | 'paused' | 'error';
  workflowState: AutomationWorkflowState;
  scheduleDescription: string;
  nextScheduledTime: string;
  lastExecutionTime?: string;
  lastExecutionStatus?: 'success' | 'failed' | 'running';
  lastExecutionMessage?: string;
  totalPending: number;
  totalPosted: number;
  successRate: string;
}

export interface CreateReelInput {
  fileName: string;
  outline: string;
  scheduledTime?: string;
}

export interface TriggerAutomationRequest {
  reelId?: string;
  rowNumber?: number;
  forceImmediate?: boolean;
}

export interface TriggerAutomationResponse {
  success: boolean;
  message: string;
  executionId?: string;
  item?: ReelItem;
  error?: string;
}

