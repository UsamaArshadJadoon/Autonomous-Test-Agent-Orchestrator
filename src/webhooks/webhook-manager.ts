/**
 * WebhookManager - Manages webhook signature generation, verification, and delivery
 */

import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { WebhookEvent, Endpoint, DeliveryResult } from './types.js';

export class WebhookManager {
  private endpoints: Endpoint[] = [];
  private deliveryLog: DeliveryResult[] = [];
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  /**
   * Register a new webhook endpoint
   * @param url - The webhook endpoint URL
   * @param secret - The secret key for signing
   */
  registerEndpoint(url: string, secret: string): void {
    if (!url || !secret) {
      throw new Error('URL and secret are required');
    }

    this.endpoints.push({
      url,
      secret,
      active: true,
      created_at: new Date()
    });
  }

  /**
   * Send a webhook event to all active endpoints
   * @param event - The webhook event type
   * @param payload - The event payload
   */
  async send(event: WebhookEvent, payload: unknown): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    const payloadString = JSON.stringify(payload);
    const timestamp = new Date();

    for (const endpoint of this.endpoints.filter(e => e.active)) {
      const result = await this.deliverWithRetry(
        endpoint,
        event,
        payloadString,
        timestamp
      );
      results.push(result);
      this.deliveryLog.push(result);
    }

    return results;
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWithRetry(
    endpoint: Endpoint,
    event: WebhookEvent,
    payloadString: string,
    timestamp: Date,
    attemptNumber: number = 0
  ): Promise<DeliveryResult> {
    try {
      const signature = this.generateSignature(payloadString, endpoint.secret);

      await axios.post(endpoint.url, { event, data: JSON.parse(payloadString) }, {
        headers: {
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return {
        endpoint,
        success: true,
        retries: attemptNumber,
        timestamp
      };
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      const hasRetriesLeft = attemptNumber < this.maxRetries;

      if (isRetryable && hasRetriesLeft) {
        await this.delay(this.retryDelayMs);
        return this.deliverWithRetry(
          endpoint,
          event,
          payloadString,
          timestamp,
          attemptNumber + 1
        );
      }

      const isAxiosError = error instanceof AxiosError || (error as any)?.isAxiosError;
      const errorMessage = isAxiosError
        ? `${(error as AxiosError).response?.status || 'unknown'}: ${(error as any).message}`
        : String(error);

      return {
        endpoint,
        success: false,
        error: errorMessage,
        retries: attemptNumber,
        timestamp
      };
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * @param signature - The signature to verify
   * @param payload - The payload string
   * @param secret - The shared secret
   * @returns true if signature is valid
   */
  verifySignature(signature: string, payload: string, secret: string): boolean {
    try {
      const expected = this.generateSignature(payload, secret);
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);

      // Check lengths first for timing safety
      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      // Return false on any error (e.g., invalid buffer conversion)
      return false;
    }
  }

  /**
   * Generate HMAC-SHA256 signature
   * @param payload - The payload to sign
   * @param secret - The secret key
   * @returns The hex-encoded signature
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Get all registered endpoints
   */
  getEndpoints(): Endpoint[] {
    return [...this.endpoints];
  }

  /**
   * Get active endpoints only
   */
  getActiveEndpoints(): Endpoint[] {
    return this.endpoints.filter(e => e.active);
  }

  /**
   * Deactivate an endpoint
   * @param url - The endpoint URL to deactivate
   */
  deactivateEndpoint(url: string): boolean {
    const endpoint = this.endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.active = false;
      return true;
    }
    return false;
  }

  /**
   * Reactivate an endpoint
   * @param url - The endpoint URL to reactivate
   */
  reactivateEndpoint(url: string): boolean {
    const endpoint = this.endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.active = true;
      return true;
    }
    return false;
  }

  /**
   * Remove an endpoint
   * @param url - The endpoint URL to remove
   */
  removeEndpoint(url: string): boolean {
    const index = this.endpoints.findIndex(e => e.url === url);
    if (index !== -1) {
      this.endpoints.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get delivery history
   */
  getDeliveryHistory(): DeliveryResult[] {
    return [...this.deliveryLog];
  }

  /**
   * Clear delivery history
   */
  clearDeliveryHistory(): void {
    this.deliveryLog = [];
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Check if it's an AxiosError (works with both real and mock errors)
    if (error instanceof AxiosError || (error as any)?.isAxiosError) {
      // Retry on network errors or 5xx status codes
      const axiosError = error as AxiosError;
      if (!axiosError.response) {
        return true; // Network error
      }
      const status = axiosError.response.status;
      return status >= 500 || status === 429; // Server error or rate limit
    }
    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WebhookManager;
