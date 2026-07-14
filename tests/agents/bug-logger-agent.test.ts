import { BugLoggerAgent, FailedTest } from '../../src/agents/bug-logger-agent.js';
import { JiraClient } from '../../src/jira/jira-client.js';
import { Logger } from '../../src/logging/logger.js';

jest.mock('../../src/jira/jira-client.js');

describe('BugLoggerAgent', () => {
  let agent: BugLoggerAgent;
  let mockJiraClient: jest.Mocked<JiraClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJiraClient = {
      getStory: jest.fn(),
      createIssue: jest.fn(),
      linkIssue: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    agent = new BugLoggerAgent(mockJiraClient, mockLogger);
  });

  describe('logFailuresAsJiraIssues', () => {
    it('should create a single bug issue for a failed test', async () => {
      const failedTest: FailedTest = {
        test_id: 'test-001',
        test_name: 'Login Test',
        error_message: 'Credentials invalid',
        timestamp: new Date()
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-100');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      const result = await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      expect(result.created_bugs).toEqual(['BUG-100']);
      expect(result.total_created).toBe(1);
      expect(result.total_failed).toBe(0);
      expect(result.total_processed).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should create multiple bug issues for multiple failed tests', async () => {
      const failedTests: FailedTest[] = [
        {
          test_id: 'test-001',
          test_name: 'Login Test',
          error_message: 'Credentials invalid',
          timestamp: new Date()
        },
        {
          test_id: 'test-002',
          test_name: 'Logout Test',
          error_message: 'Session not found',
          timestamp: new Date()
        },
        {
          test_id: 'test-003',
          test_name: 'Password Reset Test',
          error_message: 'Email service unavailable',
          timestamp: new Date()
        }
      ];

      mockJiraClient.createIssue
        .mockResolvedValueOnce('BUG-100')
        .mockResolvedValueOnce('BUG-101')
        .mockResolvedValueOnce('BUG-102');
      mockJiraClient.linkIssue.mockResolvedValue(undefined);

      const result = await agent.logFailuresAsJiraIssues(failedTests, 'PROJ-123');

      expect(result.created_bugs).toEqual(['BUG-100', 'BUG-101', 'BUG-102']);
      expect(result.total_created).toBe(3);
      expect(result.total_failed).toBe(0);
      expect(result.total_processed).toBe(3);
      expect(mockJiraClient.createIssue).toHaveBeenCalledTimes(3);
      expect(mockJiraClient.linkIssue).toHaveBeenCalledTimes(3);
    });

    it('should link created bugs to the original story', async () => {
      const failedTest: FailedTest = {
        test_id: 'test-001',
        test_name: 'Test Name',
        error_message: 'Error',
        timestamp: new Date()
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-100');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-456');

      expect(mockJiraClient.linkIssue).toHaveBeenCalledWith('PROJ-456', 'BUG-100', 'relates to');
    });

    it('should handle errors during issue creation gracefully', async () => {
      const failedTests: FailedTest[] = [
        {
          test_id: 'test-001',
          test_name: 'Failing Test 1',
          error_message: 'Error 1',
          timestamp: new Date()
        },
        {
          test_id: 'test-002',
          test_name: 'Failing Test 2',
          error_message: 'Error 2',
          timestamp: new Date()
        }
      ];

      mockJiraClient.createIssue
        .mockResolvedValueOnce('BUG-100')
        .mockRejectedValueOnce(new Error('Jira API error'));

      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      const result = await agent.logFailuresAsJiraIssues(failedTests, 'PROJ-123');

      expect(result.total_created).toBe(1);
      expect(result.total_failed).toBe(1);
      expect(result.created_bugs).toEqual(['BUG-100']);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].test_id).toBe('test-002');
      expect(result.errors[0].error).toContain('Jira API error');
    });

    it('should include all failure details in bug description', async () => {
      const now = new Date();
      const failedTest: FailedTest = {
        test_id: 'test-login-001',
        test_name: 'User Login With Invalid Credentials',
        error_message: 'AssertionError: Expected true but got false',
        stack_trace: 'at validateCredentials (auth.test.ts:42:15)\nat loginFlow (auth.test.ts:35:10)',
        logs: '[INFO] Starting login\n[ERROR] Authentication failed',
        screenshot_path: '/screenshots/login-failure.png',
        timestamp: now
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-100');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      expect(mockJiraClient.createIssue).toHaveBeenCalled();
      const issueCall = mockJiraClient.createIssue.mock.calls[0][0];

      expect(issueCall.title).toContain('[FAILED]');
      expect(issueCall.title).toContain('User Login With Invalid Credentials');
      expect(issueCall.description).toContain('Test Failure Details');
      expect(issueCall.description).toContain('test-login-001');
      expect(issueCall.description).toContain('AssertionError: Expected true but got false');
      expect(issueCall.description).toContain('validateCredentials');
      expect(issueCall.description).toContain('[INFO] Starting login');
      expect(issueCall.description).toContain('/screenshots/login-failure.png');
    });

    it('should extract reproduction steps from stack trace', async () => {
      const failedTest: FailedTest = {
        test_id: 'test-001',
        test_name: 'Payment Processing Test',
        error_message: 'Payment failed',
        stack_trace: `Error: Payment processing failed
        at processPayment (payment.ts:120:10)
        at checkout (checkout.ts:85:5)
        at submitOrder (order.ts:60:3)`,
        timestamp: new Date()
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-100');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      const issueCall = mockJiraClient.createIssue.mock.calls[0][0];
      expect(issueCall.reproduction_steps).toBeDefined();
      expect(issueCall.reproduction_steps.length).toBeGreaterThan(0);
    });

    it('should handle missing optional fields gracefully', async () => {
      const failedTest: FailedTest = {
        test_id: 'test-001',
        test_name: 'Simple Test',
        error_message: 'Simple error',
        timestamp: new Date()
        // No stack_trace, logs, or screenshot_path
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-100');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      const result = await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      expect(result.total_created).toBe(1);
      expect(result.total_failed).toBe(0);
      expect(mockJiraClient.createIssue).toHaveBeenCalled();
    });

    it('should process empty failed test array', async () => {
      const result = await agent.logFailuresAsJiraIssues([], 'PROJ-123');

      expect(result.total_processed).toBe(0);
      expect(result.total_created).toBe(0);
      expect(result.total_failed).toBe(0);
      expect(result.created_bugs).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(mockJiraClient.createIssue).not.toHaveBeenCalled();
    });

    it('should continue processing when one bug creation fails', async () => {
      const failedTests: FailedTest[] = [
        {
          test_id: 'test-001',
          test_name: 'Test 1',
          error_message: 'Error 1',
          timestamp: new Date()
        },
        {
          test_id: 'test-002',
          test_name: 'Test 2',
          error_message: 'Error 2',
          timestamp: new Date()
        },
        {
          test_id: 'test-003',
          test_name: 'Test 3',
          error_message: 'Error 3',
          timestamp: new Date()
        }
      ];

      mockJiraClient.createIssue
        .mockResolvedValueOnce('BUG-100')
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce('BUG-102');

      mockJiraClient.linkIssue.mockResolvedValue(undefined);

      const result = await agent.logFailuresAsJiraIssues(failedTests, 'PROJ-123');

      expect(result.total_processed).toBe(3);
      expect(result.total_created).toBe(2);
      expect(result.total_failed).toBe(1);
      expect(result.created_bugs).toContain('BUG-100');
      expect(result.created_bugs).toContain('BUG-102');
      expect(result.errors[0].test_id).toBe('test-002');
    });

    it('should log appropriate messages during processing', async () => {
      const failedTest: FailedTest = {
        test_id: 'test-001',
        test_name: 'Test Name',
        error_message: 'Error',
        timestamp: new Date()
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-100');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Processing 1 failed tests')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Created bug BUG-100')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Bug logging complete')
      );
    });

    it('should correctly build bug description with all sections', async () => {
      const now = new Date('2024-01-15T10:30:00Z');
      const failedTest: FailedTest = {
        test_id: 'test-auth-001',
        test_name: 'Authentication Failure Test',
        error_message: 'OAuth token validation failed',
        stack_trace: 'at validateToken (auth.ts:45:10)',
        logs: '[WARN] Token expired',
        screenshot_path: '/screenshots/auth-error.png',
        timestamp: now
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-200');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-789');

      const issueCall = mockJiraClient.createIssue.mock.calls[0][0];
      const description = issueCall.description;

      expect(description).toContain('h2. Test Failure Details');
      expect(description).toContain('h3. Error Message');
      expect(description).toContain('h3. Stack Trace');
      expect(description).toContain('h3. Logs');
      expect(description).toContain('h3. Screenshot');
      expect(description).toContain('test-auth-001');
      expect(description).toContain('2024-01-15T10:30:00.000Z');
    });

    it('should return BugCreationResult with correct structure', async () => {
      const failedTests: FailedTest[] = [
        {
          test_id: 'test-001',
          test_name: 'Test 1',
          error_message: 'Error',
          timestamp: new Date()
        },
        {
          test_id: 'test-002',
          test_name: 'Test 2',
          error_message: 'Error',
          timestamp: new Date()
        }
      ];

      mockJiraClient.createIssue
        .mockResolvedValueOnce('BUG-100')
        .mockResolvedValueOnce('BUG-101');
      mockJiraClient.linkIssue.mockResolvedValue(undefined);

      const result = await agent.logFailuresAsJiraIssues(failedTests, 'PROJ-123');

      expect(result).toHaveProperty('created_bugs');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('total_processed');
      expect(result).toHaveProperty('total_created');
      expect(result).toHaveProperty('total_failed');

      expect(Array.isArray(result.created_bugs)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.total_processed).toBe('number');
      expect(typeof result.total_created).toBe('number');
      expect(typeof result.total_failed).toBe('number');
    });

    it('should include test_id and test_name in error details', async () => {
      const failedTest: FailedTest = {
        test_id: 'test-failure-123',
        test_name: 'Critical Feature Test',
        error_message: 'Assertion failed',
        timestamp: new Date()
      };

      mockJiraClient.createIssue.mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      const result = await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      expect(result.errors).toHaveLength(1);
      const error = result.errors[0];
      expect(error.test_id).toBe('test-failure-123');
      expect(error.test_name).toBe('Critical Feature Test');
      expect(error.error).toContain('Connection timeout');
    });

    it('should set environment based on NODE_ENV and CI', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.CI = undefined;

      const failedTest: FailedTest = {
        test_id: 'test-001',
        test_name: 'Test',
        error_message: 'Error',
        timestamp: new Date()
      };

      mockJiraClient.createIssue.mockResolvedValueOnce('BUG-100');
      mockJiraClient.linkIssue.mockResolvedValueOnce(undefined);

      await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      const issueCall = mockJiraClient.createIssue.mock.calls[0][0];
      expect(issueCall.environment).toBeDefined();
      expect(issueCall.environment).toContain('production');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle error objects that are not Error instances', async () => {
      const failedTest: FailedTest = {
        test_id: 'test-001',
        test_name: 'Test',
        error_message: 'Error',
        timestamp: new Date()
      };

      mockJiraClient.createIssue.mockRejectedValueOnce({ message: 'Unknown error' });

      const result = await agent.logFailuresAsJiraIssues([failedTest], 'PROJ-123');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBeDefined();
    });
  });
});
