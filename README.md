# Autonomous Test Agent Orchestrator (ATAO)

An intelligent, multi-agent system that automates manual testing workflows by fetching user stories from Jira, generating comprehensive test cases, executing tests with browser automation, logging bugs, and validating test coverage—all without human intervention.

## Features

- **Jira Integration**: Automatically fetch user story details and acceptance criteria
- **Intelligent Test Generation**: AI-driven test case creation with 15-25 cases per story covering happy paths, edge cases, and error scenarios
- **Test Coverage Analysis**: Gap analysis to identify uncovered acceptance criteria
- **Automated Test Execution**: Playwright-based browser automation with screenshot and log capture
- **Bug Logging**: Automatic Jira issue creation for failed tests with full context
- **Review & Approval**: Validation against acceptance criteria with approval workflows
- **Multi-Project Support**: Configuration-driven setup for different projects and teams
- **Role-Based Access Control**: Team collaboration with granular permissions (qa_lead, qa_tester, developer)
- **Webhook Integration**: CI/CD notifications via webhooks with HMAC signatures

## Architecture

The system consists of 7 specialized Claude API agents that orchestrate the entire workflow:

```
Story Agent ? Test Writer Agent ? Gap Analyzer Agent ? Test Executor Agent 
    ?                                                              ?
(Fetch & parse               (Generate test cases)   (Validate coverage)   (Run tests)
 acceptance criteria)                                                           ?
                                                                        Reviewer Agent
                                                                            ?
                                                                    (Approve/Reject)
                                                                            ?
                                                                    Bug Logger Agent
                                                                    (Create Jira issues)
```

### Components

- **Story Agent**: Fetches user story from Jira, parses acceptance criteria
- **Test Writer Agent**: Generates comprehensive test cases with smart test data
- **Gap Analyzer Agent**: Maps test cases to acceptance criteria, identifies gaps
- **Test Executor Agent**: Runs tests in Playwright, captures screenshots and logs
- **Bug Logger Agent**: Creates Jira issues for failed tests with full context
- **Reviewer Agent**: Validates execution against requirements, approval decisions
- **Orchestrator Agent**: Coordinates all agents, manages workflow state

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Jira instance with API access
- Anthropic API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/UsamaArshadJadoon/Autonomous-Test-Agent-Orchestrator.git
   cd test-agent-orchestrator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   - `JIRA_URL`: Your Jira instance URL
   - `JIRA_TOKEN`: Jira API token
   - `DATABASE_URL`: PostgreSQL connection string
   - `ANTHROPIC_API_KEY`: Claude API key
   - `QA_APP_URL`, `DEV_APP_URL`, `STAGING_APP_URL`: Application URLs for each environment

4. **Setup database**
   ```bash
   psql -U postgres -f db/schema.sql
   ```

5. **Build**
   ```bash
   npm run build
   ```

## Usage

### Basic Workflow

Run tests for a user story:

```bash
test-agent run PROJ-123 --env qa --mode full
```

Options:
- `--env`: Target environment (qa, dev, staging, prod) — default: qa
- `--mode`: Test mode
  - `smoke`: Quick 5-10 tests (2 min)
  - `full`: Comprehensive 45-60 tests (5 min) — default
  - `regression`: Full + baseline comparison (8 min)

### What Happens

1. **Story Agent** fetches the story from Jira (PROJ-123)
2. **Test Writer** generates 45-60 test cases covering all acceptance criteria
3. **Gap Analyzer** validates that all AC are covered by tests
4. **Test Executor** runs tests in Playwright, capturing failures
5. **Reviewer** validates results against AC
6. **Bug Logger** creates Jira issues for any failures
7. **Webhooks** send notifications to CI/CD systems

### Expected Output

```
? Orchestration Complete
  Status: COMPLETED
  Tests: 52/54 passed
  Bugs: 2 created
  Coverage: 98%
```

### View Results

Results are stored in execution state and database:
- Logs: `logs/execution_*.log`
- Artifacts: `artifacts/<execution_id>/` (screenshots, videos)
- Database: Check `execution_results` table

## Configuration

### Project Configuration

Projects are configured via JSON files in `.testconfig/`:

```
.testconfig/
+-- projects.json          # Project registry
+-- global-settings.json   # Global settings
+-- projects/
    +-- PROJ/
        +-- project.json   # Project-specific config
        +-- environments.json
        +-- rbac.json
```

Example `projects.json`:
```json
{
  "projects": [
    {
      "key": "PROJ",
      "name": "Main Project",
      "jira_project": "PROJ",
      "environments": ["qa", "dev", "staging"]
    }
  ]
}
```

### RBAC Configuration

Three roles with granular permissions:

- **qa_lead**: Can run tests, approve results, log bugs
- **qa_tester**: Can run tests and log bugs, cannot approve
- **developer**: Can run tests only

Configure in `.testconfig/projects/PROJ/rbac.json`:
```json
{
  "roles": {
    "qa_lead": {
      "permissions": ["run_tests", "approve_results", "log_bugs"]
    },
    "qa_tester": {
      "permissions": ["run_tests", "log_bugs"]
    },
    "developer": {
      "permissions": ["run_tests"]
    }
  }
}
```

## Development

### Build
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Code Coverage
```bash
npm run coverage
```

### Linting
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

## Database Schema

The system uses PostgreSQL with the following main tables:

- `users`: Team members
- `accounts`: Test accounts (fake user data)
- `products`: Test products
- `sessions`: Session management
- `audit_log`: Complete audit trail
- `execution_results`: Test execution history

See `db/schema.sql` for the complete schema.

## Webhook Integration

Register webhooks for CI/CD notifications:

```typescript
import { WebhookManager } from './webhooks/webhook-manager.js';

const manager = new WebhookManager();
manager.registerEndpoint({
  name: 'slack',
  url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  events: ['TEST_COMPLETED', 'BUG_CREATED'],
});
```

Events sent:
- `TEST_COMPLETED`: When test execution finishes
- `BUG_CREATED`: When bugs are logged to Jira
- `APPROVAL_NEEDED`: When awaiting approval

All payloads are signed with HMAC-SHA256 for verification.

## Execution State

Each test run gets a unique execution ID: `exec_YYYYMMDD_[8-hex]`

State is persisted to `.execution-states/` and includes:
- Story key and acceptance criteria
- Test cases and results
- Coverage metrics
- Approval status
- Error tracking
- Timestamps

## Error Handling

The system includes comprehensive error handling:

- **ConfigError**: Configuration issues
- **JiraError**: Jira API errors
- **DatabaseError**: Database connection errors
- **PermissionError**: RBAC permission denied
- **PlaywrightError**: Browser automation errors
- **ValidationError**: Input validation failures
- **TimeoutError**: Operation timeouts

See `src/logging/error-messages.ts` for 42 detailed error messages across 9 categories.

## Logging

Winston-based logging with:
- Console output
- File rotation (error.log, combined.log)
- Configurable log levels via `LOG_LEVEL` env var

## Team & Permissions

Check your role:
```bash
# Built into orchestrator context
# Roles configured in RBAC system
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Story not found | Verify story key, check Jira access |
| DB connection failed | Check `DATABASE_URL`, ensure PostgreSQL is running |
| App unreachable | Check environment URL is correct and running |
| Tests timing out | App may be slow, check server health |
| API rate limit | Wait 30 min or contact Anthropic |

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Run `npm run build` and `npm test`
4. Commit with clear messages
5. Push and open a PR

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [repo issues](https://github.com/UsamaArshadJadoon/Autonomous-Test-Agent-Orchestrator/issues)
- Documentation: See `docs/` directory
- Email: usama.arshed@azm.dev

---

**Built with Claude AI** • Powered by Anthropic's Claude API
