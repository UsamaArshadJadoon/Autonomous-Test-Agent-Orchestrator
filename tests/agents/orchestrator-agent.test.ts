import { OrchestratorAgent, OrchestrationConfig, OrchestrationResult } from '../../src/agents/orchestrator-agent.js';
import { StoryAgent, ParsedStory } from '../../src/agents/story-agent.js';
import { TestWriterAgent, TestCase as WriterTestCase } from '../../src/agents/test-writer-agent.js';
import { GapAnalyzerAgent, GapAnalysisResult } from '../../src/agents/gap-analyzer-agent.js';
import { TestExecutorAgent, ExecutionResult } from '../../src/agents/test-executor-agent.js';
import { ReviewerAgent, ReviewResult } from '../../src/agents/reviewer-agent.js';
import { BugLoggerAgent, BugCreationResult } from '../../src/agents/bug-logger-agent.js';
import { Logger } from '../../src/logging/logger.js';

jest.mock('../../src/agents/story-agent.js');
jest.mock('../../src/agents/test-writer-agent.js');
jest.mock('../../src/agents/gap-analyzer-agent.js');
jest.mock('../../src/agents/test-executor-agent.js');
jest.mock('../../src/agents/reviewer-agent.js');
jest.mock('../../src/agents/bug-logger-agent.js');

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;
  let mockStoryAgent: jest.Mocked<StoryAgent>;
  let mockTestWriterAgent: jest.Mocked<TestWriterAgent>;
  let mockGapAnalyzerAgent: jest.Mocked<GapAnalyzerAgent>;
  let mockTestExecutorAgent: jest.Mocked<TestExecutorAgent>;
  let mockReviewerAgent: jest.Mocked<ReviewerAgent>;
  let mockBugLoggerAgent: jest.Mocked<BugLoggerAgent>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockStoryAgent = {
      fetchAndParseStory: jest.fn(),
    } as any;

    mockTestWriterAgent = {
      generateTestCases: jest.fn(),
    } as any;

    mockGapAnalyzerAgent = {
      analyze: jest.fn(),
      generateCoverageReport: jest.fn(),
    } as any;

    mockTestExecutorAgent = {
      executeTests: jest.fn(),
      getScreenshotsDirectory: jest.fn(),
      setScreenshotsDirectory: jest.fn(),
    } as any;

    mockReviewerAgent = {
      reviewTestResults: jest.fn(),
      generateReviewReport: jest.fn(),
    } as any;

    mockBugLoggerAgent = {
      logFailuresAsJiraIssues: jest.fn(),
    } as any;

    orchestrator = new OrchestratorAgent(
      mockStoryAgent,
      mockTestWriterAgent,
      mockGapAnalyzerAgent,
      mockTestExecutorAgent,
      mockReviewerAgent,
      mockBugLoggerAgent,
      mockLogger
    );
  });

  describe('orchestrate', () => {
    it('should complete orchestration successfully with all tests passing', async () => {
      const mockStory: ParsedStory = {
        key: 'PROJ-123',
        summary: 'User Login Feature',
        acceptance_criteria: ['AC: User can login', 'AC: User sees success'],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const mockTestCases: WriterTestCase[] = [
        {
          id: 'TEST-001',
          name: 'Login test',
          steps: [{ action: 'Setup', expected: 'Setup complete' }],
          test_data: {}
        }
      ];

      const mockGapAnalysis: GapAnalysisResult = {
        covered: [],
        gaps: [],
        coverage_percent: 100,
        total_ac: 2,
        total_covered: 2,
        total_gaps: 0,
        uncovered_by_ac: []
      };

      const mockExecutionResult: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: [
          {
            testId: 'TEST-001',
            testName: 'Login test',
            passed: true,
            screenshots: [],
            consoleLogs: [],
            duration: 5000
          }
        ]
      };

      const mockReviewResult: ReviewResult = {
        status: 'success',
        total_tests: 1,
        passed_tests: 1,
        failed_tests: 0,
        pass_rate: 100,
        coverage_percent: 100,
        critical_failures: [],
        recommendations: [],
        should_log_bugs: false
      };

      mockStoryAgent.fetchAndParseStory.mockResolvedValueOnce(mockStory);
      mockTestWriterAgent.generateTestCases.mockResolvedValueOnce(mockTestCases);
      mockGapAnalyzerAgent.analyze.mockReturnValueOnce(mockGapAnalysis);
      mockTestExecutorAgent.executeTests.mockResolvedValueOnce(mockExecutionResult);
      (mockReviewerAgent.reviewTestResults as jest.Mock).mockReturnValueOnce(mockReviewResult);

      const config: OrchestrationConfig = {
        story_key: 'PROJ-123',
        environment: 'development',
        mode: 'normal'
      };

      const result = await orchestrator.orchestrate(config);

      expect(result.status).toBe('success');
      expect(result.tests_passed).toBe(1);
      expect(result.tests_failed).toBe(0);
      expect(result.coverage_percent).toBe(100);
      expect(result.story_key).toBe('PROJ-123');
    });

    it('should handle partial success with test failures', async () => {
      const mockStory: ParsedStory = {
        key: 'PROJ-124',
        summary: 'Payment Feature',
        acceptance_criteria: ['AC: Process payment', 'AC: Show receipt'],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const mockTestCases: WriterTestCase[] = [
        { id: 'TEST-001', name: 'Payment test', steps: [{ action: 'Pay', expected: 'Success' }], test_data: {} }
      ];

      const mockGapAnalysis: GapAnalysisResult = {
        covered: [],
        gaps: [],
        coverage_percent: 100,
        total_ac: 2,
        total_covered: 2,
        total_gaps: 0,
        uncovered_by_ac: []
      };

      const mockExecutionResult: ExecutionResult = {
        passed: 1,
        failed: 1,
        screenshots: [],
        logs: [],
        details: [
          { testId: 'TEST-001', testName: 'Payment test 1', passed: true, screenshots: [], consoleLogs: [], duration: 5000 },
          { testId: 'TEST-002', testName: 'Payment test 2', passed: false, error: 'Payment failed', screenshots: [], consoleLogs: [], duration: 3000 }
        ]
      };

      const mockReviewResult: ReviewResult = {
        status: 'partial',
        total_tests: 2,
        passed_tests: 1,
        failed_tests: 1,
        pass_rate: 50,
        coverage_percent: 100,
        critical_failures: [],
        recommendations: ['Fix payment tests'],
        should_log_bugs: true
      };

      const mockBugResult: BugCreationResult = {
        created_bugs: ['BUG-001'],
        errors: [],
        total_processed: 1,
        total_created: 1,
        total_failed: 0
      };

      mockStoryAgent.fetchAndParseStory.mockResolvedValueOnce(mockStory);
      mockTestWriterAgent.generateTestCases.mockResolvedValueOnce(mockTestCases);
      mockGapAnalyzerAgent.analyze.mockReturnValueOnce(mockGapAnalysis);
      mockTestExecutorAgent.executeTests.mockResolvedValueOnce(mockExecutionResult);
      (mockReviewerAgent.reviewTestResults as jest.Mock).mockReturnValueOnce(mockReviewResult);
      mockBugLoggerAgent.logFailuresAsJiraIssues.mockResolvedValueOnce(mockBugResult);

      const config: OrchestrationConfig = {
        story_key: 'PROJ-124',
        environment: 'staging',
        mode: 'normal'
      };

      const result = await orchestrator.orchestrate(config);

      expect(result.status).toBe('partial');
      expect(result.tests_passed).toBe(1);
      expect(result.tests_failed).toBe(1);
      expect(result.bugs_created).toBe(1);
    });

    it('should stop on incomplete coverage in strict mode', async () => {
      const mockStory: ParsedStory = {
        key: 'PROJ-125',
        summary: 'Search Feature',
        acceptance_criteria: ['AC: Search', 'AC: Filter', 'AC: Sort'],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const mockTestCases: WriterTestCase[] = [
        { id: 'TEST-001', name: 'Search', steps: [{ action: 'Search', expected: 'Results' }], test_data: {} }
      ];

      const mockGapAnalysis: GapAnalysisResult = {
        covered: [],
        gaps: [{ id: 'AC-2', description: 'Filter', priority: 'medium' }],
        coverage_percent: 33.33,
        total_ac: 3,
        total_covered: 1,
        total_gaps: 2,
        uncovered_by_ac: []
      };

      mockStoryAgent.fetchAndParseStory.mockResolvedValueOnce(mockStory);
      mockTestWriterAgent.generateTestCases.mockResolvedValueOnce(mockTestCases);
      mockGapAnalyzerAgent.analyze.mockReturnValueOnce(mockGapAnalysis);

      const config: OrchestrationConfig = {
        story_key: 'PROJ-125',
        environment: 'development',
        mode: 'strict'
      };

      const result = await orchestrator.orchestrate(config);

      expect(result.status).toBe('partial');
      expect(result.coverage_percent).toBe(33.33);
      expect(mockTestExecutorAgent.executeTests).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockStoryAgent.fetchAndParseStory.mockRejectedValueOnce(new Error('Failed to fetch'));

      const config: OrchestrationConfig = {
        story_key: 'PROJ-999',
        environment: 'development',
        mode: 'normal'
      };

      const result = await orchestrator.orchestrate(config);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to fetch');
    });

    it('should skip bug logging when no failures', async () => {
      const mockStory: ParsedStory = {
        key: 'PROJ-126',
        summary: 'Feature',
        acceptance_criteria: ['AC: Test'],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const mockTestCases: WriterTestCase[] = [
        { id: 'TEST-001', name: 'Test', steps: [{ action: 'Test', expected: 'Pass' }], test_data: {} }
      ];

      const mockGapAnalysis: GapAnalysisResult = {
        covered: [],
        gaps: [],
        coverage_percent: 100,
        total_ac: 1,
        total_covered: 1,
        total_gaps: 0,
        uncovered_by_ac: []
      };

      const mockExecutionResult: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: []
      };

      const mockReviewResult: ReviewResult = {
        status: 'success',
        total_tests: 1,
        passed_tests: 1,
        failed_tests: 0,
        pass_rate: 100,
        coverage_percent: 100,
        critical_failures: [],
        recommendations: [],
        should_log_bugs: false
      };

      mockStoryAgent.fetchAndParseStory.mockResolvedValueOnce(mockStory);
      mockTestWriterAgent.generateTestCases.mockResolvedValueOnce(mockTestCases);
      mockGapAnalyzerAgent.analyze.mockReturnValueOnce(mockGapAnalysis);
      mockTestExecutorAgent.executeTests.mockResolvedValueOnce(mockExecutionResult);
      (mockReviewerAgent.reviewTestResults as jest.Mock).mockReturnValueOnce(mockReviewResult);

      const config: OrchestrationConfig = {
        story_key: 'PROJ-126',
        environment: 'development',
        mode: 'normal'
      };

      await orchestrator.orchestrate(config);

      expect(mockBugLoggerAgent.logFailuresAsJiraIssues).not.toHaveBeenCalled();
    });

    it('should use custom app_url when provided', async () => {
      const mockStory: ParsedStory = {
        key: 'PROJ-127',
        summary: 'Feature',
        acceptance_criteria: ['AC: Test'],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const mockTestCases: WriterTestCase[] = [
        { id: 'TEST-001', name: 'Test', steps: [{ action: 'Test', expected: 'Pass' }], test_data: {} }
      ];

      const mockGapAnalysis: GapAnalysisResult = {
        covered: [],
        gaps: [],
        coverage_percent: 100,
        total_ac: 1,
        total_covered: 1,
        total_gaps: 0,
        uncovered_by_ac: []
      };

      const mockExecutionResult: ExecutionResult = {
        passed: 1,
        failed: 0,
        screenshots: [],
        logs: [],
        details: []
      };

      const mockReviewResult: ReviewResult = {
        status: 'success',
        total_tests: 1,
        passed_tests: 1,
        failed_tests: 0,
        pass_rate: 100,
        coverage_percent: 100,
        critical_failures: [],
        recommendations: [],
        should_log_bugs: false
      };

      mockStoryAgent.fetchAndParseStory.mockResolvedValueOnce(mockStory);
      mockTestWriterAgent.generateTestCases.mockResolvedValueOnce(mockTestCases);
      mockGapAnalyzerAgent.analyze.mockReturnValueOnce(mockGapAnalysis);
      mockTestExecutorAgent.executeTests.mockResolvedValueOnce(mockExecutionResult);
      (mockReviewerAgent.reviewTestResults as jest.Mock).mockReturnValueOnce(mockReviewResult);

      const config: OrchestrationConfig = {
        story_key: 'PROJ-127',
        environment: 'production',
        mode: 'normal',
        app_url: 'https://api.example.com'
      };

      await orchestrator.orchestrate(config);

      expect(mockTestExecutorAgent.executeTests).toHaveBeenCalledWith(
        expect.any(Array),
        'https://api.example.com',
        'production'
      );
    });
  });

  describe('getOrchestrationSummary', () => {
    it('should generate summary', () => {
      const result: OrchestrationResult = {
        status: 'success',
        tests_passed: 10,
        tests_failed: 0,
        bugs_created: 0,
        bugs_failed: 0,
        coverage_percent: 100,
        story_key: 'PROJ-123'
      };

      const summary = orchestrator.getOrchestrationSummary(result);

      expect(summary).toContain('PROJ-123');
      expect(summary).toContain('SUCCESS');
      expect(summary).toContain('10');
    });

    it('should include error in summary', () => {
      const result: OrchestrationResult = {
        status: 'error',
        tests_passed: 0,
        tests_failed: 0,
        bugs_created: 0,
        bugs_failed: 0,
        coverage_percent: 0,
        story_key: 'PROJ-999',
        error: 'Failed to fetch story'
      };

      const summary = orchestrator.getOrchestrationSummary(result);

      expect(summary).toContain('Failed to fetch story');
    });
  });
});
