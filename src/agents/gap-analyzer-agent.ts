import { Logger } from '../logging/logger.js';

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  coveredAcceptanceCriteria: string[];
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface GapAnalysisResult {
  covered: AcceptanceCriteria[];
  gaps: AcceptanceCriteria[];
  coverage_percent: number;
  total_ac: number;
  total_covered: number;
  total_gaps: number;
  uncovered_by_ac: string[];
}

export class GapAnalyzerAgent {
  constructor(private logger: Logger) {}

  analyze(
    testCases: TestCase[],
    acceptanceCriteria: AcceptanceCriteria[]
  ): GapAnalysisResult {
    this.logger.info(
      `Analyzing gap coverage for ${testCases.length} test cases against ${acceptanceCriteria.length} AC`
    );

    const coveredAcIds = new Set<string>();
    const acById = new Map<string, AcceptanceCriteria>();
    const uncoveredByAc: string[] = [];

    // Index AC by ID
    for (const ac of acceptanceCriteria) {
      acById.set(ac.id, ac);
    }

    // Track covered AC and find uncovered test case references
    for (const testCase of testCases) {
      if (testCase.coveredAcceptanceCriteria.length === 0) {
        uncoveredByAc.push(testCase.id);
      }

      for (const acId of testCase.coveredAcceptanceCriteria) {
        if (acById.has(acId)) {
          coveredAcIds.add(acId);
        }
      }
    }

    // Separate covered and gap AC
    const covered: AcceptanceCriteria[] = [];
    const gaps: AcceptanceCriteria[] = [];

    for (const ac of acceptanceCriteria) {
      if (coveredAcIds.has(ac.id)) {
        covered.push(ac);
      } else {
        gaps.push(ac);
      }
    }

    const totalAc = acceptanceCriteria.length;
    const totalCovered = covered.length;
    const totalGaps = gaps.length;
    const coverage_percent = totalAc > 0 ? (totalCovered / totalAc) * 100 : 0;

    this.logger.info(
      `Gap analysis complete: ${totalCovered}/${totalAc} AC covered (${coverage_percent.toFixed(2)}%)`
    );

    if (gaps.length > 0) {
      this.logger.warn(`Found ${gaps.length} uncovered acceptance criteria`);
      gaps.forEach(gap => {
        this.logger.debug(`Uncovered AC: ${gap.id} - ${gap.description}`);
      });
    }

    if (uncoveredByAc.length > 0) {
      this.logger.warn(`Found ${uncoveredByAc.length} test cases without AC coverage`);
    }

    return {
      covered,
      gaps,
      coverage_percent,
      total_ac: totalAc,
      total_covered: totalCovered,
      total_gaps: totalGaps,
      uncovered_by_ac: uncoveredByAc
    };
  }

  generateCoverageReport(result: GapAnalysisResult): string {
    const lines: string[] = [];

    lines.push('=== Gap Analysis Coverage Report ===');
    lines.push(`Total Acceptance Criteria: ${result.total_ac}`);
    lines.push(`Covered: ${result.total_covered}`);
    lines.push(`Gaps: ${result.total_gaps}`);
    lines.push(`Coverage: ${result.coverage_percent.toFixed(2)}%`);
    lines.push('');

    if (result.gaps.length > 0) {
      lines.push('Uncovered Acceptance Criteria:');
      result.gaps.forEach(gap => {
        const priority = gap.priority ? ` [${gap.priority.toUpperCase()}]` : '';
        lines.push(`  - ${gap.id}: ${gap.description}${priority}`);
      });
      lines.push('');
    }

    if (result.uncovered_by_ac.length > 0) {
      lines.push('Test Cases Without AC Coverage:');
      result.uncovered_by_ac.forEach(testId => {
        lines.push(`  - ${testId}`);
      });
      lines.push('');
    }

    if (result.covered.length > 0) {
      lines.push(`Covered Acceptance Criteria (${result.covered.length}):`);
      result.covered.forEach(ac => {
        lines.push(`  - ${ac.id}: ${ac.description}`);
      });
    }

    return lines.join('\n');
  }
}
