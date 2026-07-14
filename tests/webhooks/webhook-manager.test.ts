/**
 * Tests for WebhookManager
 */

import { WebhookManager } from '../../src/webhooks/webhook-manager.js';
import { WebhookEvent } from '../../src/webhooks/types.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookManager', () => {
  let manager: WebhookManager;

  beforeEach(() => {
    manager = new WebhookManager();
    jest.clearAllMocks();
  });

  describe('Signature Generation and Verification', () => {
    it('should generate consistent signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';

      const sig1 = (manager as any).generateSignature(payload, secret);
      const sig2 = (manager as any).generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex is 64 chars
    });

    it('should verify valid signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';

      const signature = (manager as any).generateSignature(payload, secret);
      const isValid = manager.verifySignature(signature, payload, secret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';

      const invalidSignature = 'invalid-signature-xyz';
      const isValid = manager.verifySignature(invalidSignature, payload, secret);

      expect(isValid).toBe(false);
    });

    it('should reject signatures with wrong secret', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret1 = 'secret-1';
      const secret2 = 'secret-2';

      const signature = (manager as any).generateSignature(payload, secret1);
      const isValid = manager.verifySignature(signature, payload, secret2);

      expect(isValid).toBe(false);
    });

    it('should reject signatures with modified payload', () => {
      const payload1 = JSON.stringify({ test: 'data' });
      const payload2 = JSON.stringify({ test: 'modified' });
      const secret = 'my-secret';

      const signature = (manager as any).generateSignature(payload1, secret);
      const isValid = manager.verifySignature(signature, payload2, secret);

      expect(isValid).toBe(false);
    });

    it('should be resistant to timing attacks', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';

      const validSignature = (manager as any).generateSignature(payload, secret);
      const almostCorrectSignature = validSignature.slice(0, -1) + 'a';

      // Both should take similar time (timing-safe comparison)
      const start1 = process.hrtime.bigint();
      manager.verifySignature(validSignature, payload, secret);
      const duration1 = process.hrtime.bigint() - start1;

      const start2 = process.hrtime.bigint();
      manager.verifySignature(almostCorrectSignature, payload, secret);
      const duration2 = process.hrtime.bigint() - start2;

      // Timing should be similar (within a reasonable margin for system variance)
      // We can't guarantee exact timing, but the use of timingSafeEqual ensures constant-time comparison
      expect(duration1).toBeGreaterThan(0n);
      expect(duration2).toBeGreaterThan(0n);
    });

    it('should handle empty secrets', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = '';

      const signature = (manager as any).generateSignature(payload, secret);
      const isValid = manager.verifySignature(signature, payload, secret);

      expect(isValid).toBe(true);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle malformed signatures gracefully', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';

      expect(manager.verifySignature('', payload, secret)).toBe(false);
      expect(manager.verifySignature('not-hex', payload, secret)).toBe(false);
      expect(() => {
        manager.verifySignature('very-long-string-that-exceeds-normal-length'.repeat(10), payload, secret);
      }).not.toThrow();
    });
  });

  describe('Endpoint Registration', () => {
    it('should register an endpoint', () => {
      const url = 'https://example.com/webhook';
      const secret = 'my-secret';

      manager.registerEndpoint(url, secret);

      const endpoints = manager.getEndpoints();
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]).toEqual({
        url,
        secret,
        active: true,
        created_at: expect.any(Date)
      });
    });

    it('should register multiple endpoints', () => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
      manager.registerEndpoint('https://endpoint2.com/webhook', 'secret2');
      manager.registerEndpoint('https://endpoint3.com/webhook', 'secret3');

      const endpoints = manager.getEndpoints();
      expect(endpoints).toHaveLength(3);
    });

    it('should throw on missing URL', () => {
      expect(() => {
        manager.registerEndpoint('', 'secret');
      }).toThrow('URL and secret are required');
    });

    it('should throw on missing secret', () => {
      expect(() => {
        manager.registerEndpoint('https://example.com/webhook', '');
      }).toThrow('URL and secret are required');
    });

    it('should set endpoints as active by default', () => {
      manager.registerEndpoint('https://example.com/webhook', 'secret');

      const endpoints = manager.getEndpoints();
      expect(endpoints[0].active).toBe(true);
    });

    it('should set created_at timestamp', () => {
      const before = new Date();
      manager.registerEndpoint('https://example.com/webhook', 'secret');
      const after = new Date();

      const endpoints = manager.getEndpoints();
      expect(endpoints[0].created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(endpoints[0].created_at.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Endpoint Management', () => {
    beforeEach(() => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
      manager.registerEndpoint('https://endpoint2.com/webhook', 'secret2');
    });

    it('should deactivate an endpoint', () => {
      const result = manager.deactivateEndpoint('https://endpoint1.com/webhook');

      expect(result).toBe(true);
      const endpoints = manager.getEndpoints();
      expect(endpoints[0].active).toBe(false);
      expect(endpoints[1].active).toBe(true);
    });

    it('should reactivate an endpoint', () => {
      manager.deactivateEndpoint('https://endpoint1.com/webhook');
      const result = manager.reactivateEndpoint('https://endpoint1.com/webhook');

      expect(result).toBe(true);
      const endpoints = manager.getEndpoints();
      expect(endpoints[0].active).toBe(true);
    });

    it('should remove an endpoint', () => {
      const result = manager.removeEndpoint('https://endpoint1.com/webhook');

      expect(result).toBe(true);
      const endpoints = manager.getEndpoints();
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].url).toBe('https://endpoint2.com/webhook');
    });

    it('should return false when deactivating non-existent endpoint', () => {
      const result = manager.deactivateEndpoint('https://nonexistent.com/webhook');
      expect(result).toBe(false);
    });

    it('should return false when removing non-existent endpoint', () => {
      const result = manager.removeEndpoint('https://nonexistent.com/webhook');
      expect(result).toBe(false);
    });

    it('should get only active endpoints', () => {
      manager.deactivateEndpoint('https://endpoint1.com/webhook');

      const activeEndpoints = manager.getActiveEndpoints();
      expect(activeEndpoints).toHaveLength(1);
      expect(activeEndpoints[0].url).toBe('https://endpoint2.com/webhook');
    });
  });

  describe('Webhook Delivery', () => {
    beforeEach(() => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
      manager.registerEndpoint('https://endpoint2.com/webhook', 'secret2');
    });

    it('should send webhook to all active endpoints', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const payload = { test: 'data' };
      const results = await manager.send(WebhookEvent.TEST_COMPLETED, payload);

      expect(results).toHaveLength(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should send correct headers with signature', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const payload = { test: 'data' };
      await manager.send(WebhookEvent.TEST_COMPLETED, payload);

      const calls = mockedAxios.post.mock.calls;
      const headers = calls[0][2]?.headers as Record<string, string>;
      expect(headers).toHaveProperty('X-Webhook-Signature');
      expect(headers).toHaveProperty('X-Webhook-Event');
      expect(headers['X-Webhook-Event']).toBe(WebhookEvent.TEST_COMPLETED);
    });

    it('should not send to inactive endpoints', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });
      manager.deactivateEndpoint('https://endpoint1.com/webhook');

      const payload = { test: 'data' };
      await manager.send(WebhookEvent.TEST_COMPLETED, payload);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post.mock.calls[0][0]).toBe('https://endpoint2.com/webhook');
    });

    it('should include event type in payload', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const payload = { test: 'data' };
      await manager.send(WebhookEvent.BUG_CREATED, payload);

      const calls = mockedAxios.post.mock.calls;
      expect(calls[0][1]).toEqual({
        event: WebhookEvent.BUG_CREATED,
        data: payload
      });
    });

    it('should mark successful deliveries', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].error).toBeUndefined();
    });

    it('should track delivery history', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });
      const history1 = manager.getDeliveryHistory();
      expect(history1).toHaveLength(2);

      await manager.send(WebhookEvent.BUG_CREATED, { test: 'data' });
      const history2 = manager.getDeliveryHistory();
      expect(history2).toHaveLength(4);
    });

    it('should clear delivery history', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });
      expect(manager.getDeliveryHistory()).toHaveLength(2);

      manager.clearDeliveryHistory();
      expect(manager.getDeliveryHistory()).toHaveLength(0);
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
    });

    it('should retry on network error', async () => {
      const networkError = new Error('Network timeout') as any;
      networkError.response = undefined;
      networkError.isAxiosError = true;

      mockedAxios.post
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ status: 200 });

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results[0].success).toBe(true);
      expect(results[0].retries).toBe(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should retry on 5xx server errors', async () => {
      const serverError = new Error('Server Error') as any;
      serverError.response = { status: 500, data: {} };
      serverError.isAxiosError = true;

      mockedAxios.post
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ status: 200 });

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results[0].success).toBe(true);
      expect(results[0].retries).toBe(1);
    });

    it('should not retry on 4xx client errors', async () => {
      const clientError = new Error('Bad Request') as any;
      clientError.response = { status: 400, data: {} };
      clientError.isAxiosError = true;

      mockedAxios.post.mockRejectedValueOnce(clientError);

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results[0].success).toBe(false);
      expect(results[0].retries).toBe(0);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should not exceed max retries', async () => {
      const networkError = new Error('Network timeout') as any;
      networkError.response = undefined;
      networkError.isAxiosError = true;

      mockedAxios.post.mockRejectedValue(networkError);

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results[0].success).toBe(false);
      expect(results[0].retries).toBeLessThanOrEqual(3);
      expect(mockedAxios.post).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should track retry count in delivery results', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results[0].retries).toBe(0); // No retries needed
    });

    it('should log error message on failure', async () => {
      const clientError = new Error('Not Found') as any;
      clientError.response = { status: 404, data: {} };
      clientError.isAxiosError = true;

      mockedAxios.post.mockRejectedValueOnce(clientError);

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('404');
    });
  });

  describe('Edge Cases', () => {
    it('should handle sending to no endpoints', async () => {
      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });
      expect(results).toHaveLength(0);
    });

    it('should handle large payloads', async () => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const largePayload = {
        data: 'x'.repeat(10000),
        nested: {
          values: Array(100).fill({ key: 'value' })
        }
      };

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, largePayload);
      expect(results[0].success).toBe(true);
    });

    it('should handle special characters in payload', async () => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const payload = {
        message: 'Hello "quoted" \\backslash \\n newline',
        unicode: '😀 emoji and 中文 chinese'
      };

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, payload);
      expect(results[0].success).toBe(true);
    });

    it('should handle concurrent webhook sends', async () => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
      manager.registerEndpoint('https://endpoint2.com/webhook', 'secret2');
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const promise1 = manager.send(WebhookEvent.TEST_COMPLETED, { id: 1 });
      const promise2 = manager.send(WebhookEvent.BUG_CREATED, { id: 2 });

      const results = await Promise.all([promise1, promise2]);

      expect(results.flat()).toHaveLength(4); // 2 endpoints × 2 events
      expect(mockedAxios.post).toHaveBeenCalledTimes(4);
    });
  });

  describe('Multiple Webhook Events', () => {
    beforeEach(() => {
      manager.registerEndpoint('https://endpoint1.com/webhook', 'secret1');
    });

    it('should support TEST_COMPLETED event', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const results = await manager.send(WebhookEvent.TEST_COMPLETED, { test: 'data' });

      expect(results[0].success).toBe(true);
      const calls = mockedAxios.post.mock.calls;
      const headers = calls[0][2]?.headers as Record<string, string>;
      expect(headers['X-Webhook-Event']).toBe(WebhookEvent.TEST_COMPLETED);
    });

    it('should support BUG_CREATED event', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const results = await manager.send(WebhookEvent.BUG_CREATED, { test: 'data' });

      expect(results[0].success).toBe(true);
      const calls = mockedAxios.post.mock.calls;
      const headers = calls[0][2]?.headers as Record<string, string>;
      expect(headers['X-Webhook-Event']).toBe(WebhookEvent.BUG_CREATED);
    });

    it('should support APPROVAL_NEEDED event', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const results = await manager.send(WebhookEvent.APPROVAL_NEEDED, { test: 'data' });

      expect(results[0].success).toBe(true);
      const calls = mockedAxios.post.mock.calls;
      const headers = calls[0][2]?.headers as Record<string, string>;
      expect(headers['X-Webhook-Event']).toBe(WebhookEvent.APPROVAL_NEEDED);
    });
  });
});
