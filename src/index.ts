#!/usr/bin/env node

import { program } from 'commander';
import dotenv from 'dotenv';
import { createLogger } from './logging/logger.js';
import {
  OrchestratorAgent,
  StoryAgent,
  TestWriterAgent,
  GapAnalyzerAgent,
  TestExecutorAgent,
  ReviewerAgent,
  BugLoggerAgent,
} from './agents/index.js';
import { JiraClient } from './jira/jira-client.js';
import { initializeStateStore } from './execution/state-store.js';
import { initializeDatabase } from './database/pool.js';

// Load environment variables
dotenv.config();

const logger = createLogger('ATAO');

// Define CLI program
program
  .name('test-agent')
  .description('Autonomous Test Agent Orchestrator')
  .version('1.0.0');

// Define the 'run' command
program
  .command('run <storyKey>')
  .description(
    'Run test orchestration for a given Jira story key (e.g., PROJ-123)'
  )
  .option(
    '--env <environment>',
    'Target environment (qa, dev, staging, prod)',
    'qa'
  )
  .option(
    '--mode <mode>',
    'Test mode (strict, normal, lenient)',
    'normal'
  )
  .action(async (storyKey: string, options: { env: string; mode: string }) => {
    try {
      logger.info(`Starting orchestration for story: ${storyKey}`);
      logger.info(`Environment: ${options.env}, Mode: ${options.mode}`);

      // Initialize state store
      initializeStateStore();

      // Initialize database
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }
      await initializeDatabase(dbUrl, logger);

      // Initialize Jira client
      const jiraUrl = process.env.JIRA_URL;
      const jiraToken = process.env.JIRA_TOKEN;
      if (!jiraUrl || !jiraToken) {
        throw new Error('JIRA_URL and JIRA_TOKEN environment variables required');
      }
      const jiraClient = new JiraClient(jiraUrl, jiraToken);

      // Get app URL from environment based on selected environment
      const appUrlKey = `${options.env.toUpperCase()}_APP_URL`;
      const appUrl = process.env[appUrlKey];
      if (!appUrl) {
        throw new Error(`${appUrlKey} environment variable not set`);
      }

      // Initialize individual agents
      const storyAgent = new StoryAgent(jiraClient, logger);
      const testWriterAgent = new TestWriterAgent(logger);
      const gapAnalyzerAgent = new GapAnalyzerAgent(logger);
      const testExecutorAgent = new TestExecutorAgent(logger);
      const reviewerAgent = new ReviewerAgent(logger);
      const bugLoggerAgent = new BugLoggerAgent(jiraClient, logger);

      // Initialize orchestrator agent with all sub-agents
      const orchestrator = new OrchestratorAgent(
        storyAgent,
        testWriterAgent,
        gapAnalyzerAgent,
        testExecutorAgent,
        reviewerAgent,
        bugLoggerAgent,
        logger
      );

      // Run orchestration
      logger.info('Orchestration in progress...');
      const result = await orchestrator.orchestrate({
        story_key: storyKey,
        environment: options.env,
        mode: options.mode as 'strict' | 'normal' | 'lenient',
        app_url: appUrl,
      });

      // Report results
      logger.info(`Orchestration complete: ${result.status}`);
      logger.info(`Tests: ${result.tests_passed} passed, ${result.tests_failed} failed`);
      logger.info(`Bugs created: ${result.bugs_created}, Bugs failed: ${result.bugs_failed}`);
      logger.info(`Coverage: ${result.coverage_percent}%`);

      console.log('\n✓ Orchestration Complete');
      console.log(`  Status: ${result.status}`);
      console.log(`  Tests: ${result.tests_passed}/${result.tests_passed + result.tests_failed} passed`);
      console.log(`  Bugs: ${result.bugs_created} created`);
      console.log(`  Coverage: ${result.coverage_percent}%\n`);

      process.exit(result.status === 'success' ? 0 : 1);
    } catch (error) {
      logger.error('Orchestration failed', error);
      console.error('\n✗ Orchestration Failed');
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    }
  });

// Handle no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
