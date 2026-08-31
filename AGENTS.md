# AGENTS.md

Guidance for AI agents and human contributors working in this repository.

## 1. What Decoy Is

Decoy is a security tripwire system for AI agent pipelines. It deploys tripwire MCP tools that detect prompt injection attacks in real time. If a malicious prompt tricks an agent into calling a decoy tool, the operator gets alerted instantly.

## 2. Repo Structure

```
decoy-tripwire/
├── server/
│   ├── server.mjs         # Tripwire MCP server (stdio, zero dependencies)
│   ├── proxy.mjs          # Local proxy — wraps upstream MCP servers
│   ├── policy.mjs         # Hosted-policy engine (used by proxy)
│   ├── pauseRegistry.mjs  # Disk-backed pause registry (~/.decoy/pause.json)
│   ├── config.mjs         # Local user config (~/.decoy/config.json)
│   ├── notify.mjs         # Cross-platform desktop notifications
│   ├── upstream.mjs       # Spawn/framing helpers for upstream MCP servers
│   └── shared.mjs         # Shared utilities (framer, session, emitDecoyEvent)
├── bin/cli.mjs            # CLI (npx decoy-tripwire ...)
├── test/                  # node:test suites — run with `npm test`
├── package.json
├── README.md
├── AGENTS.md              # You are here
└── CONTRIBUTING.md
```

This repo is the open-source MCP client + proxy. The backend worker and marketing site live in separate repos.

## 3. Architecture

### server.mjs — Dual-Mode MCP Server

The server operates in two modes based on whether `DECOY_TOKEN` is set:

**Unconfigured** (no token): Exposes 3 onboarding tools + 12 tripwire tools
- `decoy_signup`, `decoy_configure`, `decoy_status`
- Tripwire triggers are logged locally only

**Configured** (has token): Exposes 4 management tools + 12 tripwire tools
- `decoy_status`, `decoy_upgrade`, `decoy_configure_alerts`, `decoy_billing`
- Tripwire triggers are reported to `app.decoy.run`

Mode switches at runtime when `decoy_configure` is called — no restart needed.

### cli.mjs — CLI Commands

Handles `init`, `login`, `status`, `test`, `watch`, `agents`, `config`, `upgrade`, `doctor`, `update`, `uninstall`, `proxy`, and the local auto-pause commands (`resume`, `lock`, `lockdown`). All commands are in a single file with no build step.

### proxy.mjs — Local MCP Proxy

`init` rewrites each MCP host config so upstream servers run through `node proxy.mjs --name <n> -- <original command> <args>`. The proxy intercepts every `tools/call`:

1. Reads the pause registry — if the agent is paused (or lockdown mode is on with any pause), denies immediately.
2. If the call is a tripwire tool (any of `PROXY_HONEY_TOOLS`), returns a fake error AND writes a 10-min pause to the registry + fires a desktop notification.
3. Otherwise consults the hosted policy engine and forwards to upstream.

The registry lives at `~/.decoy/pause.json` and is read by every proxy instance on the hot path — O(small file read from OS page cache), sub-millisecond.

### Key Design Decisions

- **Zero dependencies.** server.mjs and cli.mjs use only Node.js builtins. No npm install needed at runtime.
- **Self-contained.** server.mjs includes its own config path detection and writing logic (duplicated from cli.mjs intentionally) so it can operate independently.
- **Realistic errors.** Every tripwire tool returns a plausible error (timeout, permission denied, connection refused). The agent should not be able to distinguish a decoy tool from a broken real tool.
- **Fire and forget.** Trigger reporting is async and non-blocking. A network failure to report a trigger must never break the MCP session.

## 4. Working With This Code

### Making Changes to Tripwire Tools

If you add, remove, or modify a tripwire tool:
1. Update the `TOOLS` array in `server/server.mjs`
2. Add a corresponding entry in `FAKE_RESPONSES`
3. Update `classifySeverity()` if the tool is critical or high severity
4. The backend (`decoy-app/src/tools.js`) has a matching tool list — keep them in sync

### Making Changes to Decoy Tools

The `decoy_*` tools (signup, configure, status, upgrade, configure_alerts, billing) are real — they call Decoy APIs and modify local state. Changes to these tools may require corresponding backend API changes.

### Making Changes to the CLI

Commands are defined as functions and wired in the `switch` statement at the bottom of `cli.mjs`. Follow the existing pattern: accept `flags`, support `--json` for machine output, use the color constants for terminal output.

**Register every new flag in `COMMAND_FLAGS`** (just above the switch), keyed by
the command that accepts it. A flag absent from every entry is rejected as a
typo, so skipping this step means your new flag stops working; a flag present
under a different command only warns. Shared helpers (`findUnknownFlag`,
`nearest`, `resolveColor`, `canPrompt`, `fetchWithTimeout`, `onInterrupt`) live
in `server/argv.mjs`.

Exit codes: `0` success, `1` command failed (including usage errors),
`130` interrupted. These are unchanged — don't add new ones without a reason
that outweighs breaking a caller that branches on them. When driving this CLI non-interactively, pass `--no-input` so
any path that would prompt fails fast instead of blocking on stdin.

## 5. Testing

Tests use the built-in `node:test` runner — no external framework. Run with:

```bash
npm test
```

Suites cover the pause registry, install/wrap logic, proxy end-to-end (spawns a stub upstream), policy engine, and framing. Isolate registry state by setting `DECOY_HOME=$(mktemp -d)` before the test subprocess — `pauseRegistry.mjs` and `config.mjs` respect this env var.

Syntax check before committing:
```bash
node -c server/server.mjs
node -c server/proxy.mjs
node -c bin/cli.mjs
```

## 6. API Endpoints

The server proxies to these backend endpoints:

| Decoy Tool | Backend Endpoint |
|------------|-----------------|
| `decoy_signup` | `POST /api/signup` |
| `decoy_configure` | `GET /api/billing?token=` (validation) |
| `decoy_status` | `GET /api/billing?token=` + `GET /api/triggers?token=` |
| `decoy_upgrade` | `POST /api/upgrade` |
| `decoy_configure_alerts` | `PATCH /api/config?token=` |
| `decoy_billing` | `GET /api/billing?token=` |

## 7. Things to Be Careful About

- **Never log tokens to stdout.** Stdout is the MCP transport. Use `process.stderr.write()` for debug output.
- **Never store card numbers.** The `decoy_upgrade` tool passes card details through to Stripe via the backend API. They must never be written to disk or logged.
- **Keep the server zero-dependency.** Don't add npm packages. Use Node.js builtins only.
- **Don't make tripwire tools detectable.** The fake responses should be indistinguishable from real tool failures. No "decoy" or "tripwire" strings in tool descriptions or error messages.
