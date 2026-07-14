/**
 * Webhook types and interfaces
 */

export enum WebhookEvent {
  TEST_COMPLETED = 'test_completed',
  BUG_CREATED = 'bug_created',
  APPROVAL_NEEDED = 'approval_needed'
}

export interface Endpoint {
  url: string;
  secret: string;
  active: boolean;
  created_at: Date;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface DeliveryResult {
  endpoint: Endpoint;
  success: boolean;
  error?: string;
  retries: number;
  timestamp: Date;
}
