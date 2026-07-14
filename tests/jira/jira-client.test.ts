import axios from 'axios';
import { JiraClient } from '../../src/jira/jira-client.js';
import { Bug } from '../../src/jira/types.js';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JiraClient', () => {
  const baseUrl = 'https://jira.example.com';
  const token = 'test-token';
  let client: JiraClient;

  beforeEach(() => {
    client = new JiraClient(baseUrl, token);
    jest.clearAllMocks();
  });

  describe('getStory', () => {
    it('should fetch story details and parse acceptance criteria', async () => {
      const mockResponse = {
        data: {
          key: 'STORY-123',
          fields: {
            summary: 'User Login Feature',
            description:
              'Login functionality\nAC: User can enter credentials\nAC: System validates credentials\nAcceptance: User sees success message',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const story = await client.getStory('STORY-123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/issues/STORY-123`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      expect(story.key).toBe('STORY-123');
      expect(story.summary).toBe('User Login Feature');
      expect(story.acceptance_criteria).toHaveLength(3);
      expect(story.acceptance_criteria).toContain('AC: User can enter credentials');
    });

    it('should handle empty description', async () => {
      const mockResponse = {
        data: {
          key: 'STORY-456',
          fields: {
            summary: 'Empty Story',
            description: '',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const story = await client.getStory('STORY-456');

      expect(story.acceptance_criteria).toEqual([]);
    });

    it('should handle null description', async () => {
      const mockResponse = {
        data: {
          key: 'STORY-789',
          fields: {
            summary: 'Null Story',
            description: null,
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const story = await client.getStory('STORY-789');

      expect(story.acceptance_criteria).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(client.getStory('STORY-999')).rejects.toThrow('API Error');
    });
  });

  describe('createIssue', () => {
    it('should create an issue with bug details', async () => {
      const bug: Bug = {
        title: 'Login button not responding',
        description: 'Login button on homepage does not respond to clicks',
        environment: 'Staging',
        test_id: 'TEST-001',
        reproduction_steps: [
          'Navigate to homepage',
          'Click login button',
          'Observe no action',
        ],
      };

      const mockResponse = {
        data: {
          key: 'BUG-123',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const issueKey = await client.createIssue(bug);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/issues`,
        {
          fields: {
            project: { key: 'QA' },
            summary: bug.title,
            description: bug.description,
            environment: bug.environment,
            customfield_10000: bug.test_id,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      expect(issueKey).toBe('BUG-123');
    });

    it('should throw error on creation failure', async () => {
      const bug: Bug = {
        title: 'Test Bug',
        description: 'Test description',
        environment: 'Prod',
        test_id: 'TEST-002',
        reproduction_steps: ['Step 1'],
      };

      mockedAxios.post.mockRejectedValueOnce(new Error('Creation failed'));

      await expect(client.createIssue(bug)).rejects.toThrow('Creation failed');
    });
  });

  describe('linkIssue', () => {
    it('should link two issues with specified link type', async () => {
      mockedAxios.post.mockResolvedValueOnce({});

      await client.linkIssue('STORY-123', 'BUG-456', 'relates to');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${baseUrl}/rest/api/3/issueLink`,
        {
          inwardIssue: { key: 'STORY-123' },
          outwardIssue: { key: 'BUG-456' },
          linkType: { name: 'relates to' },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    });

    it('should handle different link types', async () => {
      mockedAxios.post.mockResolvedValueOnce({});

      await client.linkIssue('BUG-001', 'STORY-100', 'is caused by');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          linkType: { name: 'is caused by' },
        }),
        expect.any(Object)
      );
    });

    it('should throw error on link failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Link failed'));

      await expect(
        client.linkIssue('STORY-123', 'BUG-456', 'relates to')
      ).rejects.toThrow('Link failed');
    });
  });

  describe('parseAC', () => {
    it('should parse acceptance criteria with AC prefix', async () => {
      const mockResponse = {
        data: {
          key: 'STORY-100',
          fields: {
            summary: 'Test Story',
            description:
              'Line 1\nAC: First criteria\nLine 3\nAC: Second criteria',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const story = await client.getStory('STORY-100');

      expect(story.acceptance_criteria).toContain('AC: First criteria');
      expect(story.acceptance_criteria).toContain('AC: Second criteria');
    });

    it('should parse acceptance criteria with Acceptance prefix', async () => {
      const mockResponse = {
        data: {
          key: 'STORY-200',
          fields: {
            summary: 'Test Story',
            description:
              'Feature description\nAcceptance: Criteria 1\nSome text\nAcceptance: Criteria 2',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const story = await client.getStory('STORY-200');

      expect(story.acceptance_criteria).toContain('Acceptance: Criteria 1');
      expect(story.acceptance_criteria).toContain('Acceptance: Criteria 2');
    });

    it('should trim whitespace from criteria', async () => {
      const mockResponse = {
        data: {
          key: 'STORY-300',
          fields: {
            summary: 'Test Story',
            description:
              'Description\n   AC: Whitespace criteria   \nOther text',
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const story = await client.getStory('STORY-300');

      expect(story.acceptance_criteria[0]).toBe('AC: Whitespace criteria');
    });
  });
});
