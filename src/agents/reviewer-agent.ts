import { Logger } from '../logging/logger.js';
import { ExecutionResult, TestExecutionDetail } from './test-executor-agent.js';
import { GapAnalysisResult } from './gap-analyzer-agent.js';

export interface ReviewResult {
  status: 'success' | 'partial' | 'failure';
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  pass_rate: number;
  coverage_percent: number;
  critical_failures: string[];
  recommendations: string[];
  should_log_bugs: boolean;
}

export class ReviewerAgent {
  private readonly minPassRateThreshold: number = 80;
  private readonly minCoverageThreshold: number = 70;

  constructor(private logger: Logger) {}

  reviewTestResults(
    executionResult: ExecutionResult,
    gapAnalysisResult: GapAnalysisResult
  ): ReviewResult {
    this.logger.info('Starting review of test results');

    const totalTests = executionResult.passed + executionResult.failed;
    const passRate = totalTests > 0 ? (executionResult.passed / totalTests) * 100 : 0;
    const coveragePercent = gapAnalysisResult.coverage_percent;

    // Identify critical failures
    const criticalFailures = this.identifyCriticalFailures(
      executionResult.details,
      gapAnalysisResult
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      executionResult,
      gapAnalysisResult,
      criticalFailures
    );

    // Determine overall status
    const status = this.determineStatus(passRate, coveragePercent, criticalFailures);

    // Determine if bugs should be logged
    const shouldLogBugs = executionResult.failed > 0;

    const result: ReviewResult = {
      status,
      total_tests: totalTests,
      passed_tests: executionResult.passed,
      failed_tests: executionResult.failed,
      pass_rate: Math.round(passRate * 100) / 100,
      coverage_percent: Math.round(coveragePercent * 100) / 100,
      critical_failures: criticalFailures,
      recommendations,
      should_log_bugs: shouldLogBugs
    };

    this.logger.info(
      `Review complete: ${result.status} - ${result.passed_tests}/${result.total_tests} passed (${result.pass_rate}%), coverage: ${result.coverage_percent}%`
    );

    return result;
  }

  private identifyCriticalFailures(
    details: TestExecutionDetail[],
    gapAnalysisResult: GapAnalysisResult
  ): string[] {
    const criticalFailures: string[] = [];

    // Find failed tests
    for (const detail of details) {
      if (!detail.passed && detail.error) {
        // High priority if this test covers critical AC
        if (
          gapAnalysisResult.gaps.some(gap => gap.priority === 'high')
        ) {
          criticalFailures.push(
            `Critical: ${detail.testName} - ${detail.error.substring(0, 100)}`
          );
        } else {
          criticalFailures.push(
            `${detail.testName} - ${detail.error.substring(0, 100)}`
          );
        }
      }
    }

    // Check for coverage gaps in high-priority AC
    const highPriorityGaps = gapAnalysisResult.gaps.filter(
      gap => gap.priority === 'high'
    );

    if (highPriorityGaps.length > 0) {
      criticalFailures.push(
        `${highPriorityGaps.length} high-priority AC not covered by tests`
      );
    }

    return criticalFailures;
  }

  private generateRecommendations(
    executionResult: ExecutionResult,
    gapAnalysisResult: GapAnalysisResult,
    criticalFailures: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check pass rate
    if (executionResult.passed === 0 || executionResult.failed > executionResult.passed) {
      recommendations.push(
        'Most tests are failing. Review and fix test logic or application code.'
      );
    } else if (executionResult.failed > 0) {
      recommendations.push(
        `Fix ${executionResult.failed} failing test(s) before proceeding with deployment.`
      );
    }

    // Check coverage
    if (gapAnalysisResult.coverage_percent < this.minCoverageThreshold) {
      recommendations.push(
        `Increase test coverage from ${gapAnalysisResult.coverage_percent.toFixed(
          2
        )}% to at least ${this.minCoverageThreshold}%. Write tests for ${gapAnalysisResult.total_gaps} uncovered AC.`
      );
    }

    // Check for uncovered by AC
    if (gapAnalysisResult.uncovered_by_ac.length > 0) {
      recommendations.push(
        `${gapAnalysisResult.uncovered_by_ac.length} test(s) are not mapped to acceptance criteria. Link them to the appropriate AC.`
      );
    }

    // Check for critical failures
    if (criticalFailures.length > 0) {
      recommendations.push('Address critical failures immediately.');
    }

    // Add success recommendation if everything is good
    if (
      recommendations.length === 0 &&
      executionResult.failed === 0 &&
      gapAnalysisResult.coverage_percent >= this.minCoverageThreshold
    ) {
      recommendations.push('All tests passed with good coverage. Ready for next phase.');
    }

    return recommendations;
  }

  private determineStatus(
    passRate: number,
    coveragePercent: number,
    criticalFailures: string[]
  ): 'success' | 'partial' | 'failure' {
    // Success: high pass rate and high coverage, no critical failures
    if (
      passRate >= this.minPassRateThreshold &&
      coveragePercent >= this.minCoverageThreshold &&
      criticalFailures.length === 0
    ) {
      return 'success';
    }

    // Failure: low pass rate or critical failures
    if (passRate < 50 || criticalFailures.length > 3) {
      return 'failure';
    }

    // Partial: somewhere in between
    return 'partial';
  }

  generateReviewReport(result: ReviewResult): string {
    const lines: string[] = [];

    lines.push('=== Test Review Report ===');
    lines.push(`Status: ${result.status.toUpperCase()}`);
    lines.push('');

    lines.push('Test Results:');
    lines.push(
      `  - Total Tests: ${result.total_tests}`
    );
    lines.push(
      `  - Passed: ${result.passed_tests}`
    );
    lines.push(
      `  - Failed: ${result.failed_tests}`
    );
    lines.push(`  - Pass Rate: ${result.pass_rate}%`);
    lines.push('');

    lines.push('Coverage Metrics:');
    lines.push(`  - Coverage: ${result.coverage_percent}%`);
    lines.push('');

    if (result.critical_failures.length > 0) {
      lines.push('Critical Failures:');
      result.critical_failures.forEach(failure => {
        lines.push(`  - ${failure}`);
      });
      lines.push('');
    }

    lines.push('Recommendations:');
    result.recommendations.forEach(rec => {
      lines.push(`  - ${rec}`);
    });
    lines.push('');

    return lines.join('\n');
  }
}
