#!/usr/bin/env node

import { program } from "commander";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Define CLI program
program
  .name("test-agent")
  .description("Autonomous Test Agent Orchestrator")
  .version("1.0.0");

// Define the 'run' command
program
  .command("run <storyKey>")
  .description(
    "Run test orchestration for a given Jira story key (e.g., PROJ-123)"
  )
  .option(
    "--env <environment>",
    "Target environment (qa, dev, staging, prod)",
    "qa"
  )
  .option(
    "--mode <mode>",
    "Test mode (full, smoke, regression, custom)",
    "full"
  )
  .action(async (storyKey: string, options: { env: string; mode: string }) => {
    console.log(`[TEST-AGENT] Starting orchestration for story: ${storyKey}`);
    console.log(`[TEST-AGENT] Environment: ${options.env}`);
    console.log(`[TEST-AGENT] Mode: ${options.mode}`);
    console.log("[TEST-AGENT] Agent initialization in progress...");

    try {
      // Placeholder for agent logic - will be implemented in Task 2
      console.log(
        "[TEST-AGENT] Awaiting implementation of core agent logic..."
      );
      console.log("[TEST-AGENT] Framework ready. Proceeding with task queue...");
    } catch (error) {
      console.error("[TEST-AGENT] Error during orchestration:", error);
      process.exit(1);
    }
  });

// Handle no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
