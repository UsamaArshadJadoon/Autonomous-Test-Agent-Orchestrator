import { TestWriterAgent } from './src/agents/test-writer-agent.js';
import { Logger } from './src/logging/logger.js';

const logger = {
  info: (msg: string) => console.log('INFO:', msg),
  error: (msg: string) => console.error('ERROR:', msg),
  warn: (msg: string) => console.warn('WARN:', msg),
  debug: (msg: string) => console.log('DEBUG:', msg),
} as Logger;

const agent = new TestWriterAgent(logger);

const story = {
  key: 'TEST-023',
  summary: 'Shopping Cart',
  acceptance_criteria: [],
  user_flows: [
    'User Flow: Add item to cart and checkout'
  ],
  test_scenarios: [],
  created_at: new Date()
};

(async () => {
  const result = await agent.generateTestCases(story);
  console.log('\nGenerated test cases:');
  result.forEach(tc => {
    console.log(`  - ${tc.name}`);
  });
})();
