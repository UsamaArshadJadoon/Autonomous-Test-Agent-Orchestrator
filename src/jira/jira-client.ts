import axios from 'axios';
import { Story, Bug } from './types.js';

export class JiraClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getStory(storyKey: string): Promise<Story> {
    const response = await axios.get(`${this.baseUrl}/rest/api/3/issues/${storyKey}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    const issue = response.data;
    const ac = this.parseAC(issue.fields.description);

    return {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description,
      acceptance_criteria: ac,
    };
  }

  async createIssue(bug: Bug): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/rest/api/3/issues`,
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
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    return response.data.key;
  }

  async linkIssue(
    sourceKey: string,
    targetKey: string,
    linkType: string
  ): Promise<void> {
    await axios.post(
      `${this.baseUrl}/rest/api/3/issueLink`,
      {
        inwardIssue: { key: sourceKey },
        outwardIssue: { key: targetKey },
        linkType: { name: linkType },
      },
      {
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );
  }

  private parseAC(description: string): string[] {
    if (!description) return [];
    const lines = description.split('\n');
    return lines
      .filter((l) => l.includes('AC') || l.includes('Acceptance'))
      .map((l) => l.trim());
  }
}
