import { StoryAgent } from '../../src/agents/story-agent.js';
import { JiraClient } from '../../src/jira/jira-client.js';
import { Logger } from '../../src/logging/logger.js';

jest.mock('../../src/jira/jira-client.js');

describe('StoryAgent', () => {
  let agent: StoryAgent;
  let mockJiraClient: jest.Mocked<JiraClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJiraClient = {
      getStory: jest.fn(),
      createIssue: jest.fn(),
      linkIssue: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    agent = new StoryAgent(mockJiraClient, mockLogger);
  });

  describe('fetchAndParseStory', () => {
    it('should fetch story and parse acceptance criteria', async () => {
      const mockStory = {
        key: 'PROJ-123',
        summary: 'User Login Feature',
        description: `
          Feature: User Login
          AC: User can enter credentials
          AC: System validates credentials
          AC: User sees success message
        `,
        acceptance_criteria: ['AC: User can enter credentials'],
      };

      mockJiraClient.getStory.mockResolvedValueOnce(mockStory);

      const result = await agent.fetchAndParseStory('PROJ-123');

      expect(result.key).toBe('PROJ-123');
      expect(result.summary).toBe('User Login Feature');
      expect(result.acceptance_criteria).toHaveLength(3);
      expect(result.acceptance_criteria[0]).toBe('AC: User can enter credentials');
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching story: PROJ-123');
    });

    it('should parse user flows from story description', async () => {
      const mockStory = {
        key: 'PROJ-456',
        summary: 'Payment Processing',
        description: `
          As a customer
          User Flow: Add item to cart
          Flow: Proceed to checkout
          Step 1: Enter payment details
        `,
        acceptance_criteria: [],
      };

      mockJiraClient.getStory.mockResolvedValueOnce(mockStory);

      const result = await agent.fetchAndParseStory('PROJ-456');

      expect(result.user_flows).toHaveLength(2);
      expect(result.user_flows[0]).toBe('User Flow: Add item to cart');
      expect(result.user_flows[1]).toBe('Flow: Proceed to checkout');
    });

    it('should generate test scenarios from AC and flows', async () => {
      const mockStory = {
        key: 'PROJ-789',
        summary: 'Search Feature',
        description: `
          AC: User can search by keyword
          AC: Results are filtered by category
          User Flow: Search and filter results
        `,
        acceptance_criteria: [],
      };

      mockJiraClient.getStory.mockResolvedValueOnce(mockStory);

      const result = await agent.fetchAndParseStory('PROJ-789');

      expect(result.test_scenarios).toHaveLength(3);
      expect(result.test_scenarios[0]).toContain('Test: AC: User can search by keyword');
      expect(result.test_scenarios[2]).toContain('Flow: User Flow: Search and filter results');
    });

    it('should handle empty description gracefully', async () => {
      const mockStory = {
        key: 'PROJ-000',
        summary: 'Empty Story',
        description: '',
        acceptance_criteria: [],
      };

      mockJiraClient.getStory.mockResolvedValueOnce(mockStory);

      const result = await agent.fetchAndParseStory('PROJ-000');

      expect(result.acceptance_criteria).toEqual([]);
      expect(result.user_flows).toEqual([]);
      expect(result.test_scenarios).toEqual([]);
    });

    it('should handle null description', async () => {
      const mockStory = {
        key: 'PROJ-111',
        summary: 'Null Story',
        description: null as any,
        acceptance_criteria: [],
      };

      mockJiraClient.getStory.mockResolvedValueOnce(mockStory);

      const result = await agent.fetchAndParseStory('PROJ-111');

      expect(result.acceptance_criteria).toEqual([]);
      expect(result.user_flows).toEqual([]);
      expect(result.test_scenarios).toEqual([]);
    });

    it('should parse acceptance criteria with different prefixes', async () => {
      const mockStory = {
        key: 'PROJ-222',
        summary: 'Multi-prefix Story',
        description: `
          AC: First AC
          Acceptance Criteria: Second AC
          Given some context
          When user performs action
          Then system responds
        `,
        acceptance_criteria: [],
      };

      mockJiraClient.getStory.mockResolvedValueOnce(mockStory);

      const result = await agent.fetchAndParseStory('PROJ-222');

      expect(result.acceptance_criteria).toHaveLength(5);
      expect(result.acceptance_criteria).toContain('AC: First AC');
      expect(result.acceptance_criteria).toContain('Acceptance Criteria: Second AC');
      expect(result.acceptance_criteria).toContain('Given some context');
    });

    it('should throw error when story fetch fails', async () => {
      mockJiraClient.getStory.mockRejectedValueOnce(new Error('Failed to fetch story'));

      await expect(agent.fetchAndParseStory('PROJ-999')).rejects.toThrow(
        'Failed to fetch story'
      );
    });

    it('should include created_at timestamp in result', async () => {
      const mockStory = {
        key: 'PROJ-333',
        summary: 'Story with timestamp',
        description: 'AC: Test acceptance criteria',
        acceptance_criteria: [],
      };

      mockJiraClient.getStory.mockResolvedValueOnce(mockStory);

      const beforeFetch = new Date();
      const result = await agent.fetchAndParseStory('PROJ-333');
      const afterFetch = new Date();

      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime());
      expect(result.created_at.getTime()).toBeLessThanOrEqual(afterFetch.getTime());
    });
  });
});
