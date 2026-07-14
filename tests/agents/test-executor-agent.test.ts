import { TestExecutorAgent, TestCase, TestStep } from '../../src/agents/test-executor-agent.js';
import { Logger } from '../../src/logging/logger.js';
import fs from 'fs';

// Mock Playwright
jest.mock('playwright', () => {
  const mockPage = {
    goto: jest.fn(),
    click: jest.fn(),
    fill: jest.fn(),
    $: jest.fn(),
    textContent: jest.fn(),
    waitForSelector: jest.fn(),
    waitForTimeout: jest.fn(),
    screenshot: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
  };

  const mockContext = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn(),
  };

  const mockBrowser = {
    newContext: jest.fn().mockResolvedValue(mockContext),
    close: jest.fn(),
  };

  return {
    chromium: {
      launch: jest.fn().mockResolvedValue(mockBrowser),
    },
  };
});

// Mock fs
jest.mock('fs');

describe('TestExecutorAgent', () => {
  let agent: TestExecutorAgent;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

    agent = new TestExecutorAgent(mockLogger);
  });

  describe('Browser Initialization', () => {
    it('should initialize browser successfully', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-001',
          name: 'Simple Test',
          steps: [
            {
              action: 'navigate',
              url: '/',
            },
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting test execution')
      );
      expect(result).toBeDefined();
      expect(result.details).toHaveLength(1);
    });

    it('should create screenshots directory if not exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const newAgent = new TestExecutorAgent(mockLogger);
      expect(newAgent).toBeDefined();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('screenshots'),
        { recursive: true }
      );
    });
  });

  describe('Test Execution', () => {
    it('should execute single test case successfully', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-001',
          name: 'Navigation Test',
          steps: [
            {
              action: 'navigate',
              url: '/',
              description: 'Navigate to home',
            },
          ],
        },
      ];

      const result = await agent.executeTests(
        testCases,
        'http://localhost:3000',
        'production'
      );

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(1);
      expect(result.details[0].passed).toBe(true);
      expect(result.details[0].testId).toBe('TEST-001');
    });

    it('should execute multiple test cases', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-001',
          name: 'Test 1',
          steps: [{ action: 'navigate', url: '/' }],
        },
        {
          id: 'TEST-002',
          name: 'Test 2',
          steps: [{ action: 'navigate', url: '/about' }],
        },
        {
          id: 'TEST-003',
          name: 'Test 3',
          steps: [{ action: 'navigate', url: '/contact' }],
        },
      ];

      const result = await agent.executeTests(
        testCases,
        'http://localhost:3000',
        'staging'
      );

      expect(result.passed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(3);
    });

    it('should handle test case failure gracefully', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      (mockPage.click as jest.Mock).mockRejectedValueOnce(
        new Error('Element not found')
      );
      (mockPage.screenshot as jest.Mock).mockResolvedValueOnce(undefined);

      const testCases: TestCase[] = [
        {
          id: 'TEST-FAIL',
          name: 'Failing Test',
          steps: [
            { action: 'navigate', url: '/' },
            { action: 'click', selector: '.non-existent', description: 'Click non-existent' },
          ],
        },
      ];

      const result = await agent.executeTests(
        testCases,
        'http://localhost:3000',
        'development'
      );

      expect(result.failed).toBe(1);
      expect(result.passed).toBe(0);
      expect(result.details[0].passed).toBe(false);
      expect(result.details[0].error).toContain('Element not found');
    });
  });

  describe('Test Steps', () => {
    it('should execute navigate step with full URL', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const testCases: TestCase[] = [
        {
          id: 'TEST-NAV-001',
          name: 'Navigate with full URL',
          steps: [
            {
              action: 'navigate',
              url: 'http://example.com/page',
            },
          ],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.goto).toHaveBeenCalledWith(
        'http://example.com/page',
        { waitUntil: 'networkidle' }
      );
    });

    it('should execute navigate step with relative URL', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const testCases: TestCase[] = [
        {
          id: 'TEST-NAV-002',
          name: 'Navigate with relative URL',
          steps: [
            {
              action: 'navigate',
              url: '/dashboard',
            },
          ],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.goto).toHaveBeenCalledWith(
        'http://localhost:3000/dashboard',
        { waitUntil: 'networkidle' }
      );
    });

    it('should execute click step', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const testCases: TestCase[] = [
        {
          id: 'TEST-CLICK-001',
          name: 'Click button',
          steps: [
            { action: 'navigate', url: '/' },
            { action: 'click', selector: 'button.submit', description: 'Click submit button' },
          ],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.click).toHaveBeenCalledWith('button.submit');
    });

    it('should execute fill step', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const testCases: TestCase[] = [
        {
          id: 'TEST-FILL-001',
          name: 'Fill form field',
          steps: [
            { action: 'navigate', url: '/' },
            {
              action: 'fill',
              selector: 'input[name="username"]',
              value: 'testuser',
              description: 'Enter username',
            },
          ],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.fill).toHaveBeenCalledWith('input[name="username"]', 'testuser');
    });

    it('should execute assertion step successfully', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const mockElement = { textContent: jest.fn().mockResolvedValue('Welcome') };
      (mockPage.$ as jest.Mock).mockResolvedValue(mockElement);

      const testCases: TestCase[] = [
        {
          id: 'TEST-ASSERT-001',
          name: 'Assert element text',
          steps: [
            { action: 'navigate', url: '/' },
            {
              action: 'assert',
              selector: 'h1',
              expected: 'Welcome',
              description: 'Verify welcome message',
            },
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should fail assertion when element not found', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      (mockPage.$ as jest.Mock).mockResolvedValue(null);
      (mockPage.screenshot as jest.Mock).mockResolvedValueOnce(undefined);

      const testCases: TestCase[] = [
        {
          id: 'TEST-ASSERT-FAIL',
          name: 'Assert non-existent element',
          steps: [
            { action: 'navigate', url: '/' },
            {
              action: 'assert',
              selector: '.non-existent',
              expected: 'text',
            },
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.failed).toBe(1);
      expect(result.details[0].error).toContain('Element not found');
    });

    it('should execute wait step for selector', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const testCases: TestCase[] = [
        {
          id: 'TEST-WAIT-001',
          name: 'Wait for element',
          steps: [
            { action: 'navigate', url: '/' },
            {
              action: 'wait',
              selector: '.loader',
              timeout: 5000,
              description: 'Wait for loader to disappear',
            },
          ],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loader', { timeout: 5000 });
    });

    it('should execute wait step for timeout', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const testCases: TestCase[] = [
        {
          id: 'TEST-WAIT-002',
          name: 'Wait for duration',
          steps: [
            { action: 'navigate', url: '/' },
            {
              action: 'wait',
              timeout: 1000,
              description: 'Wait 1 second',
            },
          ],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should capture screenshot on step', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      (mockPage.screenshot as jest.Mock).mockResolvedValueOnce(undefined);

      const testCases: TestCase[] = [
        {
          id: 'TEST-SCREENSHOT-001',
          name: 'Capture screenshot',
          steps: [
            { action: 'navigate', url: '/' },
            {
              action: 'screenshot',
              description: 'homepage',
            },
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.screenshot).toHaveBeenCalled();
      expect(result.screenshots.length).toBeGreaterThan(0);
    });

    it('should throw error for navigate without URL', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-ERROR-001',
          name: 'Navigate without URL',
          steps: [
            {
              action: 'navigate',
            } as TestStep,
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.failed).toBe(1);
      expect(result.details[0].error).toContain('requires url parameter');
    });

    it('should throw error for click without selector', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-ERROR-002',
          name: 'Click without selector',
          steps: [
            {
              action: 'click',
            } as TestStep,
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.failed).toBe(1);
      expect(result.details[0].error).toContain('requires selector parameter');
    });
  });

  describe('Screenshots and Logging', () => {
    it('should capture screenshot on test failure', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      (mockPage.click as jest.Mock).mockRejectedValueOnce(new Error('Click failed'));
      (mockPage.screenshot as jest.Mock).mockResolvedValueOnce(undefined);

      const testCases: TestCase[] = [
        {
          id: 'TEST-SCREENSHOT-FAIL',
          name: 'Test with screenshot on failure',
          steps: [
            { action: 'navigate', url: '/' },
            { action: 'click', selector: '.button' },
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.failed).toBe(1);
      expect(result.screenshots.length).toBeGreaterThan(0);
    });

    it('should collect console logs from page', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      (mockPage.on as jest.Mock).mockImplementation((event) => {
        // Verify that event listener is set up
        expect(['console', 'pageerror']).toContain(event);
      });

      const testCases: TestCase[] = [
        {
          id: 'TEST-LOGS-001',
          name: 'Test with console logs',
          steps: [
            { action: 'navigate', url: '/' },
          ],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.on).toHaveBeenCalled();
    });

    it('should set and use custom screenshots directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockClear();
      const customDir = './custom-screenshots';
      agent.setScreenshotsDirectory(customDir);

      expect(agent.getScreenshotsDirectory()).toBe(customDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(customDir, { recursive: true });
    });
  });

  describe('Environment Handling', () => {
    it('should execute tests in development environment', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-ENV-DEV',
          name: 'Development test',
          steps: [{ action: 'navigate', url: '/' }],
        },
      ];

      const result = await agent.executeTests(
        testCases,
        'http://localhost:3000',
        'development'
      );

      expect(result.details[0].testName).toBe('Development test');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('development')
      );
    });

    it('should execute tests in production environment', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-ENV-PROD',
          name: 'Production test',
          steps: [{ action: 'navigate', url: '/' }],
        },
      ];

      const result = await agent.executeTests(
        testCases,
        'http://example.com',
        'production'
      );

      expect(result.details[0].testName).toBe('Production test');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('production')
      );
    });
  });

  describe('Test Duration', () => {
    it('should record test execution duration', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-DURATION',
          name: 'Duration test',
          steps: [{ action: 'navigate', url: '/' }],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.details[0].duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.details[0].duration).toBe('number');
    });
  });

  describe('Complex Test Scenarios', () => {
    it('should execute multi-step test with navigation, fill, and assertion', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const mockElement = { textContent: jest.fn().mockResolvedValue('Login Successful') };
      (mockPage.$ as jest.Mock).mockResolvedValue(mockElement);

      const testCases: TestCase[] = [
        {
          id: 'TEST-COMPLEX-001',
          name: 'Login flow',
          steps: [
            { action: 'navigate', url: '/login' },
            { action: 'fill', selector: 'input[name="username"]', value: 'user@example.com' },
            { action: 'fill', selector: 'input[name="password"]', value: 'password123' },
            { action: 'click', selector: 'button[type="submit"]' },
            { action: 'wait', timeout: 2000 },
            { action: 'assert', selector: '.success-message', expected: 'Login Successful' },
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockPage.fill).toHaveBeenCalledWith('input[name="username"]', 'user@example.com');
      expect(mockPage.fill).toHaveBeenCalledWith('input[name="password"]', 'password123');
      expect(mockPage.click).toHaveBeenCalledWith('button[type="submit"]');
    });

    it('should execute test with multiple assertions', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const mockElement = { textContent: jest.fn().mockResolvedValue('Expected Text') };
      (mockPage.$ as jest.Mock).mockResolvedValue(mockElement);

      const testCases: TestCase[] = [
        {
          id: 'TEST-MULTI-ASSERT',
          name: 'Multiple assertions',
          steps: [
            { action: 'navigate', url: '/' },
            { action: 'assert', selector: 'h1', expected: 'Expected Text' },
            { action: 'assert', selector: 'p', expected: 'Expected Text' },
            { action: 'assert', selector: 'span', expected: 'Expected Text' },
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.passed).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockPage.$).toHaveBeenCalledTimes(3);
    });

    it('should handle empty test cases array', async () => {
      const result = await agent.executeTests([], 'http://localhost:3000', 'development');

      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.details).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action type', async () => {
      const testCases: TestCase[] = [
        {
          id: 'TEST-UNKNOWN-ACTION',
          name: 'Unknown action',
          steps: [
            {
              action: 'unknown',
            } as any,
          ],
        },
      ];

      const result = await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(result.failed).toBe(1);
      expect(result.details[0].error).toContain('Unknown action');
    });

    it('should clean up browser resources on completion', async () => {
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();

      const testCases: TestCase[] = [
        {
          id: 'TEST-CLEANUP',
          name: 'Cleanup test',
          steps: [{ action: 'navigate', url: '/' }],
        },
      ];

      await agent.executeTests(testCases, 'http://localhost:3000', 'development');

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
});
