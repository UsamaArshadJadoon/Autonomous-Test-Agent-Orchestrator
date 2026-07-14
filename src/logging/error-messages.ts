export const ERROR_MESSAGES = {
  // Config errors
  CONFIG_INVALID: 'Configuration is invalid. Please check .testconfig/projects/{project}/project.json',
  CONFIG_MISSING: 'Missing required configuration: {field}',
  CONFIG_NOT_FOUND: 'Configuration file not found at {path}',

  // Jira errors
  JIRA_UNREACHABLE: 'Jira is unreachable at {url}. Check your network and JIRA_URL setting.',
  JIRA_AUTH_FAILED: 'Jira authentication failed. Check your JIRA_TOKEN and credentials.',
  JIRA_INVALID_TOKEN: 'Invalid or expired Jira API token',

  // Story fetch errors
  STORY_NOT_FOUND: 'Story {story_key} not found in Jira. Verify the story key exists.',
  STORY_NO_AC: 'Story {story_key} has no acceptance criteria. Add AC before testing.',
  STORY_INVALID_FORMAT: 'Story format is invalid. Check story structure in Jira.',

  // Test generation errors
  TEST_GENERATION_TIMEOUT: 'Test generation took too long (>60s). Agent may be overloaded.',
  TEST_GENERATION_FAILED: 'Failed to generate test cases. Error: {error}',
  TEST_GENERATION_INCOMPLETE: 'Test generation incomplete. Only {count} of {total} tests generated.',

  // Execution errors
  APP_UNREACHABLE: 'App is unreachable at {url}. Check TEST_APP_URL and network.',
  DATABASE_UNREACHABLE: 'Database is unreachable. Check DATABASE_URL and credentials.',
  TEST_TIMEOUT: 'Test {test_id} exceeded 5-minute timeout.',
  TEST_ASSERTION_FAILED: 'Assertion failed: {assertion_type} on {selector}. Expected: {expected}, Got: {actual}',
  TEST_ELEMENT_NOT_FOUND: 'Element not found: {selector}',
  TEST_NAVIGATION_FAILED: 'Failed to navigate to {url}',

  // Permission errors
  PERMISSION_DENIED: 'You don\'t have permission to {action}. Required role: {required_role}',
  PERMISSION_RUN_TESTS: 'You don\'t have permission to run tests. Required role: qa_tester or higher',
  PERMISSION_LOG_BUGS: 'You don\'t have permission to log bugs. Required role: qa_tester or higher',
  PERMISSION_APPROVE: 'You don\'t have permission to approve results. Required role: qa_lead',
  PERMISSION_MANAGE_TEAM: 'You don\'t have permission to manage team. Required role: qa_lead',

  // Validation errors
  INVALID_STORY_KEY: 'Invalid story key format: {key}',
  INVALID_EMAIL: 'Invalid email address: {email}',
  INVALID_URL: 'Invalid URL format: {url}',
  INVALID_ENVIRONMENT: 'Invalid environment: {env}. Supported: {supported}',

  // Playwright errors
  BROWSER_LAUNCH_FAILED: 'Failed to launch browser. {error}',
  CONTEXT_CREATION_FAILED: 'Failed to create browser context. {error}',
  PAGE_LOAD_TIMEOUT: 'Page load timeout waiting for {selector}',
  SCREENSHOT_FAILED: 'Failed to capture screenshot: {error}',
  VIDEO_RECORDING_FAILED: 'Failed to record video: {error}',

  // API/Claude errors
  CLAUDE_API_TIMEOUT: 'Claude API timeout after {seconds}s',
  CLAUDE_API_RATE_LIMIT: 'Claude API rate limit exceeded. Retry after {wait_minutes} minutes.',
  CLAUDE_API_ERROR: 'Claude API error: {error}',
  INVALID_PROMPT: 'Invalid prompt format for agent: {agent}',

  // Success messages
  SUCCESS: 'Test execution completed successfully',
  SUCCESS_PASSED: 'All {count} tests passed',
  QUEUED: 'Your test run is queued at position {position}. Estimated wait: {wait_minutes} minutes.',

  // Warning messages
  FLAKY_TEST: 'Test {test_id} is flaky. Pass rate: {pass_rate}%',
  SLOW_TEST: 'Test {test_id} is slow. Duration: {duration}s (expected < 5s)',
  DB_CONNECTION_SLOW: 'Database connection slow. Response time: {response_time}ms',
};

export function formatMessage(
  template: string,
  vars: Record<string, string | number>
): string {
  let message = template;
  for (const [key, value] of Object.entries(vars)) {
    message = message.replace(`{${key}}`, String(value));
  }
  return message;
}
