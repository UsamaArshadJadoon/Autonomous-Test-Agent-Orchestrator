import { Logger } from '../logging/logger.js';
import { ParsedStory } from './story-agent.js';

export interface TestStep {
  action: string;
  expected: string;
}

export interface TestCase {
  id: string;
  name: string;
  steps: TestStep[];
  test_data: Record<string, any>;
}

export type TestScenarioType = 'happy-path' | 'edge-case' | 'error-scenario';

export class TestWriterAgent {
  constructor(private logger: Logger) {}

  async generateTestCases(story: ParsedStory): Promise<TestCase[]> {
    this.logger.info(`Generating test cases for story: ${story.key}`);

    const testCases: TestCase[] = [];

    // Generate happy path test cases
    const happyPathTests = this.generateHappyPathTests(story);
    testCases.push(...happyPathTests);

    // Generate edge case test cases
    const edgeCaseTests = this.generateEdgeCaseTests(story);
    testCases.push(...edgeCaseTests);

    // Generate error scenario test cases
    const errorScenarioTests = this.generateErrorScenarioTests(story);
    testCases.push(...errorScenarioTests);

    this.logger.info(
      `Generated ${testCases.length} test cases for story ${story.key}`
    );

    return testCases;
  }

  private generateHappyPathTests(story: ParsedStory): TestCase[] {
    const testCases: TestCase[] = [];
    const baseId = `${story.key}-hp`;

    // Generate one test case per acceptance criterion
    for (let i = 0; i < story.acceptance_criteria.length; i++) {
      const ac = story.acceptance_criteria[i];
      const testCase = this.createTestCaseFromAC(
        `${baseId}-${i + 1}`,
        ac,
        'happy-path'
      );
      testCases.push(testCase);
    }

    // Generate one test case per user flow
    for (let i = 0; i < story.user_flows.length; i++) {
      const flow = story.user_flows[i];
      const testCase = this.createTestCaseFromFlow(
        `${baseId}-flow-${i + 1}`,
        flow,
        'happy-path'
      );
      testCases.push(testCase);
    }

    return testCases;
  }

  private generateEdgeCaseTests(story: ParsedStory): TestCase[] {
    const testCases: TestCase[] = [];
    const baseId = `${story.key}-ec`;

    const edgeCaseScenarios = [
      'empty input',
      'boundary value',
      'maximum length input',
      'minimum length input',
      'special characters',
      'whitespace handling',
      'unicode characters',
      'duplicate entries'
    ];

    for (let i = 0; i < Math.min(edgeCaseScenarios.length, 4); i++) {
      const scenario = edgeCaseScenarios[i];
      const testCase: TestCase = {
        id: `${baseId}-${i + 1}`,
        name: `Edge Case: ${scenario} in ${story.summary}`,
        steps: this.generateStepsForEdgeCase(scenario),
        test_data: this.generateEdgeCaseTestData(scenario)
      };
      testCases.push(testCase);
    }

    return testCases;
  }

  private generateErrorScenarioTests(story: ParsedStory): TestCase[] {
    const testCases: TestCase[] = [];
    const baseId = `${story.key}-err`;

    const errorScenarios = [
      'invalid input',
      'missing required field',
      'network timeout',
      'unauthorized access',
      'resource not found',
      'server error'
    ];

    for (let i = 0; i < Math.min(errorScenarios.length, 3); i++) {
      const scenario = errorScenarios[i];
      const testCase: TestCase = {
        id: `${baseId}-${i + 1}`,
        name: `Error Scenario: ${scenario} in ${story.summary}`,
        steps: this.generateStepsForErrorScenario(scenario),
        test_data: this.generateErrorTestData(scenario)
      };
      testCases.push(testCase);
    }

    return testCases;
  }

  private createTestCaseFromAC(
    id: string,
    ac: string,
    type: TestScenarioType
  ): TestCase {
    const sanitizedAC = ac.replace(/^(AC|Acceptance Criteria|Given|When|Then):\s*/i, '');

    return {
      id,
      name: `${type === 'happy-path' ? 'Happy Path' : type}: ${sanitizedAC}`,
      steps: this.generateStepsFromAC(sanitizedAC),
      test_data: this.generateTestDataForAC(sanitizedAC)
    };
  }

  private createTestCaseFromFlow(
    id: string,
    flow: string,
    type: TestScenarioType
  ): TestCase {
    const sanitizedFlow = flow.replace(/^(User Flow|Flow):\s*/i, '');

    return {
      id,
      name: `${type === 'happy-path' ? 'Happy Path' : type}: ${sanitizedFlow}`,
      steps: this.generateStepsFromFlow(sanitizedFlow),
      test_data: this.generateTestDataForFlow(sanitizedFlow)
    };
  }

  private generateStepsFromAC(ac: string): TestStep[] {
    const steps: TestStep[] = [];

    // Parse Given/When/Then structure if available
    const givenMatch = ac.match(/Given\s+(.+?)(?:\s+When|$)/i);
    const whenMatch = ac.match(/When\s+(.+?)(?:\s+Then|$)/i);
    const thenMatch = ac.match(/Then\s+(.+?)$/i);

    if (givenMatch) {
      steps.push({
        action: `Setup: ${givenMatch[1].trim()}`,
        expected: `System is ready with the given context`
      });
    }

    if (whenMatch) {
      steps.push({
        action: `Execute: ${whenMatch[1].trim()}`,
        expected: `User action is completed successfully`
      });
    }

    if (thenMatch) {
      steps.push({
        action: `Verify: ${thenMatch[1].trim()}`,
        expected: `${thenMatch[1].trim()}`
      });
    }

    // If no Given/When/Then structure, create simple steps
    if (steps.length === 0) {
      steps.push({
        action: `Execute: ${ac}`,
        expected: `${ac} is successfully completed`
      });
    }

    return steps;
  }

  private generateStepsFromFlow(flow: string): TestStep[] {
    const steps: TestStep[] = [];
    const flowParts = flow.split(/[-→>]/);

    for (let i = 0; i < flowParts.length; i++) {
      const part = flowParts[i].trim();
      if (part) {
        steps.push({
          action: `Step ${i + 1}: ${part}`,
          expected: `${part} is completed`
        });
      }
    }

    if (steps.length === 0) {
      steps.push({
        action: `Execute: ${flow}`,
        expected: `${flow} is successfully completed`
      });
    }

    return steps;
  }

  private generateStepsForEdgeCase(scenario: string): TestStep[] {
    const stepMap: Record<string, TestStep[]> = {
      'empty input': [
        {
          action: 'Input empty string or null value',
          expected: 'System handles empty input gracefully'
        },
        {
          action: 'Submit form or action',
          expected: 'System shows appropriate error or default behavior'
        }
      ],
      'boundary value': [
        {
          action: 'Input value at boundary (e.g., 0, -1, max)',
          expected: 'System processes boundary value correctly'
        },
        {
          action: 'Verify output and behavior',
          expected: 'Output is as expected for boundary condition'
        }
      ],
      'maximum length input': [
        {
          action: 'Input maximum allowed length string',
          expected: 'System accepts maximum length input'
        },
        {
          action: 'Attempt to add one more character',
          expected: 'System either truncates or rejects excess input'
        }
      ],
      'minimum length input': [
        {
          action: 'Input minimum required length',
          expected: 'System accepts minimum length input'
        },
        {
          action: 'Attempt with less than minimum',
          expected: 'System rejects or handles gracefully'
        }
      ],
      'special characters': [
        {
          action: 'Input special characters (!@#$%)',
          expected: 'System processes or escapes special characters'
        },
        {
          action: 'Verify data integrity',
          expected: 'Data is stored correctly without corruption'
        }
      ],
      'whitespace handling': [
        {
          action: 'Input leading/trailing whitespace',
          expected: 'System trims or preserves whitespace appropriately'
        },
        {
          action: 'Input multiple spaces between words',
          expected: 'System handles spacing correctly'
        }
      ],
      'unicode characters': [
        {
          action: 'Input unicode/emoji characters',
          expected: 'System displays or processes unicode correctly'
        },
        {
          action: 'Verify encoding',
          expected: 'Characters are encoded properly'
        }
      ],
      'duplicate entries': [
        {
          action: 'Attempt to add duplicate entry',
          expected: 'System prevents duplicates or handles them appropriately'
        },
        {
          action: 'Verify data consistency',
          expected: 'No duplicate data in storage'
        }
      ]
    };

    return stepMap[scenario] || [
      {
        action: `Test edge case: ${scenario}`,
        expected: `System handles ${scenario} correctly`
      }
    ];
  }

  private generateStepsForErrorScenario(scenario: string): TestStep[] {
    const stepMap: Record<string, TestStep[]> = {
      'invalid input': [
        {
          action: 'Provide invalid input (e.g., wrong format)',
          expected: 'System validates input'
        },
        {
          action: 'Attempt to process invalid input',
          expected: 'System shows validation error message'
        }
      ],
      'missing required field': [
        {
          action: 'Submit form without required field',
          expected: 'Form validation is triggered'
        },
        {
          action: 'Check error message',
          expected: 'Clear error message indicates missing required field'
        }
      ],
      'network timeout': [
        {
          action: 'Simulate network delay or timeout',
          expected: 'System detects timeout'
        },
        {
          action: 'Verify user feedback',
          expected: 'User sees appropriate timeout error message'
        }
      ],
      'unauthorized access': [
        {
          action: 'Attempt to access without proper authorization',
          expected: 'System checks authorization'
        },
        {
          action: 'Verify error response',
          expected: 'User is denied access with appropriate message'
        }
      ],
      'resource not found': [
        {
          action: 'Request non-existent resource',
          expected: 'System searches for resource'
        },
        {
          action: 'Check error response',
          expected: 'System returns 404 or not found message'
        }
      ],
      'server error': [
        {
          action: 'Simulate server error condition',
          expected: 'System encounters error'
        },
        {
          action: 'Verify error handling',
          expected: 'User sees friendly error message, not raw exception'
        }
      ]
    };

    return stepMap[scenario] || [
      {
        action: `Trigger error scenario: ${scenario}`,
        expected: `System handles ${scenario} gracefully`
      }
    ];
  }

  private generateTestDataForAC(ac: string): Record<string, any> {
    // Extract keywords to determine data type
    const data: Record<string, any> = {};

    if (/user|login|auth|account/i.test(ac)) {
      data.username = 'testuser@example.com';
      data.password = 'TestPassword123!';
      data.email = 'testuser@example.com';
    }

    if (/search|filter|query/i.test(ac)) {
      data.searchQuery = 'test search term';
      data.filters = { category: 'test', status: 'active' };
    }

    if (/payment|price|amount|cost/i.test(ac)) {
      data.amount = 99.99;
      data.currency = 'USD';
      data.paymentMethod = 'credit_card';
    }

    if (/date|time|schedule/i.test(ac)) {
      data.date = new Date().toISOString();
      data.time = '14:30:00';
    }

    // Add default test data
    if (Object.keys(data).length === 0) {
      data.testValue = 'test_value';
      data.id = 'test_id_123';
    }

    return data;
  }

  private generateTestDataForFlow(flow: string): Record<string, any> {
    const data: Record<string, any> = {};

    if (/add to cart|shopping|product/i.test(flow)) {
      data.productId = 'prod_123';
      data.productName = 'Test Product';
      data.quantity = 1;
      data.price = 29.99;
    }

    if (/checkout|payment/i.test(flow)) {
      data.items = [{ id: 'prod_1', quantity: 1, price: 29.99 }];
      data.total = 29.99;
      data.cardNumber = '4111111111111111';
    }

    if (/login|authentication/i.test(flow)) {
      data.username = 'testuser';
      data.password = 'securePassword123!';
    }

    if (/search/i.test(flow)) {
      data.query = 'search term';
      data.results = [{ id: 1, name: 'Result 1' }];
    }

    if (Object.keys(data).length === 0) {
      data.value = 'test';
      data.status = 'active';
    }

    return data;
  }

  private generateEdgeCaseTestData(scenario: string): Record<string, any> {
    const dataMap: Record<string, Record<string, any>> = {
      'empty input': {
        input: '',
        expected: 'validation_error',
        shouldFail: true
      },
      'boundary value': {
        value: 0,
        min: 1,
        max: 100,
        expected: 'out_of_bounds'
      },
      'maximum length input': {
        input: 'x'.repeat(256),
        maxLength: 255,
        expected: 'length_exceeded'
      },
      'minimum length input': {
        input: 'x',
        minLength: 3,
        expected: 'length_insufficient'
      },
      'special characters': {
        input: '!@#$%^&*()',
        expected: 'special_chars_processed'
      },
      'whitespace handling': {
        input: '  test value  ',
        expected: 'trimmed'
      },
      'unicode characters': {
        input: '测试 テスト 🎉',
        expected: 'unicode_supported'
      },
      'duplicate entries': {
        entries: ['item1', 'item1', 'item2'],
        expected: 'duplicates_handled'
      }
    };

    return dataMap[scenario] || { scenario, expectsError: true };
  }

  private generateErrorTestData(scenario: string): Record<string, any> {
    const dataMap: Record<string, Record<string, any>> = {
      'invalid input': {
        input: 'invalid@data@format',
        expectedError: 'VALIDATION_ERROR',
        statusCode: 400
      },
      'missing required field': {
        email: 'test@example.com',
        password: undefined,
        expectedError: 'MISSING_FIELD',
        statusCode: 400
      },
      'network timeout': {
        timeout: 5000,
        expectedError: 'TIMEOUT',
        statusCode: 408,
        retryable: true
      },
      'unauthorized access': {
        userId: 'user_456',
        requiredRole: 'admin',
        expectedError: 'UNAUTHORIZED',
        statusCode: 401
      },
      'resource not found': {
        resourceId: 'nonexistent_123',
        expectedError: 'NOT_FOUND',
        statusCode: 404
      },
      'server error': {
        expectedError: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        retryable: true
      }
    };

    return dataMap[scenario] || { scenario, expectsError: true };
  }
}
