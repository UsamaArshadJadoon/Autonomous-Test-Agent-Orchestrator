export class TestAgentError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'TestAgentError';
  }
}

export class ConfigError extends TestAgentError {
  constructor(message: string) {
    super('CONFIG_ERROR', message, 400);
    this.name = 'ConfigError';
  }
}

export class JiraError extends TestAgentError {
  constructor(message: string, statusCode: number = 500) {
    super('JIRA_ERROR', message, statusCode);
    this.name = 'JiraError';
  }
}

export class DatabaseError extends TestAgentError {
  constructor(message: string) {
    super('DATABASE_ERROR', message, 500);
    this.name = 'DatabaseError';
  }
}

export class PermissionError extends TestAgentError {
  constructor(message: string) {
    super('PERMISSION_DENIED', message, 403);
    this.name = 'PermissionError';
  }
}

export class TimeoutError extends TestAgentError {
  constructor(message: string) {
    super('TIMEOUT', message, 408);
    this.name = 'TimeoutError';
  }
}

export class PlaywrightError extends TestAgentError {
  constructor(message: string) {
    super('PLAYWRIGHT_ERROR', message, 500);
    this.name = 'PlaywrightError';
  }
}

export class ValidationError extends TestAgentError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}
