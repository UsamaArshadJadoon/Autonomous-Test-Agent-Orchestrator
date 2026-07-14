# ATAO Quick Reference Guide

## Most Common Commands

### Run Tests for a Story
```bash
test-agent run <STORY_KEY> --env <environment> --mode <mode>

# Examples:
test-agent run SEK-1934 --env qa --mode full      # Comprehensive test
test-agent run SEK-1934 --env qa --mode smoke     # Quick check
test-agent run SEK-1934 --env qa --mode regression # Full + baseline
```

**Environments:** `dev`, `qa` (default), `staging`  
**Modes:** `smoke` (2 min), `full` (5 min), `regression` (8 min)

---

## What Happens When You Run a Test

```
1. Story Agent → Reads story from Jira (SEK-1934)
2. Test Writer → Generates test cases (45-60)
3. Gap Analyzer → Validates coverage vs AC
4. Test Executor → Runs tests in Playwright
5. Reviewer → Reviews results
6. Approval → QA lead approves (or auto-approves in 24h)
7. Bug Logger → Creates Jira issues for failures
8. Webhooks → Sends Slack/CI notifications
```

---

## View Results

```bash
# View in dashboard
https://qa-dash.company.com/exec/<EXECUTION_ID>

# View in terminal
test-agent view <EXECUTION_ID>

# View bugs created
test-agent bugs <STORY_KEY>

# View execution history
test-agent list <STORY_KEY>
```

---

## Typical Output

```
✓ 50/52 tests passed
✗ 2 tests failed
⚠️ 2 bugs created (SEK-1935, SEK-1936)
✓ Approved by john@company.com
📊 Artifacts: screenshots, videos, logs
```

---

## Files You'll Use

| File | Purpose |
|------|---------|
| `.env` | API keys, URLs, credentials |
| `.testconfig/projects/` | Project configuration |
| `db/schema.sql` | Database schema |
| `src/index.ts` | CLI entry point |
| `logs/` | Execution logs |
| `artifacts/` | Screenshots, videos |

---

## Environment Setup

```bash
# 1. Clone project
git clone <repo>
cd test-agent-orchestrator

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your credentials

# 4. Setup database
psql -U postgres -f db/schema.sql

# 5. Build
npm run build

# 6. Run test
test-agent run SEK-1934 --env qa --mode full
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Story not found | Verify story key, check Jira access |
| DB connection failed | Check .env DATABASE_URL, ensure PostgreSQL running |
| App unreachable | Check QA_APP_URL, verify environment is up |
| Tests timing out | App may be slow; check server health |
| API rate limit | Wait 30 min; contact Anthropic for higher quota |

---

## Team Permissions

| Role | Can Run | Can Approve | Can Log Bugs |
|------|---------|------------|------------|
| qa_lead | ✓ | ✓ | ✓ |
| qa_tester | ✓ | ✗ | ✓ |
| developer | ✓ | ✗ | ✗ |

Check your role:
```bash
test-agent whoami
```

---

## Real Example: SEK-1934

**Story:** User Registration with Email Verification

**Run:**
```bash
test-agent run SEK-1934 --env qa --mode full
```

**Expected Result:**
- ~50 tests generated
- ~4-5 min execution time
- Screenshots/videos of failures
- Bugs created for any failures
- Approval workflow (email notification)

**View Results:**
- Dashboard: https://qa-dash.company.com
- Jira bugs: [SEK-1935], [SEK-1936], etc.
- Logs: `logs/execution_*.log`

---

## Advanced

```bash
# Replay failed tests
test-agent replay <EXECUTION_ID> --failed-only

# Compare executions (regression detection)
test-agent compare <EXEC_1> <EXEC_2>

# View flaky test registry
test-agent flaky-registry <STORY_KEY>

# Manage webhooks
test-agent webhook add slack --url <WEBHOOK_URL>

# Manage team
test-agent team list
test-agent team add <EMAIL> --role <ROLE>
```

---

See `USER_GUIDE.md` for detailed documentation.
