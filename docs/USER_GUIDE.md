# Autonomous Test Agent Orchestrator (ATAO) - User Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [System Overview](#system-overview)
3. [Step-by-Step Workflow](#step-by-step-workflow)
4. [Example: Testing a Real User Story](#example-testing-a-real-user-story)
5. [Understanding the Output](#understanding-the-output)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

---

## Quick Start

### Installation & Setup

```bash
# 1. Clone or navigate to the test-agent project
cd test-agent-orchestrator

# 2. Install dependencies
npm install

# 3. Configure your project
cp .env.example .env
# Edit .env with your actual credentials

# 4. Set up database (PostgreSQL 13+)
psql -U postgres -f db/schema.sql

# 5. Build the project
npm run build
```

### Run Your First Test

```bash
# Get a Jira user story key (e.g., SEK-1934)
test-agent run SEK-1934 --env qa --mode full
```

That's it! The system will:
- Fetch the story from Jira
- Generate comprehensive test cases
- Execute them in your QA environment
- Log any bugs back to Jira
- Send results via webhook/Slack

---

## System Overview

The ATAO system is a **7-agent orchestration** that automates the entire testing workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│ Your Command: test-agent run SEK-1934 --env qa --mode full      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │   Agent Orchestration Pipeline      │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────┴──────────────────────────────────┐
        │                                                      │
   ┌────▼────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐  │
   │ Story   │──▶│ Test     │──▶│ Gap      │──▶│ Test    │  │
   │ Agent   │   │ Writer   │   │ Analyzer │   │ Executor│  │
   └────┬────┘   └──────────┘   └──────────┘   └────┬────┘  │
        │                                             │        │
        │                                        ┌────▼────┐  │
        │                                        │ Reviewer│  │
        │                                        └────┬────┘  │
        │                                             │        │
        │         ┌───────────────────────────────────┤        │
        │         │                                   │        │
   ┌────▼─────┐  │  ┌──────────────────────────────┐ │       │
   │ Approval  │◀─┤  │ Approval Gate (Email)        │ │       │
   │ Workflow  │  │  │ [user reviews results]       │ │       │
   └────┬─────┘  │  └──────────────────────────────┘ │       │
        │         │                                   │        │
        │         └────────────────────────────────┬──┘        │
        │                                          │           │
   ┌────▼──────────┐   ┌──────────┐   ┌─────────┐│           │
   │ Bug Logger    │──▶│ Webhooks │──▶│ Results ││           │
   │ Agent         │   │ Manager  │   │ Database││           │
   └───────────────┘   └──────────┘   └─────────┘│           │
        │                                          │
        └──────────────────────────────────────────┘
```

### The 7 Agents

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Story Agent** | Reads the user story from Jira | Story key (SEK-1934) | Parsed story details, AC, user flows |
| **Test Writer** | Generates test cases | Story details + AC | Comprehensive test cases (steps, assertions, data) |
| **Gap Analyzer** | Validates coverage | Test cases + AC | Approval or list of missed scenarios |
| **Test Executor** | Runs tests in browser | Test cases + app URL | Screenshots, logs, pass/fail results |
| **Reviewer** | QA review gate | Results + AC | Approval or flag for issues |
| **Bug Logger** | Creates Jira issues | Failed tests | Bugs linked to original story |
| **Orchestrator** | Coordinates all | Initial request | Final report, status, artifacts |

---

## Step-by-Step Workflow

### **Step 1: Prepare Your Story**

Before running tests, ensure your Jira story has:

✅ **Story Key** (e.g., `SEK-1934`)  
✅ **Acceptance Criteria** (AC) — in the story description  
✅ **User flows** — how users interact with the feature  
✅ **Test environment URL** — accessible and stable  

**Example Story:**
```
Story: SEK-1934 - User Registration with Email Verification

Description:
As a new user, I want to register an account with email verification
so that my account is secure and authentic.

Acceptance Criteria:
1. User can enter email and password on registration form
2. System validates email format (must be valid email)
3. System validates password (min 8 chars, 1 upper, 1 number, 1 special)
4. System sends verification email to registered email
5. User clicks verification link in email
6. Account is activated after email verification
7. User can log in with registered credentials
8. Error messages display for invalid inputs
```

### **Step 2: Run the Test Agent**

```bash
# Basic usage
test-agent run SEK-1934 --env qa --mode full

# With options
test-agent run SEK-1934 --env qa --mode full
# --env: dev, qa, staging (default: qa)
# --mode: smoke (quick check), full (comprehensive), regression (previous + new tests)
```

### **Step 3: Agent Orchestration Begins**

The orchestrator:

**a) Story Agent fetches from Jira**
```
Execution ID: exec_20260714_a1b2c3d4e5f6
Loading story: SEK-1934

✓ Story loaded: "User Registration with Email Verification"
✓ AC parsed: 8 acceptance criteria
✓ Test data templates found: /factories/user-registration/
✓ Previous baseline found: 45 tests from last run
```

**b) Test Writer generates test cases**
```
Generating test cases from AC...

✓ Generated 47 test cases
  - 12 happy path tests (positive scenarios)
  - 15 edge case tests (boundary conditions)
  - 12 error handling tests (invalid inputs)
  - 8 regression tests (previous baselines)
```

**c) Gap Analyzer validates coverage**
```
Analyzing gaps against AC...

✓ AC 1 (email/password form): 2 tests
✓ AC 2 (email validation): 3 tests
✓ AC 3 (password validation): 4 tests
✓ AC 4 (verification email): 2 tests
✓ AC 5 (verification link): 3 tests
✓ AC 6 (account activation): 2 tests
✓ AC 7 (login with credentials): 3 tests
✓ AC 8 (error messages): 5 tests

Coverage: 24/24 AC covered ✓ 
No gaps detected.
```

**d) Test Executor runs tests in Playwright**
```
Starting test execution...
Environment: qa (https://qa.app.company.com)
Browser: Chromium
Concurrent executions: 2

Test 1/47: [Happy Path] User registers with valid email and password
  ✓ PASS (3.2s)
  └─ Screenshot: artifacts/test_001_pass.png

Test 2/47: [Happy Path] Verification email received
  ✓ PASS (4.1s)
  └─ Screenshot: artifacts/test_002_pass.png
  └─ Log: artifacts/test_002.log

Test 3/47: [Edge Case] Email with plus addressing
  ✓ PASS (2.8s)

Test 4/47: [Error] Invalid email format shows error
  ✓ PASS (2.5s)

Test 5/47: [Error] Weak password shows validation error
  ✗ FAIL (3.1s) [REGRESSION]
  └─ Expected: Password error message displayed
  └─ Got: Page redirected to /login
  └─ Screenshot: artifacts/test_005_fail.png
  └─ Video: artifacts/test_005.webm

...

Test 47/47: [Regression] Previous test suite (45 tests)
  ✓ PASS (2.2s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Results Summary:
  Total: 47 tests
  Passed: 45 ✓
  Failed: 2 ✗
  Duration: 4m 32s
  Coverage: 95%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**e) Reviewer validates results**
```
Reviewing test results against AC...

Status: ⚠️ ISSUES DETECTED

Issues:
1. [CRITICAL] Test 5 failure: Password validation not working
   - AC 3 requires "min 8 chars, 1 upper, 1 number, 1 special"
   - System allowing weak passwords
   - Recommend: Bug SEK-1935 created

2. [CRITICAL] Test 12 failure: Email verification email not sending
   - AC 4 requires "verification email sent"
   - No email received in test mailbox
   - Recommend: Check email service logs

Recommendation: HOLD - Fix critical issues before approval
```

**f) Approval Workflow**

```
⏳ Waiting for approval...

Email sent to: qa-lead@company.com

-----
Subject: ATAO Review for SEK-1934 - Approval Required

Story: User Registration with Email Verification
Tests: 47 (45 passed, 2 failed)
Environment: qa
Status: ⚠️ Issues detected

Review: https://qa-dash.company.com/exec/exec_20260714_a1b2c3d4e5f6

Actions:
[ Approve ] [ Reject ] [ Request Changes ]

Expires in: 24 hours (auto-approve if no action)
-----

✓ APPROVED (after 32 minutes)
Approved by: john@company.com
Comment: "Fixing password validation now, can proceed with bugs"
```

**g) Bug Logger creates Jira issues**
```
Logging bugs for failed tests...

✓ Bug 1 created: SEK-1935
  Title: "Password validation not enforcing requirements"
  Description: [full details from test failure]
  Linked to: SEK-1934
  Status: Open
  URL: https://jira.company.com/browse/SEK-1935

✓ Bug 2 created: SEK-1936
  Title: "Email verification not sending on registration"
  Description: [full details from test failure]
  Linked to: SEK-1934
  Status: Open
  URL: https://jira.company.com/browse/SEK-1936
```

**h) Webhooks & Notifications**

```
Sending results to webhooks...

✓ Slack notification sent
  Channel: #qa-testing
  Message: "SEK-1934 tested: 45/47 passed. 2 bugs created."

✓ CI/CD webhook sent
  Endpoint: https://ci.company.com/webhooks/tests
  Payload: {execution_id, status, results, bugs}

✓ Database updated
  Table: execution_results
  Record: exec_20260714_a1b2c3d4e5f6
```

### **Step 4: Review Results**

```bash
# View results dashboard
open https://qa-dash.company.com/exec/exec_20260714_a1b2c3d4e5f6

# View artifacts
ls artifacts/
  test_001_pass.png
  test_002_pass.png
  test_005_fail.png
  test_005.webm
  test_005.log

# View logs
cat logs/execution_exec_20260714_a1b2c3d4e5f6.log

# View created bugs
test-agent bugs SEK-1934
  SEK-1935: Password validation not enforcing requirements
  SEK-1936: Email verification not sending on registration
```

---

## Example: Testing a Real User Story

Let's walk through testing your actual story: `SEK-1934`

### Prerequisites

```bash
# 1. Ensure .env is configured
cat .env
# JIRA_URL=https://saudiazmco.atlassian.net
# JIRA_TOKEN=your_api_token_here
# DATABASE_URL=postgresql://user:pass@localhost:5432/app_qa
# QA_APP_URL=https://qa.app.company.com
# ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### Command

```bash
# Run tests for SEK-1934 in QA environment, full test suite
test-agent run SEK-1934 --env qa --mode full
```

### What Happens Behind the Scenes

**1. Story Agent reads SEK-1934 from your Jira instance**
```
GET https://saudiazmco.atlassian.net/rest/api/3/issues/SEK-1934
Response: {
  key: "SEK-1934",
  summary: "User Registration with Email Verification",
  description: "[story details with AC]",
  acceptance_criteria: [...],
  created: "2026-07-10T09:15:00Z",
  assignee: "john@company.com"
}
```

**2. Test Writer (Claude API) generates test cases**
- Reads the story content
- Creates test cases covering each AC
- Generates test data (email addresses, passwords, etc.)
- Outputs: 45-60 test cases depending on complexity

**3. Test Executor (Playwright) runs each test**
- Launches browser to https://qa.app.company.com
- Navigates to registration page
- Fills forms, clicks buttons, verifies text
- Captures screenshots on failures
- Logs all network traffic and console errors

**4. Reviewer (Claude API) analyzes results**
- Compares test results against original AC
- Identifies gaps or regressions
- Recommends approval or hold

**5. Bug Logger creates issues in your Jira**
- For each failed test
- Links bug to original story (SEK-1934)
- Includes: full test output, screenshot, video, logs

### Expected Output Timeline

```
$ test-agent run SEK-1934 --env qa --mode full

[00:00] Execution ID: exec_20260714_abc123def456
[00:02] 📖 Story Agent: Fetching SEK-1934...
[00:05] ✓ Story loaded (8 AC, 2 user flows)
[00:06] 📝 Test Writer: Generating test cases...
[00:15] ✓ Generated 52 test cases
[00:16] 🔍 Gap Analyzer: Checking coverage...
[00:18] ✓ All AC covered (0 gaps)
[00:19] 🎭 Test Executor: Starting tests (mode=full, env=qa)...
[04:32] ✓ 50/52 tests passed (2 flaky)
[04:45] 👀 Reviewer: Analyzing results...
[05:00] ⚠️ Issues detected (2 bugs)
[05:01] ⏳ Approval workflow: Waiting for QA lead approval...
[05:35] ✓ Approved
[05:36] 🐛 Bug Logger: Creating Jira issues...
[05:42] ✓ Created SEK-1935, SEK-1936
[05:43] 🔔 Webhooks: Sending notifications...
[05:45] ✓ Complete

Results: https://qa-dash.company.com/exec/exec_20260714_abc123def456
Bugs: SEK-1935, SEK-1936
```

---

## Understanding the Output

### Execution Report

```json
{
  "execution_id": "exec_20260714_abc123def456",
  "story_key": "SEK-1934",
  "status": "COMPLETED_WITH_ISSUES",
  "environment": "qa",
  "mode": "full",
  "timestamp": "2026-07-14T14:32:45.000Z",
  
  "story": {
    "key": "SEK-1934",
    "summary": "User Registration with Email Verification",
    "acceptance_criteria": 8,
    "test_data_sets": 3
  },
  
  "test_results": {
    "total": 52,
    "passed": 50,
    "failed": 2,
    "flaky": 0,
    "duration_seconds": 272,
    "coverage_percent": 98
  },
  
  "failed_tests": [
    {
      "id": 5,
      "name": "Test password validation enforces min 8 chars",
      "assertion": "Error message should display for 7-char password",
      "expected": "⚠️ Password must be at least 8 characters",
      "actual": "Form submitted successfully (no error)",
      "screenshot": "artifacts/test_005_fail.png",
      "video": "artifacts/test_005.webm"
    },
    {
      "id": 12,
      "name": "Test verification email sent",
      "assertion": "Email should arrive in test mailbox",
      "expected": "Email found with subject 'Verify your email'",
      "actual": "No email received (timeout after 30s)",
      "log": "artifacts/test_012.log"
    }
  ],
  
  "bugs_created": [
    {
      "key": "SEK-1935",
      "summary": "Password validation not enforcing minimum length",
      "linked_to": "SEK-1934"
    },
    {
      "key": "SEK-1936",
      "summary": "Email verification not sending on registration",
      "linked_to": "SEK-1934"
    }
  ],
  
  "approval": {
    "status": "APPROVED",
    "approved_by": "john@company.com",
    "approved_at": "2026-07-14T14:35:22.000Z"
  }
}
```

### Dashboard View

At `https://qa-dash.company.com/exec/exec_20260714_abc123def456`:

```
┌─────────────────────────────────────────────────────┐
│ Execution: exec_20260714_abc123def456               │
│ Story: SEK-1934 - User Registration                 │
│ Status: ⚠️ ISSUES (50/52 passed)                    │
└─────────────────────────────────────────────────────┘

OVERVIEW
├─ Duration: 4m 32s
├─ Environment: qa
├─ Mode: full
├─ Coverage: 98%
└─ Approval: ✓ Approved by john@company.com

RESULTS
├─ Passed: 50 ✓
├─ Failed: 2 ✗
├─ Flaky: 0
└─ Skipped: 0

FAILURES
├─ Test 5: Password validation
│  └─ Screenshot: [click to view]
│  └─ Video: [click to play]
│
└─ Test 12: Email verification
   └─ Log: [click to download]

CREATED BUGS
├─ SEK-1935: Password validation not enforcing...
└─ SEK-1936: Email verification not sending...

ARTIFACTS
├─ test_005_fail.png
├─ test_005.webm
├─ test_012.log
└─ execution_report.json
```

---

## Troubleshooting

### Issue: "Story not found in Jira"

```bash
Error: STORY_NOT_FOUND
Story SEK-1934 not found in Jira. Verify the story key exists.
```

**Solution:**
```bash
# 1. Check your Jira URL and token
cat .env | grep JIRA

# 2. Verify the story exists and is accessible
# Visit: https://saudiazmco.atlassian.net/browse/SEK-1934

# 3. Check your user has permission to view the story
# (May need to be in the project or have global read access)

# 4. Test Jira connection
curl -H "Authorization: Bearer $JIRA_TOKEN" \
  https://saudiazmco.atlassian.net/rest/api/3/issues/SEK-1934
```

### Issue: "Database connection failed"

```bash
Error: DATABASE_UNREACHABLE
Database is unreachable. Check DATABASE_URL and credentials.
```

**Solution:**
```bash
# 1. Verify database is running
psql -U postgres -c "SELECT 1"

# 2. Check .env credentials
cat .env | grep DATABASE

# 3. Test connection manually
psql postgresql://user:pass@localhost:5432/app_qa -c "SELECT 1"

# 4. Ensure schema is loaded
psql -U postgres -f db/schema.sql -d app_qa
```

### Issue: "App is unreachable"

```bash
Error: APP_UNREACHABLE
App is unreachable at https://qa.app.company.com. Check TEST_APP_URL.
```

**Solution:**
```bash
# 1. Check the URL is correct
cat .env | grep QA_APP_URL

# 2. Verify connectivity
curl https://qa.app.company.com -I

# 3. Check firewall/VPN
ping qa.app.company.com

# 4. Verify environment is up
# (Check with your DevOps/SRE team)
```

### Issue: "API rate limits exceeded"

```bash
Error: CLAUDE_API_RATE_LIMIT
Anthropic API rate limit exceeded. Waiting before retry...
```

**Solution:**
```bash
# The system automatically retries with exponential backoff.
# If you hit rate limits frequently:

# 1. Check your API quota
# Visit: https://console.anthropic.com/account/billing

# 2. Wait a few hours and retry

# 3. Contact Anthropic support for higher limits

# 4. Stagger multiple test runs
test-agent run SEK-1934 --env qa --mode smoke  # Start with smoke
# Wait 30 minutes
test-agent run SEK-1935 --env qa --mode smoke
```

### Issue: "Tests are flaky/intermittent"

```bash
Test: User login after registration
Status: ✗ FAIL (flaky)
Attempts: 1/3 passed (66% reliability)
Last error: "Element not found" (timeout)
```

**Solution:**
```bash
# 1. Check if the app is slow/overloaded
curl -w "@curl-format.txt" https://qa.app.company.com

# 2. Run in regression mode to track baseline
test-agent run SEK-1934 --mode regression

# 3. The system automatically tracks flaky tests
# View the flaky registry:
test-agent flaky-registry SEK-1934
  Flaky Test 1: "Email verification" (40% pass rate)
  Flaky Test 2: "Login after registration" (66% pass rate)

# 4. Recommend to developers
# "These tests are flaky - may indicate timing issues in app"
```

---

## Advanced Usage

### Custom Test Modes

```bash
# Smoke test (quick validation, ~2 min)
test-agent run SEK-1934 --mode smoke
# Runs: critical path tests only (10-15 tests)

# Full test (comprehensive, ~5 min)
test-agent run SEK-1934 --mode full
# Runs: all tests (45-60 tests)

# Regression test (full + previous baselines, ~8 min)
test-agent run SEK-1934 --mode regression
# Runs: all new tests + 45 previous tests = 90-105 tests
```

### Environment-Specific Testing

```bash
# Test in different environments
test-agent run SEK-1934 --env dev    # Development
test-agent run SEK-1934 --env qa     # QA (default)
test-agent run SEK-1934 --env staging # Staging

# Each environment has different URLs and databases
# Configured in: .testconfig/projects/PROJ/environments.json
```

### View Execution History

```bash
# List recent executions
test-agent list SEK-1934
  exec_20260714_abc123  | 50/52 passed | 4m 32s | APPROVED
  exec_20260713_xyz789  | 45/45 passed | 3m 20s | APPROVED
  exec_20260712_def456  | 42/45 passed | 4m 15s | ISSUES

# View specific execution
test-agent view exec_20260714_abc123

# Compare two executions (regression detection)
test-agent compare exec_20260714_abc123 exec_20260713_xyz789
  New tests: 5
  Removed tests: 1
  Failed tests: 2 (vs 0 in previous)
  Coverage change: +3%
```

### Approve/Reject Results

```bash
# Manual approval (if auto-approve not working)
test-agent approve exec_20260714_abc123
  Approval sent to: john@company.com

# Reject and request changes
test-agent reject exec_20260714_abc123 \
  --comment "Password validation still not fixed"

# View pending approvals
test-agent pending-approvals
  exec_20260714_abc123 | SEK-1934 | Pending 2h 15m | john@company.com
```

### Replay Failed Tests

```bash
# Re-run only failed tests from a previous execution
test-agent replay exec_20260714_abc123 --failed-only
  Running 2 failed tests...
  Test 5: Password validation ✓ PASS
  Test 12: Email verification ✗ FAIL (persists)

# Useful for debugging specific failures
```

### Configure Webhooks

```bash
# Add Slack notification
test-agent webhook add slack \
  --url https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  --channel #qa-testing

# Add CI/CD webhook
test-agent webhook add ci \
  --url https://ci.company.com/webhooks/tests \
  --auth-header "X-CI-Token: xxx"

# List webhooks
test-agent webhook list
  slack   | https://hooks.slack.com/...
  ci      | https://ci.company.com/...
```

### Team Management

```bash
# View team members and roles
test-agent team list
  john@company.com  | qa_lead
  jane@company.com  | qa_tester
  bob@company.com   | developer

# Add team member
test-agent team add jane@company.com --role qa_tester

# Update permissions
test-agent team update john@company.com --role qa_lead

# Check your own permissions
test-agent whoami
  Email: you@company.com
  Role: qa_tester
  Permissions:
    ✓ run_tests
    ✓ log_bugs
    ✗ approve_results (requires qa_lead)
```

---

## Next Steps

1. **Set up your environment**: Configure `.env` with your Jira, database, and API credentials
2. **Test the connection**: Run `test-agent health-check`
3. **Run your first test**: Use the example story key (SEK-1934) or your own
4. **Review the results**: Check the dashboard and created bugs
5. **Iterate**: Fix bugs, update story, run tests again

For support:
- **Documentation**: See `/docs/` directory
- **Slack**: Post in #qa-testing
- **Issues**: Create a GitHub issue or Jira ticket
- **Contact**: qa-team@company.com

---

**Happy Testing! 🚀**
