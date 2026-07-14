import { createLogger } from '../logger.js';
import { formatMessage, ERROR_MESSAGES } from '../error-messages.js';
import {
  TestAgentError,
  ConfigError,
  JiraError,
  DatabaseError,
  PermissionError,
  TimeoutError,
  ValidationError,
  PlaywrightError
} from '../../types/errors.js';

describe('Logger', () => {
  it('should create logger instance', () => {
    const logger = createLogger('test');
    expect(logger).toBeInstanceOf(Object);
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log info messages', () => {
    const logger = createLogger('test');
    expect(() => logger.info('Test message')).not.toThrow();
  });

  it('should log error messages', () => {
    const logger = createLogger('test');
    const error = new Error('Test error');
    expect(() => logger.error('Error occurred', error)).not.toThrow();
  });

  it('should log warn messages', () => {
    const logger = createLogger('test');
    expect(() => logger.warn('Warning message')).not.toThrow();
  });

  it('should log debug messages', () => {
    const logger = createLogger('test');
    expect(() => logger.debug('Debug message')).not.toThrow();
  });

  it('should log with metadata', () => {
    const logger = createLogger('test');
    expect(() => logger.info('Message with meta', { userId: 123 })).not.toThrow();
  });
});

describe('Error Types', () => {
  it('should create TestAgentError', () => {
    const error = new TestAgentError('TEST_CODE', 'Test message', 400);
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Test message');
  });

  it('should create ConfigError with correct code', () => {
    const error = new ConfigError('Invalid config');
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ConfigError');
  });

  it('should create JiraError', () => {
    const error = new JiraError('Connection failed');
    expect(error.code).toBe('JIRA_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('JiraError');
  });

  it('should create JiraError with custom status code', () => {
    const error = new JiraError('Auth failed', 401);
    expect(error.statusCode).toBe(401);
  });

  it('should create DatabaseError', () => {
    const error = new DatabaseError('Connection pool exhausted');
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('DatabaseError');
  });

  it('should create PermissionError with 403 status', () => {
    const error = new PermissionError('Access denied');
    expect(error.code).toBe('PERMISSION_DENIED');
    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('PermissionError');
  });

  it('should create TimeoutError with 408 status', () => {
    const error = new TimeoutError('Operation timed out');
    expect(error.code).toBe('TIMEOUT');
    expect(error.statusCode).toBe(408);
    expect(error.name).toBe('TimeoutError');
  });

  it('should create ValidationError', () => {
    const error = new ValidationError('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('should create PlaywrightError', () => {
    const error = new PlaywrightError('Browser launch failed');
    expect(error.code).toBe('PLAYWRIGHT_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('PlaywrightError');
  });

  it('should allow extending Error functionality', () => {
    const error = new ConfigError('Missing field');
    expect(error instanceof Error).toBe(true);
    expect(error.toString()).toContain('ConfigError');
  });
});

describe('Error Messages', () => {
  it('should have 40+ error messages', () => {
    const messageCount = Object.keys(ERROR_MESSAGES).length;
    expect(messageCount).toBeGreaterThanOrEqual(40);
  });

  it('should format message with variables', () => {
    const message = formatMessage(
      ERROR_MESSAGES.STORY_NOT_FOUND,
      { story_key: 'PROJ-123' }
    );
    expect(message).toContain('PROJ-123');
  });

  it('should handle multiple variable replacements', () => {
    const message = formatMessage(
      'User {email} does not have permission to {action}',
      { email: 'test@example.com', action: 'approve_results' }
    );
    expect(message).toContain('test@example.com');
    expect(message).toContain('approve_results');
  });

  it('should handle numeric variables', () => {
    const message = formatMessage(
      ERROR_MESSAGES.SUCCESS_PASSED,
      { count: 42 }
    );
    expect(message).toContain('42');
  });

  it('should include config error messages', () => {
    expect(ERROR_MESSAGES.CONFIG_INVALID).toBeDefined();
    expect(ERROR_MESSAGES.CONFIG_MISSING).toBeDefined();
    expect(ERROR_MESSAGES.CONFIG_NOT_FOUND).toBeDefined();
  });

  it('should include jira error messages', () => {
    expect(ERROR_MESSAGES.JIRA_UNREACHABLE).toBeDefined();
    expect(ERROR_MESSAGES.JIRA_AUTH_FAILED).toBeDefined();
    expect(ERROR_MESSAGES.JIRA_INVALID_TOKEN).toBeDefined();
  });

  it('should include story error messages', () => {
    expect(ERROR_MESSAGES.STORY_NOT_FOUND).toBeDefined();
    expect(ERROR_MESSAGES.STORY_NO_AC).toBeDefined();
    expect(ERROR_MESSAGES.STORY_INVALID_FORMAT).toBeDefined();
  });

  it('should include test generation error messages', () => {
    expect(ERROR_MESSAGES.TEST_GENERATION_TIMEOUT).toBeDefined();
    expect(ERROR_MESSAGES.TEST_GENERATION_FAILED).toBeDefined();
    expect(ERROR_MESSAGES.TEST_GENERATION_INCOMPLETE).toBeDefined();
  });

  it('should include execution error messages', () => {
    expect(ERROR_MESSAGES.APP_UNREACHABLE).toBeDefined();
    expect(ERROR_MESSAGES.DATABASE_UNREACHABLE).toBeDefined();
    expect(ERROR_MESSAGES.TEST_TIMEOUT).toBeDefined();
    expect(ERROR_MESSAGES.TEST_ASSERTION_FAILED).toBeDefined();
    expect(ERROR_MESSAGES.TEST_ELEMENT_NOT_FOUND).toBeDefined();
    expect(ERROR_MESSAGES.TEST_NAVIGATION_FAILED).toBeDefined();
  });

  it('should include permission error messages', () => {
    expect(ERROR_MESSAGES.PERMISSION_DENIED).toBeDefined();
    expect(ERROR_MESSAGES.PERMISSION_RUN_TESTS).toBeDefined();
    expect(ERROR_MESSAGES.PERMISSION_LOG_BUGS).toBeDefined();
    expect(ERROR_MESSAGES.PERMISSION_APPROVE).toBeDefined();
    expect(ERROR_MESSAGES.PERMISSION_MANAGE_TEAM).toBeDefined();
  });

  it('should include validation error messages', () => {
    expect(ERROR_MESSAGES.INVALID_STORY_KEY).toBeDefined();
    expect(ERROR_MESSAGES.INVALID_EMAIL).toBeDefined();
    expect(ERROR_MESSAGES.INVALID_URL).toBeDefined();
    expect(ERROR_MESSAGES.INVALID_ENVIRONMENT).toBeDefined();
  });

  it('should include playwright error messages', () => {
    expect(ERROR_MESSAGES.BROWSER_LAUNCH_FAILED).toBeDefined();
    expect(ERROR_MESSAGES.CONTEXT_CREATION_FAILED).toBeDefined();
    expect(ERROR_MESSAGES.PAGE_LOAD_TIMEOUT).toBeDefined();
    expect(ERROR_MESSAGES.SCREENSHOT_FAILED).toBeDefined();
    expect(ERROR_MESSAGES.VIDEO_RECORDING_FAILED).toBeDefined();
  });

  it('should include API error messages', () => {
    expect(ERROR_MESSAGES.CLAUDE_API_TIMEOUT).toBeDefined();
    expect(ERROR_MESSAGES.CLAUDE_API_RATE_LIMIT).toBeDefined();
    expect(ERROR_MESSAGES.CLAUDE_API_ERROR).toBeDefined();
    expect(ERROR_MESSAGES.INVALID_PROMPT).toBeDefined();
  });

  it('should include success messages', () => {
    expect(ERROR_MESSAGES.SUCCESS).toBeDefined();
    expect(ERROR_MESSAGES.SUCCESS_PASSED).toBeDefined();
    expect(ERROR_MESSAGES.QUEUED).toBeDefined();
  });

  it('should include warning messages', () => {
    expect(ERROR_MESSAGES.FLAKY_TEST).toBeDefined();
    expect(ERROR_MESSAGES.SLOW_TEST).toBeDefined();
    expect(ERROR_MESSAGES.DB_CONNECTION_SLOW).toBeDefined();
  });

  it('should format complex message with multiple variables', () => {
    const message = formatMessage(
      ERROR_MESSAGES.TEST_ASSERTION_FAILED,
      {
        assertion_type: 'visibility',
        selector: '.submit-button',
        expected: 'true',
        actual: 'false'
      }
    );
    expect(message).toContain('visibility');
    expect(message).toContain('.submit-button');
    expect(message).toContain('true');
    expect(message).toContain('false');
  });
});
