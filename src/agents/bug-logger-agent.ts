import { JiraClient } from '../jira/jira-client.js';
import { Logger } from '../logging/logger.js';

export interface FailedTest {
  test_id: string;
  test_name: string;
  error_message: string;
  stack_trace?: string;
  screenshot_path?: string;
  logs?: string;
  timestamp: Date;
}

export interface BugCreationError {
  test_id: string;
  test_name: string;
  error: string;
}

export interface BugCreationResult {
  created_bugs: string[]; // Array of created bug keys
  errors: BugCreationError[];
  total_processed: number;
  total_created: number;
  total_failed: number;
}

export class BugLoggerAgent {
  constructor(private jiraClient: JiraClient, private logger: Logger) {}

  async logFailuresAsJiraIssues(
    failedTests: FailedTest[],
    storyKey: string
  ): Promise<BugCreationResult> {
    this.logger.info(
      `Processing ${failedTests.length} failed tests for story ${storyKey}`
    );

    const createdBugs: string[] = [];
    const errors: BugCreationError[] = [];

    for (const failedTest of failedTests) {
      try {
        const bugKey = await this.createBugIssue(failedTest, storyKey);
        createdBugs.push(bugKey);
        this.logger.info(
          `Created bug ${bugKey} for test ${failedTest.test_id}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({
          test_id: failedTest.test_id,
          test_name: failedTest.test_name,
          error: errorMessage
        });
        this.logger.error(
          `Failed to create bug for test ${failedTest.test_id}: ${errorMessage}`
        );
      }
    }

    const result: BugCreationResult = {
      created_bugs: createdBugs,
      errors,
      total_processed: failedTests.length,
      total_created: createdBugs.length,
      total_failed: errors.length
    };

    this.logger.info(
      `Bug logging complete: ${result.total_created} created, ${result.total_failed} failed`
    );

    return result;
  }

  private async createBugIssue(
    failedTest: FailedTest,
    storyKey: string
  ): Promise<string> {
    const description = this.buildBugDescription(failedTest);

    const bug = {
      title: `[FAILED] ${failedTest.test_name}`,
      description,
      environment: this.extractEnvironment(),
      test_id: failedTest.test_id,
      reproduction_steps: this.extractReproductionSteps(failedTest)
    };

    const bugKey = await this.jiraClient.createIssue(bug);

    // Link the bug to the original story
    await this.jiraClient.linkIssue(storyKey, bugKey, 'relates to');

    return bugKey;
  }

  private buildBugDescription(failedTest: FailedTest): string {
    const lines: string[] = [];

    lines.push('h2. Test Failure Details');
    lines.push('');
    lines.push(`*Test ID:* {code}${failedTest.test_id}{code}`);
    lines.push(`*Test Name:* ${failedTest.test_name}`);
    lines.push(`*Timestamp:* ${failedTest.timestamp.toISOString()}`);
    lines.push('');

    lines.push('h3. Error Message');
    lines.push('{code}');
    lines.push(failedTest.error_message);
    lines.push('{code}');
    lines.push('');

    if (failedTest.stack_trace) {
      lines.push('h3. Stack Trace');
      lines.push('{code}');
      lines.push(failedTest.stack_trace);
      lines.push('{code}');
      lines.push('');
    }

    if (failedTest.logs) {
      lines.push('h3. Logs');
      lines.push('{code}');
      lines.push(failedTest.logs);
      lines.push('{code}');
      lines.push('');
    }

    if (failedTest.screenshot_path) {
      lines.push('h3. Screenshot');
      lines.push(`[Screenshot|${failedTest.screenshot_path}]`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private extractReproductionSteps(failedTest: FailedTest): string[] {
    const steps: string[] = [];

    // Try to extract steps from stack trace if available
    if (failedTest.stack_trace) {
      const stackLines = failedTest.stack_trace.split('\n');
      for (let i = 0; i < stackLines.length && i < 5; i++) {
        const line = stackLines[i].trim();
        if (line && !line.startsWith('at ')) {
          steps.push(line);
        }
      }
    }

    // Add error message as a step if no stack trace steps
    if (steps.length === 0) {
      steps.push(`Test execution failed with: ${failedTest.error_message}`);
    }

    // Ensure we have at least one step
    if (steps.length === 0) {
      steps.push('Run the test that failed');
    }

    return steps;
  }

  private extractEnvironment(): string {
    const nodeEnv = process.env.NODE_ENV || 'test';
    const platform = process.env.CI ? 'CI/CD Pipeline' : 'Local';
    return `${platform} (${nodeEnv})`;
  }
}
