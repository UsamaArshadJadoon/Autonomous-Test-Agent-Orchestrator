/**
 * Execution Status enumeration
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  FETCHING_STORY = 'fetching_story',
  GENERATING_TESTS = 'generating_tests',
  ANALYZING_GAPS = 'analyzing_gaps',
  EXECUTING_TESTS = 'executing_tests',
  REVIEWING_RESULTS = 'reviewing_results',
  AWAITING_APPROVAL = 'awaiting_approval',
  LOGGING_BUGS = 'logging_bugs',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Execution State interface for tracking execution progress
 */
export interface ExecutionState {
  execution_id: string;
  story_key: string;
  environment: string;
  mode: 'smoke' | 'full' | 'regression';
  status: ExecutionStatus;

  // Test metrics
  tests_generated: number;
  tests_passed: number;
  tests_failed: number;

  // Results
  bugs_created: string[];
  approval_status: 'pending' | 'approved' | 'rejected';

  // Timestamps
  started_at: Date;
  completed_at?: Date;

  // Error tracking
  errors: Array<{
    timestamp: Date;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

/**
 * Update object for partial state updates
 */
export interface ExecutionStateUpdate {
  status?: ExecutionStatus;
  tests_generated?: number;
  tests_passed?: number;
  tests_failed?: number;
  bugs_created?: string[];
  approval_status?: 'pending' | 'approved' | 'rejected';
  error?: { message: string; severity: 'info' | 'warning' | 'error' };
}
