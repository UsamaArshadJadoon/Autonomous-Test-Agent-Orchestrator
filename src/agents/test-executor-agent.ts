import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { Logger } from '../logging/logger.js';
import fs from 'fs';
import path from 'path';

export interface TestStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'assert' | 'screenshot';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  expected?: string;
  description?: string;
}

export interface TestCase {
  id: string;
  name: string;
  steps: TestStep[];
}

export interface ExecutionResult {
  passed: number;
  failed: number;
  screenshots: string[];
  logs: string[];
  details: TestExecutionDetail[];
}

export interface TestExecutionDetail {
  testId: string;
  testName: string;
  passed: boolean;
  error?: string;
  screenshots: string[];
  consoleLogs: string[];
  duration: number;
}

export class TestExecutorAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private consoleLogs: string[] = [];
  private screenshotsDir: string;

  constructor(private logger: Logger) {
    this.screenshotsDir = './screenshots';
    this.ensureScreenshotsDir();
  }

  private ensureScreenshotsDir(): void {
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  async executeTests(
    testCases: TestCase[],
    appUrl: string,
    environment: string
  ): Promise<ExecutionResult> {
    this.logger.info(`Starting test execution for ${testCases.length} test cases in ${environment} environment`);

    try {
      await this.initializeBrowser();

      const results: TestExecutionDetail[] = [];
      const allScreenshots: string[] = [];
      const allLogs: string[] = [];

      for (const testCase of testCases) {
        const detail = await this.executeTestCase(testCase, appUrl);
        results.push(detail);
        allScreenshots.push(...detail.screenshots);
        allLogs.push(...detail.consoleLogs);
      }

      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

      this.logger.info(`Test execution completed: ${passed} passed, ${failed} failed`);

      return {
        passed,
        failed,
        screenshots: allScreenshots,
        logs: allLogs,
        details: results
      };
    } finally {
      await this.cleanup();
    }
  }

  private async initializeBrowser(): Promise<void> {
    this.logger.debug('Initializing Playwright browser');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    // Setup console message listener
    this.page.on('console', msg => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      this.consoleLogs.push(logEntry);
      this.logger.debug(`Console output: ${logEntry}`);
    });

    // Setup page error listener
    this.page.on('pageerror', error => {
      const errorEntry = `Page error: ${error.message}`;
      this.consoleLogs.push(errorEntry);
      this.logger.error(`Page error detected: ${error.message}`);
    });
  }

  private async executeTestCase(testCase: TestCase, appUrl: string): Promise<TestExecutionDetail> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    this.consoleLogs = [];

    try {
      this.logger.info(`Executing test case: ${testCase.id} - ${testCase.name}`);

      for (const step of testCase.steps) {
        await this.executeStep(step, appUrl, screenshots);
      }

      const duration = Date.now() - startTime;
      const newLogs = this.consoleLogs;

      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: true,
        screenshots,
        consoleLogs: newLogs,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Test case ${testCase.id} failed: ${errorMessage}`);

      // Capture screenshot on failure
      try {
        const screenshotPath = await this.captureScreenshot(`${testCase.id}-failure`);
        screenshots.push(screenshotPath);
      } catch (screenshotError) {
        this.logger.error(`Failed to capture failure screenshot: ${screenshotError}`);
      }

      const newLogs = this.consoleLogs;

      return {
        testId: testCase.id,
        testName: testCase.name,
        passed: false,
        error: errorMessage,
        screenshots,
        consoleLogs: newLogs,
        duration
      };
    }
  }

  private async executeStep(step: TestStep, appUrl: string, screenshots: string[]): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    this.logger.debug(`Executing step: ${step.action} - ${step.description || ''}`);

    switch (step.action) {
      case 'navigate':
        if (!step.url) {
          throw new Error('Navigate action requires url parameter');
        }
        const fullUrl = step.url.startsWith('http') ? step.url : appUrl + step.url;
        await this.page.goto(fullUrl, { waitUntil: 'networkidle' });
        break;

      case 'click':
        if (!step.selector) {
          throw new Error('Click action requires selector parameter');
        }
        await this.page.click(step.selector);
        break;

      case 'fill':
        if (!step.selector || step.value === undefined) {
          throw new Error('Fill action requires selector and value parameters');
        }
        await this.page.fill(step.selector, step.value);
        break;

      case 'wait':
        if (!step.timeout) {
          throw new Error('Wait action requires timeout parameter');
        }
        if (step.selector) {
          await this.page.waitForSelector(step.selector, { timeout: step.timeout });
        } else {
          await this.page.waitForTimeout(step.timeout);
        }
        break;

      case 'assert':
        if (!step.selector || !step.expected) {
          throw new Error('Assert action requires selector and expected parameters');
        }
        const element = await this.page.$(step.selector);
        if (!element) {
          throw new Error(`Element not found: ${step.selector}`);
        }
        const content = await element.textContent();
        if (!content || !content.includes(step.expected)) {
          throw new Error(
            `Assertion failed: Expected "${step.expected}" in "${content}"`
          );
        }
        break;

      case 'screenshot':
        const screenshotName = step.description || 'screenshot';
        const screenshotPath = await this.captureScreenshot(screenshotName);
        screenshots.push(screenshotPath);
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private async captureScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotsDir, filename);

    await this.page.screenshot({ path: filepath });
    this.logger.debug(`Screenshot captured: ${filepath}`);

    return filepath;
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.info('Browser cleanup completed');
    } catch (error) {
      this.logger.error(`Error during cleanup: ${error}`);
    }
  }

  getScreenshotsDirectory(): string {
    return this.screenshotsDir;
  }

  setScreenshotsDirectory(dir: string): void {
    this.screenshotsDir = dir;
    this.ensureScreenshotsDir();
  }
}
