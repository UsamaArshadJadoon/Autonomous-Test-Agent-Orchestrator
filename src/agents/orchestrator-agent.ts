import { Logger } from '../logging/logger.js';
import { StoryAgent, ParsedStory } from './story-agent.js';
import { TestWriterAgent } from './test-writer-agent.js';
import { TestCase as WriterTestCase } from './test-writer-agent.js';
import { GapAnalyzerAgent, AcceptanceCriteria, GapAnalysisResult } from './gap-analyzer-agent.js';
import { TestExecutorAgent, ExecutionResult, TestCase } from './test-executor-agent.js';
import { ReviewerAgent, ReviewResult } from './reviewer-agent.js';
import { BugLoggerAgent, FailedTest, BugCreationResult } from './bug-logger-agent.js';

export interface OrchestrationConfig {
  story_key: string;
  environment: string;
  mode: 'strict' | 'normal' | 'lenient';
  app_url?: string;
}

export interface OrchestrationResult {
  status: 'success' | 'partial' | 'failure' | 'error';
  tests_passed: number;
  tests_failed: number;
  bugs_created: number;
  bugs_failed: number;
  coverage_percent: number;
  story_key: string;
  review_status?: string;
  error?: string;
  details?: {
    parsed_story?: ParsedStory;
    test_cases?: TestCase[];
    gap_analysis?: GapAnalysisResult;
    execution_result?: ExecutionResult;
    review_result?: ReviewResult;
    bug_result?: BugCreationResult;
  };
}

export class OrchestratorAgent {
  constructor(
    private storyAgent: StoryAgent,
    private testWriterAgent: TestWriterAgent,
    private gapAnalyzerAgent: GapAnalyzerAgent,
    private testExecutorAgent: TestExecutorAgent,
    private reviewerAgent: ReviewerAgent,
    private bugLoggerAgent: BugLoggerAgent,
    private logger: Logger
  ) {}

  async orchestrate(config: OrchestrationConfig): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.logger.info(
      `Orchestration started for story ${config.story_key} in ${config.environment} environment (${config.mode} mode)`
    );

    const result: OrchestrationResult = {
      status: 'success',
      tests_passed: 0,
      tests_failed: 0,
      bugs_created: 0,
      bugs_failed: 0,
      coverage_percent: 0,
      story_key: config.story_key,
      details: {}
    };

    try {
      // Step 1: Fetch Story
      this.logger.info('Step 1: Fetching story from JIRA...');
      const parsedStory = await this.storyAgent.fetchAndParseStory(config.story_key);
      result.details!.parsed_story = parsedStory;
      this.logger.info(`Story fetched: ${parsedStory.key} - ${parsedStory.summary}`);

      // Step 2: Generate Tests
      this.logger.info('Step 2: Generating test cases...');
      const writerTestCases = await this.testWriterAgent.generateTestCases(parsedStory);
      const executorTestCases = writerTestCases.map(tc => this.convertWriterTestCaseToExecutorTestCase(tc));
      result.details!.test_cases = executorTestCases;
      this.logger.info(`Generated ${executorTestCases.length} test cases`);

      // Convert story acceptance criteria to AcceptanceCriteria format for gap analysis
      const acceptanceCriteria: AcceptanceCriteria[] = parsedStory.acceptance_criteria.map(
        (ac, index) => ({
          id: `AC-${index + 1}`,
          description: ac,
          priority: this.determinePriority(ac)
        })
      );

      // Map test cases to AC (simple mapping based on name/content)
      const testCasesWithAC = writerTestCases.map(tc => ({
        id: tc.id,
        title: tc.name,
        description: tc.name,
        coveredAcceptanceCriteria: this.mapWriterTestCaseToAC(tc, acceptanceCriteria)
      }));

      // Step 3: Analyze Gaps
      this.logger.info('Step 3: Analyzing test coverage gaps...');
      const gapAnalysis = this.gapAnalyzerAgent.analyze(testCasesWithAC, acceptanceCriteria);
      result.details!.gap_analysis = gapAnalysis;
      result.coverage_percent = gapAnalysis.coverage_percent;
      this.logger.info(
        `Gap analysis complete: ${gapAnalysis.total_covered}/${gapAnalysis.total_ac} AC covered (${gapAnalysis.coverage_percent.toFixed(2)}%)`
      );

      // Check if we should continue based on mode
      if (config.mode === 'strict' && gapAnalysis.coverage_percent < 100) {
        this.logger.warn('Strict mode: Coverage less than 100%. Stopping orchestration.');
        result.status = 'partial';
        return result;
      }

      // Step 4: Execute Tests
      const appUrl = config.app_url || 'http://localhost:3000';
      this.logger.info(`Step 4: Executing tests against ${appUrl} in ${config.environment}...`);
      const executionResult = await this.testExecutorAgent.executeTests(
        executorTestCases,
        appUrl,
        config.environment
      );
      result.details!.execution_result = executionResult;
      result.tests_passed = executionResult.passed;
      result.tests_failed = executionResult.failed;
      this.logger.info(
        `Test execution complete: ${executionResult.passed} passed, ${executionResult.failed} failed`
      );

      // Step 5: Review Results
      this.logger.info('Step 5: Reviewing test results...');
      const reviewResult = this.reviewerAgent.reviewTestResults(executionResult, gapAnalysis);
      result.details!.review_result = reviewResult;
      result.review_status = reviewResult.status;
      this.logger.info(`Review status: ${reviewResult.status}`);

      // Update result status based on review
      if (reviewResult.status === 'failure' && config.mode === 'strict') {
        result.status = 'failure';
      } else if (reviewResult.status === 'success') {
        result.status = 'success';
      } else {
        result.status = 'partial';
      }

      // Step 6: Log Failures as Bugs
      if (executionResult.failed > 0) {
        this.logger.info('Step 6: Logging failures as JIRA issues...');
        const failedTests = this.extractFailedTests(executionResult);
        const bugResult = await this.bugLoggerAgent.logFailuresAsJiraIssues(
          failedTests,
          config.story_key
        );
        result.details!.bug_result = bugResult;
        result.bugs_created = bugResult.total_created;
        result.bugs_failed = bugResult.total_failed;
        this.logger.info(
          `Bug logging complete: ${bugResult.total_created} created, ${bugResult.total_failed} failed`
        );
      } else {
        this.logger.info('Step 6: Skipping bug logging (no failures to report)');
        result.bugs_created = 0;
        result.bugs_failed = 0;
      }

      const duration = Date.now() - startTime;
      this.logger.info(
        `Orchestration completed successfully in ${duration}ms - Status: ${result.status}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Orchestration failed: ${errorMessage}`);
      result.status = 'error';
      result.error = errorMessage;
    }

    return result;
  }

  private determinePriority(ac: string): 'high' | 'medium' | 'low' {
    const lowerAC = ac.toLowerCase();
    if (/must|critical|required|essential/i.test(lowerAC)) {
      return 'high';
    }
    if (/should|important/i.test(lowerAC)) {
      return 'medium';
    }
    return 'low';
  }

  private mapWriterTestCaseToAC(testCase: WriterTestCase, ac: AcceptanceCriteria[]): string[] {
    const mappedAC: string[] = [];
    const testNameLower = testCase.name.toLowerCase();

    for (const criterion of ac) {
      const criterionLower = criterion.description.toLowerCase();
      if (testNameLower.includes(criterionLower.substring(0, 20)) ||
          criterionLower.includes(testNameLower.substring(0, 20))) {
        mappedAC.push(criterion.id);
      }
    }

    return mappedAC;
  }

  private convertWriterTestCaseToExecutorTestCase(writerTestCase: WriterTestCase): TestCase {
    return {
      id: writerTestCase.id,
      name: writerTestCase.name,
      steps: writerTestCase.steps.map(step => {
        const executorStep: any = {
          action: this.mapActionToExecutorAction(step.action),
          expected: step.expected
        };
        return executorStep as import('./test-executor-agent.js').TestStep;
      })
    };
  }

  private mapActionToExecutorAction(
    action: string
  ): 'navigate' | 'click' | 'fill' | 'wait' | 'assert' | 'screenshot' {
    const lowerAction = action.toLowerCase();

    if (lowerAction.includes('navigate') || lowerAction.includes('visit') || lowerAction.includes('go to')) {
      return 'navigate';
    }
    if (lowerAction.includes('click')) {
      return 'click';
    }
    if (lowerAction.includes('fill') || lowerAction.includes('enter') || lowerAction.includes('input')) {
      return 'fill';
    }
    if (lowerAction.includes('wait')) {
      return 'wait';
    }
    if (lowerAction.includes('verify') || lowerAction.includes('assert') || lowerAction.includes('check')) {
      return 'assert';
    }
    if (lowerAction.includes('screenshot') || lowerAction.includes('capture')) {
      return 'screenshot';
    }

    // Default to assert for unknown actions
    return 'assert';
  }

  private extractFailedTests(executionResult: ExecutionResult): FailedTest[] {
    const failedTests: FailedTest[] = [];

    for (const detail of executionResult.details) {
      if (!detail.passed && detail.error) {
        failedTests.push({
          test_id: detail.testId,
          test_name: detail.testName,
          error_message: detail.error,
          stack_trace: detail.consoleLogs.join('\n'),
          screenshot_path: detail.screenshots[0],
          logs: detail.consoleLogs.join('\n'),
          timestamp: new Date()
        });
      }
    }

    return failedTests;
  }

  getOrchestrationSummary(result: OrchestrationResult): string {
    const lines: string[] = [];

    lines.push('=== Orchestration Summary ===');
    lines.push(`Story: ${result.story_key}`);
    lines.push(`Status: ${result.status.toUpperCase()}`);
    lines.push('');

    lines.push('Test Results:');
    lines.push(`  - Passed: ${result.tests_passed}`);
    lines.push(`  - Failed: ${result.tests_failed}`);
    lines.push(`  - Coverage: ${result.coverage_percent.toFixed(2)}%`);
    lines.push('');

    lines.push('Bug Tracking:');
    lines.push(`  - Created: ${result.bugs_created}`);
    lines.push(`  - Failed: ${result.bugs_failed}`);
    lines.push('');

    if (result.review_status) {
      lines.push(`Review Status: ${result.review_status}`);
    }

    if (result.error) {
      lines.push(`Error: ${result.error}`);
    }

    return lines.join('\n');
  }
}
