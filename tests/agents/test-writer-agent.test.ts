import { TestWriterAgent } from '../../src/agents/test-writer-agent.js';
import { ParsedStory } from '../../src/agents/story-agent.js';
import { Logger } from '../../src/logging/logger.js';

describe('TestWriterAgent', () => {
  let agent: TestWriterAgent;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    agent = new TestWriterAgent(mockLogger);
  });

  describe('generateTestCases - Happy Path', () => {
    it('should generate test cases for acceptance criteria', async () => {
      const story: ParsedStory = {
        key: 'TEST-001',
        summary: 'User Login Feature',
        acceptance_criteria: [
          'AC: User can enter credentials',
          'AC: System validates credentials',
          'AC: User sees success message'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(tc => tc.name.includes('User can enter credentials'))).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generating test cases for story: TEST-001')
      );
    });

    it('should generate test cases for user flows', async () => {
      const story: ParsedStory = {
        key: 'TEST-002',
        summary: 'Checkout Process',
        acceptance_criteria: [],
        user_flows: [
          'User Flow: Add item to cart',
          'Flow: Proceed to checkout'
        ],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(tc => tc.name.includes('Add item to cart'))).toBe(true);
      expect(result.some(tc => tc.name.includes('Proceed to checkout'))).toBe(true);
    });

    it('should generate both AC and flow test cases', async () => {
      const story: ParsedStory = {
        key: 'TEST-003',
        summary: 'Complete Feature',
        acceptance_criteria: [
          'AC: Feature works correctly'
        ],
        user_flows: [
          'User Flow: Execute feature'
        ],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      // Should have happy path + edge cases + error scenarios
      // Minimum expected: 1 AC test + 1 flow test + 4 edge cases + 3 error scenarios = 9
      expect(result.length).toBeGreaterThanOrEqual(9);
      expect(result.every(tc => tc.id && tc.name && tc.steps && tc.test_data)).toBe(true);
    });

    it('should include step-by-step instructions in test cases', async () => {
      const story: ParsedStory = {
        key: 'TEST-004',
        summary: 'Search Feature',
        acceptance_criteria: [
          'When user searches for keyword Then results are displayed'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const searchTest = result.find(tc => tc.name.includes('Search'));
      expect(searchTest).toBeDefined();
      expect(searchTest!.steps.length).toBeGreaterThan(0);
      expect(searchTest!.steps[0]).toHaveProperty('action');
      expect(searchTest!.steps[0]).toHaveProperty('expected');
    });

    it('should include test data fixtures in test cases', async () => {
      const story: ParsedStory = {
        key: 'TEST-005',
        summary: 'Payment Processing',
        acceptance_criteria: [
          'AC: User can enter payment amount'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const paymentTest = result.find(tc => tc.name.includes('payment'));
      expect(paymentTest).toBeDefined();
      expect(paymentTest!.test_data).toBeDefined();
      expect(Object.keys(paymentTest!.test_data).length).toBeGreaterThan(0);
    });
  });

  describe('generateTestCases - Edge Cases', () => {
    it('should generate edge case tests for empty input scenario', async () => {
      const story: ParsedStory = {
        key: 'TEST-006',
        summary: 'Form Validation',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const edgeCaseTests = result.filter(tc => tc.id.includes('-ec-'));
      expect(edgeCaseTests.length).toBeGreaterThan(0);

      const emptyInputTest = edgeCaseTests.find(tc => tc.name.includes('empty input'));
      expect(emptyInputTest).toBeDefined();
      expect(emptyInputTest!.test_data.input).toBe('');
      expect(emptyInputTest!.test_data.shouldFail).toBe(true);
    });

    it('should generate boundary value edge case tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-007',
        summary: 'Numeric Input',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const boundaryTest = result.find(tc => tc.name.includes('boundary value'));
      expect(boundaryTest).toBeDefined();
      expect(boundaryTest!.test_data.value).toBe(0);
      expect(boundaryTest!.steps.length).toBeGreaterThan(0);
    });

    it('should generate maximum length input edge case tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-008',
        summary: 'String Input',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const maxLengthTest = result.find(tc => tc.name.includes('maximum length'));
      expect(maxLengthTest).toBeDefined();
      expect(maxLengthTest!.test_data.input.length).toBe(256);
    });

    it('should generate special characters edge case tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-009',
        summary: 'Text Input',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const specialCharTest = result.find(tc => tc.name.includes('special characters'));
      expect(specialCharTest).toBeDefined();
      expect(specialCharTest!.test_data.input).toBe('!@#$%^&*()');
    });

    it('should generate whitespace handling edge case tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-010',
        summary: 'Text Normalization',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const whitespaceTest = result.find(tc => tc.name.includes('whitespace'));
      expect(whitespaceTest).toBeDefined();
      expect(whitespaceTest!.test_data.input).toContain('test value');
    });

    it('should generate unicode characters edge case tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-011',
        summary: 'International Text',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const unicodeTest = result.find(tc => tc.name.includes('unicode'));
      expect(unicodeTest).toBeDefined();
      expect(unicodeTest!.test_data.input).toContain('测试');
    });

    it('should generate duplicate entries edge case tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-012',
        summary: 'List Management',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const duplicateTest = result.find(tc => tc.name.includes('duplicate'));
      expect(duplicateTest).toBeDefined();
      expect(duplicateTest!.test_data.entries).toEqual(['item1', 'item1', 'item2']);
    });
  });

  describe('generateTestCases - Error Scenarios', () => {
    it('should generate invalid input error scenario tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-013',
        summary: 'Input Validation',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const errorTests = result.filter(tc => tc.id.includes('-err-'));
      expect(errorTests.length).toBeGreaterThan(0);

      const invalidInputTest = errorTests.find(tc => tc.name.includes('invalid input'));
      expect(invalidInputTest).toBeDefined();
      expect(invalidInputTest!.test_data.expectedError).toBe('VALIDATION_ERROR');
      expect(invalidInputTest!.test_data.statusCode).toBe(400);
    });

    it('should generate missing required field error scenario tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-014',
        summary: 'Form Submission',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const missingFieldTest = result.find(tc => tc.name.includes('missing required field'));
      expect(missingFieldTest).toBeDefined();
      expect(missingFieldTest!.test_data.expectedError).toBe('MISSING_FIELD');
      expect(missingFieldTest!.test_data.password).toBeUndefined();
    });

    it('should generate network timeout error scenario tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-015',
        summary: 'API Communication',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const timeoutTest = result.find(tc => tc.name.includes('network timeout'));
      expect(timeoutTest).toBeDefined();
      expect(timeoutTest!.test_data.expectedError).toBe('TIMEOUT');
      expect(timeoutTest!.test_data.statusCode).toBe(408);
      expect(timeoutTest!.test_data.retryable).toBe(true);
    });

    it('should generate unauthorized access error scenario tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-016',
        summary: 'Authorization Check',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const unauthorizedTest = result.find(tc => tc.name.includes('unauthorized'));
      expect(unauthorizedTest).toBeDefined();
      expect(unauthorizedTest!.test_data.expectedError).toBe('UNAUTHORIZED');
      expect(unauthorizedTest!.test_data.statusCode).toBe(401);
    });

    it('should generate resource not found error scenario tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-017',
        summary: 'Resource Retrieval',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const notFoundTest = result.find(tc => tc.name.includes('resource not found'));
      expect(notFoundTest).toBeDefined();
      expect(notFoundTest!.test_data.expectedError).toBe('NOT_FOUND');
      expect(notFoundTest!.test_data.statusCode).toBe(404);
    });

    it('should generate server error scenario tests', async () => {
      const story: ParsedStory = {
        key: 'TEST-018',
        summary: 'Server Reliability',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const serverErrorTest = result.find(tc => tc.name.includes('server error'));
      expect(serverErrorTest).toBeDefined();
      expect(serverErrorTest!.test_data.expectedError).toBe('INTERNAL_SERVER_ERROR');
      expect(serverErrorTest!.test_data.statusCode).toBe(500);
    });
  });

  describe('generateTestCases - Test Data Generation', () => {
    it('should generate authentication-related test data', async () => {
      const story: ParsedStory = {
        key: 'TEST-019',
        summary: 'User Authentication',
        acceptance_criteria: [
          'AC: User can login with credentials'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const loginTest = result.find(tc => tc.name.includes('login'));
      expect(loginTest).toBeDefined();
      expect(loginTest!.test_data.username).toBeDefined();
      expect(loginTest!.test_data.password).toBeDefined();
      expect(loginTest!.test_data.email).toBeDefined();
    });

    it('should generate payment-related test data', async () => {
      const story: ParsedStory = {
        key: 'TEST-020',
        summary: 'Payment Processing',
        acceptance_criteria: [
          'AC: User can pay with credit card'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const paymentTest = result.find(tc => tc.name.includes('pay'));
      expect(paymentTest).toBeDefined();
      expect(paymentTest!.test_data.amount).toBeDefined();
      expect(paymentTest!.test_data.currency).toBe('USD');
      expect(paymentTest!.test_data.paymentMethod).toBeDefined();
    });

    it('should generate search-related test data', async () => {
      const story: ParsedStory = {
        key: 'TEST-021',
        summary: 'Search Feature',
        acceptance_criteria: [
          'AC: User can search with filters'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const searchTest = result.find(tc => tc.name.includes('search'));
      expect(searchTest).toBeDefined();
      expect(searchTest!.test_data.searchQuery).toBeDefined();
      expect(searchTest!.test_data.filters).toBeDefined();
    });

    it('should generate date/time-related test data', async () => {
      const story: ParsedStory = {
        key: 'TEST-022',
        summary: 'Schedule Management',
        acceptance_criteria: [
          'AC: User can schedule an event'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const scheduleTest = result.find(tc => tc.name.includes('schedule'));
      expect(scheduleTest).toBeDefined();
      expect(scheduleTest!.test_data.date).toBeDefined();
      expect(scheduleTest!.test_data.time).toBeDefined();
    });

    it('should generate shopping cart test data', async () => {
      const story: ParsedStory = {
        key: 'TEST-023',
        summary: 'Shopping Cart',
        acceptance_criteria: [],
        user_flows: [
          'User Flow: Add item to cart and checkout'
        ],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const cartTest = result.find(tc => tc.name.includes('Add item to cart'));
      expect(cartTest).toBeDefined();
      expect(cartTest!.test_data.productId).toBeDefined();
      expect(cartTest!.test_data.quantity).toBeGreaterThan(0);
    });
  });

  describe('generateTestCases - BDD Structure', () => {
    it('should parse Given/When/Then structure from AC', async () => {
      const story: ParsedStory = {
        key: 'TEST-024',
        summary: 'BDD Feature',
        acceptance_criteria: [
          'Given user is logged in When user clicks logout Then user is redirected to login page'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const bddTest = result.find(tc => tc.name.includes('BDD Feature'));
      expect(bddTest).toBeDefined();
      expect(bddTest!.steps.length).toBeGreaterThan(0);

      // Should have steps for given, when, then
      const actions = bddTest!.steps.map(s => s.action);
      expect(actions.some(a => a.includes('Setup') || a.includes('Given'))).toBe(true);
      expect(actions.some(a => a.includes('Execute') || a.includes('When'))).toBe(true);
      expect(actions.some(a => a.includes('Verify') || a.includes('Then'))).toBe(true);
    });

    it('should handle simple AC without BDD structure', async () => {
      const story: ParsedStory = {
        key: 'TEST-025',
        summary: 'Simple Feature',
        acceptance_criteria: [
          'User can view dashboard'
        ],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const simpleTest = result.find(tc => tc.name.includes('view dashboard'));
      expect(simpleTest).toBeDefined();
      expect(simpleTest!.steps.length).toBeGreaterThan(0);
    });
  });

  describe('generateTestCases - Logging', () => {
    it('should log when generating test cases', async () => {
      const story: ParsedStory = {
        key: 'TEST-026',
        summary: 'Logging Test',
        acceptance_criteria: ['AC: Test AC'],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      await agent.generateTestCases(story);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generating test cases for story: TEST-026')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('test cases')
      );
    });
  });

  describe('generateTestCases - Empty Input Handling', () => {
    it('should handle story with no acceptance criteria or user flows', async () => {
      const story: ParsedStory = {
        key: 'TEST-027',
        summary: 'Empty Story',
        acceptance_criteria: [],
        user_flows: [],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      // Should still generate edge case and error scenario tests
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(tc => tc.id.includes('-ec-'))).toBe(true);
      expect(result.some(tc => tc.id.includes('-err-'))).toBe(true);
    });

    it('should assign unique IDs to all test cases', async () => {
      const story: ParsedStory = {
        key: 'TEST-028',
        summary: 'Unique ID Test',
        acceptance_criteria: ['AC: Test'],
        user_flows: ['Flow: Test'],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      const ids = result.map(tc => tc.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      expect(result.every(tc => tc.id.startsWith('TEST-028'))).toBe(true);
    });
  });

  describe('generateTestCases - Complete Integration', () => {
    it('should generate complete test suite with all scenario types', async () => {
      const story: ParsedStory = {
        key: 'PROJ-100',
        summary: 'Complete Feature Implementation',
        acceptance_criteria: [
          'Given user is authenticated When user submits form Then data is saved',
          'AC: System validates input'
        ],
        user_flows: [
          'User Flow: Navigate to form',
          'Flow: Fill and submit'
        ],
        test_scenarios: [],
        created_at: new Date()
      };

      const result = await agent.generateTestCases(story);

      // Verify all test types are present
      const happyPath = result.filter(tc => tc.id.includes('-hp-'));
      const edgeCases = result.filter(tc => tc.id.includes('-ec-'));
      const errorScenarios = result.filter(tc => tc.id.includes('-err-'));

      expect(happyPath.length).toBeGreaterThan(0);
      expect(edgeCases.length).toBeGreaterThan(0);
      expect(errorScenarios.length).toBeGreaterThan(0);

      // Verify structure of all test cases
      result.forEach(testCase => {
        expect(testCase.id).toBeDefined();
        expect(testCase.name).toBeDefined();
        expect(Array.isArray(testCase.steps)).toBe(true);
        expect(testCase.steps.length).toBeGreaterThan(0);
        expect(testCase.test_data).toBeDefined();

        testCase.steps.forEach(step => {
          expect(step.action).toBeDefined();
          expect(step.expected).toBeDefined();
          expect(typeof step.action).toBe('string');
          expect(typeof step.expected).toBe('string');
        });
      });
    });
  });
});
