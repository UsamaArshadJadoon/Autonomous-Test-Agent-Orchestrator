import { ReviewerAgent, AcceptanceCriteria } from '../../src/agents/reviewer-agent.js';
import { ExecutionResult, TestExecutionDetail } from '../../src/agents/test-executor-agent.js';
import { Logger } from '../../src/logging/logger.js';

jest.mock('../../src/logging/logger.js');

describe('ReviewerAgent', () => {
  let agent: ReviewerAgent;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    agent = new ReviewerAgent(mockLogger);
  });

  describe('review - Approval Cases', () => {
    it('should approve when all AC covered and all tests pass', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'User can login' },
        { id: 'AC-2', description: 'User can logout' },
        { id: 'AC-3', description: 'Session persists' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1 login',
          passed: true,
          screenshots: ['screenshot1.png'],
          consoleLogs: [],
          duration: 1000,
        },
        {
          testId: 'test-AC-2',
          testName: 'Test AC-2 logout',
          passed: true,
          screenshots: ['screenshot2.png'],
          consoleLogs: [],
          duration: 800,
        },
        {
          testId: 'test-AC-3',
          testName: 'Test AC-3 session',
          passed: true,
          screenshots: ['screenshot3.png'],
          consoleLogs: [],
          duration: 1200,
        },
      ];

      const result: ExecutionResult = {
        passed: 3,
        failed: 0,
        screenshots: ['screenshot1.png', 'screenshot2.png', 'screenshot3.png'],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.approved).toBe(true);
      expect(review.passed_tests).toBe(3);
      expect(review.failed_tests).toBe(0);
      expect(review.coverage_percent).toBe(100);
      expect(review.ac_covered).toBe(3);
      expect(review.ac_uncovered).toHaveLength(0);
      expect(review.issues).toEqual([]);
    });

    it('should approve with multiple passing tests exceeding AC count', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature X works' },
        { id: 'AC-2', description: 'Feature Y works' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-1',
          testName: 'Feature X positive case',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
        {
          testId: 'test-2',
          testName: 'Feature X edge case',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 600,
        },
        {
          testId: 'test-3',
          testName: 'Feature Y positive case',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 700,
        },
        {
          testId: 'test-4',
          testName: 'Feature Y edge case',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 650,
        },
      ];

      const result: ExecutionResult = {
        passed: 4,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.approved).toBe(true);
      expect(review.total_tests).toBe(4);
      expect(review.coverage_percent).toBe(100);
    });
  });

  describe('review - Rejection Cases', () => {
    it('should reject when tests fail', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Login works' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: false,
          error: 'Selector not found',
          screenshots: ['failure.png'],
          consoleLogs: ['Error: element not found'],
          duration: 2000,
        },
      ];

      const result: ExecutionResult = {
        passed: 0,
        failed: 1,
        screenshots: ['failure.png'],
        logs: ['Error: element not found'],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.approved).toBe(false);
      expect(review.failed_tests).toBe(1);
      expect(review.issues).toContainEqual(
        expect.objectContaining({
          severity: 'critical',
          code: 'FAILED_TESTS',
        })
      );
    });

    it('should reject when AC coverage is incomplete', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature A' },
        { id: 'AC-2', description: 'Feature B' },
        { id: 'AC-3', description: 'Feature C' },
        { id: 'AC-4', description: 'Feature D' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
        {
          testId: 'test-AC-2',
          testName: 'Test AC-2',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 600,
        },
      ];

      const result: ExecutionResult = {
        passed: 2,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.approved).toBe(false);
      expect(review.coverage_percent).toBe(50);
      expect(review.ac_uncovered).toContain('AC-3');
      expect(review.ac_uncovered).toContain('AC-4');
      expect(review.issues).toContainEqual(
        expect.objectContaining({
          code: 'INCOMPLETE_AC_COVERAGE',
        })
      );
    });

    it('should reject when no tests executed', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature X' },
      ];

      const result: ExecutionResult = {
        passed: 0,
        failed: 0,
        screenshots: [],
        logs: [],
        details: [],
      };

      const review = agent.review(result, ac);

      expect(review.approved).toBe(false);
      expect(review.total_tests).toBe(0);
      expect(review.issues).toContainEqual(
        expect.objectContaining({
          code: 'NO_TESTS_EXECUTED',
          severity: 'critical',
        })
      );
    });

    it('should identify low coverage as critical issue', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature 1' },
        { id: 'AC-2', description: 'Feature 2' },
        { id: 'AC-3', description: 'Feature 3' },
        { id: 'AC-4', description: 'Feature 4' },
        { id: 'AC-5', description: 'Feature 5' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-1',
          testName: 'Test one',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
      ];

      const result: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.approved).toBe(false);
      expect(review.coverage_percent).toBe(20);

      const lowCoverageIssue = review.issues.find(
        i => i.code === 'INCOMPLETE_AC_COVERAGE'
      );
      expect(lowCoverageIssue?.severity).toBe('critical');
    });
  });

  describe('review - Recommendations', () => {
    it('should recommend investigation when tests fail despite partial coverage', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature works' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: false,
          error: 'Timeout',
          screenshots: [],
          consoleLogs: [],
          duration: 5000,
        },
      ];

      const result: ExecutionResult = {
        passed: 0,
        failed: 1,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'investigation',
          message: expect.stringContaining('Investigate failed tests'),
        })
      );
    });

    it('should recommend adding evidence when no screenshots captured', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Login' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
      ];

      const result: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      const screenshotRec = review.recommendations.find(
        r => r.message.includes('screenshot')
      );
      expect(screenshotRec).toBeDefined();
      expect(screenshotRec?.type).toBe('improvement');
    });

    it('should recommend action when insufficient test count', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature 1' },
        { id: 'AC-2', description: 'Feature 2' },
        { id: 'AC-3', description: 'Feature 3' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-1',
          testName: 'Test 1',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
      ];

      const result: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'action_required',
          message: expect.stringMatching(/Expected at least 3 tests/),
        })
      );
    });

    it('should warn about error logs when all tests pass', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Login' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: true,
          screenshots: [],
          consoleLogs: ['[error] Something failed but recovered'],
          duration: 500,
        },
      ];

      const result: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: ['[error] Something failed but recovered'],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'investigation',
          message: expect.stringContaining('Found 1 error logs'),
        })
      );
    });
  });

  describe('review - Edge Cases', () => {
    it('should handle empty acceptance criteria list', () => {
      const ac: AcceptanceCriteria[] = [];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-1',
          testName: 'General test',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
      ];

      const result: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.coverage_percent).toBe(100);
      expect(review.total_ac).toBe(0);
      expect(review.ac_covered).toBe(0);
    });

    it('should calculate coverage correctly with mixed test results', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature 1' },
        { id: 'AC-2', description: 'Feature 2' },
        { id: 'AC-3', description: 'Feature 3' },
        { id: 'AC-4', description: 'Feature 4' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
        {
          testId: 'test-AC-2',
          testName: 'Test AC-2',
          passed: false,
          error: 'Failed',
          screenshots: [],
          consoleLogs: [],
          duration: 1000,
        },
        {
          testId: 'test-AC-3',
          testName: 'Test AC-3',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 600,
        },
      ];

      const result: ExecutionResult = {
        passed: 2,
        failed: 1,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.passed_tests).toBe(2);
      expect(review.failed_tests).toBe(1);
      expect(review.total_tests).toBe(3);
    });
  });

  describe('generateReviewReport', () => {
    it('should generate comprehensive report for approved review', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Login' },
        { id: 'AC-2', description: 'Logout' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
        {
          testId: 'test-AC-2',
          testName: 'Test AC-2',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 600,
        },
      ];

      const result: ExecutionResult = {
        passed: 2,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);
      const report = agent.generateReviewReport(review);

      expect(report).toContain('=== QA Review Report ===');
      expect(report).toContain('Status: APPROVED');
      expect(report).toContain('Total Tests: 2');
      expect(report).toContain('Passed: 2');
      expect(report).toContain('Failed: 0');
      expect(report).toContain('100.00%');
      expect(report).toContain('AC: 2');
    });

    it('should generate comprehensive report for rejected review', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Login' },
        { id: 'AC-2', description: 'Logout' },
        { id: 'AC-3', description: 'Session' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: false,
          error: 'Element not found',
          screenshots: ['failure.png'],
          consoleLogs: ['Error'],
          duration: 2000,
        },
      ];

      const result: ExecutionResult = {
        passed: 0,
        failed: 1,
        screenshots: ['failure.png'],
        logs: ['Error'],
        details: executionDetails,
      };

      const review = agent.review(result, ac);
      const report = agent.generateReviewReport(review);

      expect(report).toContain('Status: REJECTED');
      expect(report).toContain('--- Issues ---');
      expect(report).toContain('FAILED_TESTS');
      expect(report).toContain('Uncovered AC:');
      expect(report).toContain('AC-2');
      expect(report).toContain('AC-3');
    });

    it('should include all sections in report when issues and recommendations exist', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature A' },
        { id: 'AC-2', description: 'Feature B' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-1',
          testName: 'Test 1',
          passed: true,
          screenshots: [],
          consoleLogs: ['[error] Some warning'],
          duration: 500,
        },
      ];

      const result: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: ['[error] Some warning'],
        details: executionDetails,
      };

      const review = agent.review(result, ac);
      const report = agent.generateReviewReport(review);

      expect(report).toContain('Test Execution Results');
      expect(report).toContain('Acceptance Criteria Coverage');
      expect(report).toContain('Recommendations');
      expect(report).toContain('Reviewed at:');
    });
  });

  describe('review - Summary Generation', () => {
    it('should include test counts and status in summary', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Test feature' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-AC-1',
          testName: 'Test AC-1',
          passed: true,
          screenshots: [],
          consoleLogs: [],
          duration: 500,
        },
      ];

      const result: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.summary).toContain('APPROVED FOR DEPLOYMENT');
      expect(review.summary).toContain('1 passed');
      expect(review.summary).toContain('All acceptance criteria covered');
    });

    it('should indicate blocked status when critical issues exist', () => {
      const ac: AcceptanceCriteria[] = [
        { id: 'AC-1', description: 'Feature' },
      ];

      const executionDetails: TestExecutionDetail[] = [
        {
          testId: 'test-1',
          testName: 'Test',
          passed: false,
          error: 'Failed',
          screenshots: [],
          consoleLogs: [],
          duration: 1000,
        },
      ];

      const result: ExecutionResult = {
        passed: 0,
        failed: 1,
        screenshots: [],
        logs: [],
        details: executionDetails,
      };

      const review = agent.review(result, ac);

      expect(review.summary).toContain('BLOCKED');
      expect(review.summary).toContain('1 failed');
    });
  });
});
