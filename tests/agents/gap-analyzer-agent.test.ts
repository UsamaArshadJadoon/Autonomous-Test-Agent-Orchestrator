import { GapAnalyzerAgent, TestCase, AcceptanceCriteria } from '../../src/agents/gap-analyzer-agent.js';
import { Logger } from '../../src/logging/logger.js';

describe('GapAnalyzerAgent', () => {
  let agent: GapAnalyzerAgent;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    agent = new GapAnalyzerAgent(mockLogger);
  });

  describe('analyze', () => {
    it('should identify all covered acceptance criteria when all ACs have tests', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test Login',
          coveredAcceptanceCriteria: ['AC-001', 'AC-002']
        },
        {
          id: 'TC-002',
          title: 'Test Logout',
          coveredAcceptanceCriteria: ['AC-003']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'User can login with valid credentials' },
        { id: 'AC-002', description: 'User email is validated' },
        { id: 'AC-003', description: 'User can logout successfully' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(3);
      expect(result.total_covered).toBe(3);
      expect(result.total_gaps).toBe(0);
      expect(result.coverage_percent).toBe(100);
      expect(result.covered).toHaveLength(3);
      expect(result.gaps).toHaveLength(0);
    });

    it('should identify gaps when some ACs are not covered', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test Create Account',
          coveredAcceptanceCriteria: ['AC-001']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'User can create account' },
        { id: 'AC-002', description: 'User must accept terms' },
        { id: 'AC-003', description: 'User receives confirmation email' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(3);
      expect(result.total_covered).toBe(1);
      expect(result.total_gaps).toBe(2);
      expect(result.coverage_percent).toBeCloseTo(33.33, 1);
      expect(result.gaps.map(g => g.id)).toContain('AC-002');
      expect(result.gaps.map(g => g.id)).toContain('AC-003');
    });

    it('should calculate correct coverage percentage', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test Feature A',
          coveredAcceptanceCriteria: ['AC-001', 'AC-002']
        },
        {
          id: 'TC-002',
          title: 'Test Feature B',
          coveredAcceptanceCriteria: ['AC-003']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Feature A requirement 1' },
        { id: 'AC-002', description: 'Feature A requirement 2' },
        { id: 'AC-003', description: 'Feature B requirement 1' },
        { id: 'AC-004', description: 'Feature B requirement 2' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(4);
      expect(result.total_covered).toBe(3);
      expect(result.coverage_percent).toBe(75);
    });

    it('should handle empty test cases', () => {
      const testCases: TestCase[] = [];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Feature requirement' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(1);
      expect(result.total_covered).toBe(0);
      expect(result.total_gaps).toBe(1);
      expect(result.coverage_percent).toBe(0);
      expect(result.gaps).toHaveLength(1);
      expect(result.uncovered_by_ac).toHaveLength(0);
    });

    it('should handle empty acceptance criteria', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test Something',
          coveredAcceptanceCriteria: ['AC-001']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(0);
      expect(result.total_covered).toBe(0);
      expect(result.total_gaps).toBe(0);
      expect(result.coverage_percent).toBe(0);
    });

    it('should track test cases without AC coverage', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test with AC',
          coveredAcceptanceCriteria: ['AC-001']
        },
        {
          id: 'TC-002',
          title: 'Test without AC',
          coveredAcceptanceCriteria: []
        },
        {
          id: 'TC-003',
          title: 'Another test without AC',
          coveredAcceptanceCriteria: []
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Feature requirement' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.uncovered_by_ac).toHaveLength(2);
      expect(result.uncovered_by_ac).toContain('TC-002');
      expect(result.uncovered_by_ac).toContain('TC-003');
    });

    it('should handle acceptance criteria with priority levels', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test Critical Feature',
          coveredAcceptanceCriteria: ['AC-001']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Critical requirement', priority: 'high' },
        { id: 'AC-002', description: 'Medium requirement', priority: 'medium' },
        { id: 'AC-003', description: 'Low requirement', priority: 'low' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.covered.length).toBe(1);
      expect(result.covered[0].priority).toBe('high');
      expect(result.gaps.length).toBe(2);
      expect(result.gaps.find(g => g.id === 'AC-002')?.priority).toBe('medium');
      expect(result.gaps.find(g => g.id === 'AC-003')?.priority).toBe('low');
    });

    it('should handle test cases covering multiple ACs', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Comprehensive Payment Test',
          coveredAcceptanceCriteria: ['AC-001', 'AC-002', 'AC-003', 'AC-004']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'User can enter card details' },
        { id: 'AC-002', description: 'System validates card' },
        { id: 'AC-003', description: 'User can confirm payment' },
        { id: 'AC-004', description: 'Confirmation email is sent' },
        { id: 'AC-005', description: 'Payment receipt is generated' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(5);
      expect(result.total_covered).toBe(4);
      expect(result.total_gaps).toBe(1);
      expect(result.coverage_percent).toBe(80);
      expect(result.gaps[0].id).toBe('AC-005');
    });

    it('should handle multiple test cases covering same AC', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Login Happy Path',
          coveredAcceptanceCriteria: ['AC-001']
        },
        {
          id: 'TC-002',
          title: 'Login Error Handling',
          coveredAcceptanceCriteria: ['AC-001']
        },
        {
          id: 'TC-003',
          title: 'Login Edge Cases',
          coveredAcceptanceCriteria: ['AC-001']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'User can login' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(1);
      expect(result.total_covered).toBe(1);
      expect(result.coverage_percent).toBe(100);
      expect(result.gaps).toHaveLength(0);
    });

    it('should ignore test case AC references that do not exist', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test Feature',
          coveredAcceptanceCriteria: ['AC-001', 'AC-999', 'AC-002']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Requirement 1' },
        { id: 'AC-002', description: 'Requirement 2' }
      ];

      const result = agent.analyze(testCases, acceptanceCriteria);

      expect(result.total_ac).toBe(2);
      expect(result.total_covered).toBe(2);
      expect(result.coverage_percent).toBe(100);
      expect(result.gaps).toHaveLength(0);
    });
  });

  describe('generateCoverageReport', () => {
    it('should generate a properly formatted report with gaps', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test Login',
          coveredAcceptanceCriteria: ['AC-001']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'User can login', priority: 'high' },
        { id: 'AC-002', description: 'User can logout', priority: 'medium' }
      ];

      const analysisResult = agent.analyze(testCases, acceptanceCriteria);
      const report = agent.generateCoverageReport(analysisResult);

      expect(report).toContain('=== Gap Analysis Coverage Report ===');
      expect(report).toContain('Total Acceptance Criteria: 2');
      expect(report).toContain('Covered: 1');
      expect(report).toContain('Gaps: 1');
      expect(report).toContain('Coverage: 50.00%');
      expect(report).toContain('Uncovered Acceptance Criteria:');
      expect(report).toContain('AC-002: User can logout [MEDIUM]');
      expect(report).toContain('Covered Acceptance Criteria (1):');
    });

    it('should generate report with uncovered test cases', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Valid Test',
          coveredAcceptanceCriteria: ['AC-001']
        },
        {
          id: 'TC-002',
          title: 'Orphan Test',
          coveredAcceptanceCriteria: []
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Feature requirement' }
      ];

      const analysisResult = agent.analyze(testCases, acceptanceCriteria);
      const report = agent.generateCoverageReport(analysisResult);

      expect(report).toContain('Test Cases Without AC Coverage:');
      expect(report).toContain('TC-002');
    });

    it('should generate report with 100% coverage', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Complete Test',
          coveredAcceptanceCriteria: ['AC-001', 'AC-002']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Feature requirement 1' },
        { id: 'AC-002', description: 'Feature requirement 2' }
      ];

      const analysisResult = agent.analyze(testCases, acceptanceCriteria);
      const report = agent.generateCoverageReport(analysisResult);

      expect(report).toContain('Coverage: 100.00%');
      expect(report).toContain('Gaps: 0');
      expect(report).not.toContain('Uncovered Acceptance Criteria:');
      expect(report).toContain('Covered Acceptance Criteria (2):');
    });
  });

  describe('logging', () => {
    it('should log analysis start and completion', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test',
          coveredAcceptanceCriteria: ['AC-001']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Feature requirement' }
      ];

      agent.analyze(testCases, acceptanceCriteria);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Analyzing gap coverage')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Gap analysis complete')
      );
    });

    it('should log gaps when ACs are uncovered', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Incomplete Test',
          coveredAcceptanceCriteria: ['AC-001']
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Requirement 1' },
        { id: 'AC-002', description: 'Requirement 2' }
      ];

      agent.analyze(testCases, acceptanceCriteria);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 uncovered acceptance criteria')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Uncovered AC: AC-002')
      );
    });

    it('should log test cases without AC coverage', () => {
      const testCases: TestCase[] = [
        {
          id: 'TC-001',
          title: 'Test without AC',
          coveredAcceptanceCriteria: []
        }
      ];

      const acceptanceCriteria: AcceptanceCriteria[] = [
        { id: 'AC-001', description: 'Feature requirement' }
      ];

      agent.analyze(testCases, acceptanceCriteria);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 test cases without AC coverage')
      );
    });
  });
});
