<p align="center">
  <a href="https://decoy.run?utm_source=github&utm_medium=tripwire_readme" target="_blank" rel="noopener noreferrer">
    <img alt="Decoy Tripwire" src="https://raw.githubusercontent.com/decoy-run/decoy-tripwire/main/.github/assets/hero.jpg" width="800">
  </a>
</p>
<h1 align="center">
  Decoy Tripwire
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/decoy-tripwire"><img alt="npm" src="https://img.shields.io/npm/v/decoy-tripwire?color=111827&labelColor=111827"></a>
  <a href="https://decoy.run/docs?utm_source=github&utm_medium=tripwire_readme"><img alt="documentation" src="https://img.shields.io/badge/documentation-decoy-111827?labelColor=111827"></a>
  <a href="https://decoy.run/changelog?utm_source=github&utm_medium=tripwire_readme"><img alt="changelog" src="https://img.shields.io/badge/changelog-latest-111827?labelColor=111827"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-111827?labelColor=111827"></a>
</p>

Know when your agents are compromised. Decoy Tripwire drops decoy MCP tools alongside your real ones — tools like `execute_command`, `make_payment`, `access_credentials` that no legitimate agent should ever call. When a prompt injection triggers one, the proxy pauses the compromised agent immediately and alerts you.

Every decoy returns a realistic error (timeout, permission denied). The agent sees a broken real tool, not a detection. Attackers don't know they've been caught.

**Works with:** Claude Desktop, Cursor, Windsurf, VS Code, Claude Code

## 🚀 Get Started

```bash
npx decoy-tripwire init
```

That's it. `init` signs you up, installs the local proxy, wraps your existing MCP servers, and drops the tripwires. Restart your MCP host — tripwires are live.

When a tripwire fires:
- The compromised agent is paused for 10 minutes (auto-expires)
- A desktop notification surfaces which tool was tripped
- Every wrapped MCP server denies subsequent calls from that agent in sub-ms
- Full context appears in your [dashboard](https://app.decoy.run/dashboard)

Clear the pause early with `npx decoy-tripwire resume <agent-id>`.

## 🧑‍💻 Install

```bash
npx decoy-tripwire init                    # Sign up and install (wraps upstreams by default)
npx decoy-tripwire init --no-wrap          # Install without wrapping existing MCP servers
npx decoy-tripwire login --token=xxx       # Log in with an existing token
```

Requires Node.js 18+. Zero runtime dependencies.

## 🎓 Docs

- [Overview](https://decoy.run/docs/tripwire/overview)
- [Telemetry](https://decoy.run/docs/tripwire/telemetry)
- [Tool reference](https://decoy.run/docs/tripwire/tools)
- [Dashboard](https://app.decoy.run/dashboard)

## 🛠 Commands

```bash
# Monitor
npx decoy-tripwire test                    # Fire a test trigger
npx decoy-tripwire status                  # Local pauses + hosted triggers
npx decoy-tripwire watch                   # Live tail of triggers

# When a tripwire fires
npx decoy-tripwire resume <agent-id>       # Clear an auto-pause immediately
npx decoy-tripwire resume --all            # Clear every pause
npx decoy-tripwire lock <agent-id>         # Turn an auto-pause into a permanent block
npx decoy-tripwire lockdown on             # Any tripwire hit pauses every agent

# Manage
npx decoy-tripwire agents                  # List connected agents
npx decoy-tripwire config                  # View alert configuration
npx decoy-tripwire upgrade                 # Upgrade to Team (via dashboard)
npx decoy-tripwire uninstall --confirm     # Remove from all MCP hosts
```

All commands support `--json` for scripting and `--token-file=PATH` to override
the stored token. `--token=xxx` also works, but it is visible to every process
on the machine via `ps` and lands in shell history — prefer the file form (or
`DECOY_TOKEN_FILE`) in CI.

Flags are validated: a misspelled one is an error with a spelling suggestion
rather than being silently ignored. A real flag on the wrong command
(`status --no-wrap`) warns but still runs. Add `--no-input` to fail instead of
prompting.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Command failed, including a usage error |
| `130` | Interrupted with Ctrl-C |

## 🪤 Tripwire Tools

| Tool | What it traps | Severity |
|------|--------------|----------|
| `execute_command` | Shell execution | Critical |
| `write_file` | File system persistence | Critical |
| `make_payment` | Unauthorized payments | Critical |
| `authorize_service` | Trust grants to external services | Critical |
| `modify_dns` | DNS record hijacking | Critical |
| `read_file` | Credential theft | High |
| `http_request` | Data exfiltration | High |
| `database_query` | SQL execution | High |
| `access_credentials` | API key theft | High |
| `send_email` | Phishing via agent | High |
| `install_package` | Supply chain attack | High |
| `get_environment_variables` | Secret harvesting | High |

Plus dynamically generated tools from 6 threat categories (cloud infrastructure, secrets management, payments, CI/CD, identity, network). Each deployment gets a unique, deterministic set.

## 🧠 How auto-block works

`init` rewrites each MCP host config so upstream servers run through `node proxy.mjs -- <original command>`. The proxy intercepts every `tools/call`:

1. Checks the shared pause registry at `~/.decoy/pause.json` — if the agent is paused, denies immediately.
2. If the call is a tripwire, returns a fake error and writes a 10-min pause entry for the agent.
3. Otherwise forwards to upstream.

Every proxy instance reads the registry on its hot path, so one tripwire hit blocks every wrapped server in the same process lifecycle. Sub-ms. Works offline. Dashboard sync is fire-and-forget.

Turn on `lockdown` mode to escalate — any tripwire pauses every agent, not just the one that tripped.

## 📦 Plans

| | Free | Team ($29/user/mo) | Business ($99/user/mo) |
|---|---|---|---|
| Tripwires (12+ dynamic) | Yes | Yes | Yes |
| Auto-block via local proxy | Yes | Yes | Yes |
| Email alerts | Yes | Yes | Yes |
| 7-day history | Yes | | |
| SARIF/JSON export | Yes | Yes | Yes |
| Slack/webhook alerts | | Yes | Yes |
| Agent profiles + fingerprinting | | Yes | Yes |
| 90-day history | | Yes | Yes |
| Threat intel API | | Yes | Yes |
| Security testing | | Yes | Yes |
| OWASP compliance reports | | | Yes |
| Custom detection rules | | | Yes |
| Gateway integrations | | | Yes |

## 🚢 Release Notes

See [CHANGELOG.md](CHANGELOG.md) or the [hosted changelog](https://decoy.run/changelog).

## 🤝 Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 🔗 Related

- [decoy-scan](https://npmjs.com/package/decoy-scan) — Find security risks in your MCP servers
- [decoy-redteam](https://npmjs.com/package/decoy-redteam) — Autonomous red team for MCP servers
- [Decoy Guard](https://decoy.run) — Dashboard, threat intel, compliance reports
- [OWASP Agentic Top 10](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)

## 📝 License

MIT — see [LICENSE](LICENSE).
