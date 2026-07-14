import { JiraClient } from '../jira/jira-client.js';
import { Logger } from '../logging/logger.js';

export interface ParsedStory {
  key: string;
  summary: string;
  acceptance_criteria: string[];
  user_flows: string[];
  test_scenarios: string[];
  created_at: Date;
}

export class StoryAgent {
  constructor(private jiraClient: JiraClient, private logger: Logger) {}

  async fetchAndParseStory(storyKey: string): Promise<ParsedStory> {
    this.logger.info(`Fetching story: ${storyKey}`);

    const story = await this.jiraClient.getStory(storyKey);

    const ac = this.parseAcceptanceCriteria(story.description);
    const flows = this.parseUserFlows(story.description);
    const scenarios = this.generateTestScenarios(ac, flows);

    this.logger.info(`Parsed story ${storyKey}: ${ac.length} AC, ${flows.length} flows`);

    return {
      key: story.key,
      summary: story.summary,
      acceptance_criteria: ac,
      user_flows: flows,
      test_scenarios: scenarios,
      created_at: new Date()
    };
  }

  private parseAcceptanceCriteria(description: string): string[] {
    if (!description) return [];
    return description
      .split('\n')
      .filter(line => /^(AC|Acceptance Criteria|Given|When|Then)/.test(line.trim()))
      .map(line => line.trim());
  }

  private parseUserFlows(description: string): string[] {
    if (!description) return [];
    return description
      .split('\n')
      .filter(line => /^(User Flow|Flow:)/.test(line.trim()))
      .map(line => line.trim());
  }

  private generateTestScenarios(ac: string[], flows: string[]): string[] {
    const scenarios: string[] = [];

    // Generate from AC
    for (const criterion of ac) {
      scenarios.push(`Test: ${criterion}`);
    }

    // Generate from flows
    for (const flow of flows) {
      scenarios.push(`Flow: ${flow}`);
    }

    return scenarios;
  }
}
