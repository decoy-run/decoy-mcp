# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.14.0] - 2026-08-31

A CLI usability pass against the [Command Line Interface Guidelines](https://clig.dev).
Tripwire and proxy behavior is unchanged.

### Fixed
- **Misspelled flags were silently dropped.** `parseArgs` swallowed any `--flag`
  into a key nothing read, so `status --josn` printed human output and
  `init --no-wrp` wrapped servers anyway. A flag no command accepts is now an
  error with a spelling suggestion. A *real* flag on the wrong command
  (`status --no-wrap`) only warns and still runs — it was silently ignored
  before, and failing outright could break a script that has been passing a
  harmless extra flag for months.
- **Unknown subcommands were accepted.** `agents puase` and `lockdown onn` ran
  the default branch instead of erroring.
- **Fatal errors were hidden by `--quiet`.** Errors always print now.
- **`NO_COLOR=` (empty) disabled color.** Per no-color.org it should not.
- **`watch` could hang indefinitely** on an unresponsive API with no output; all
  network calls have deadlines, and a dropped poll says so and keeps watching.

### Added
- **`--token-file=PATH` and `DECOY_TOKEN_FILE`.** A token in `--token=` is
  visible to every process on the machine via `ps` and lands in shell history.
- **`--no-input`** — never prompt; fail with the flag that would have supplied
  the answer.
- **`--color`** to force color through a pipe.
- **Ctrl-C stops now**, clearing the spinner and restoring the cursor.
- **Elapsed time on the spinner** after a few seconds.
- **`Environment` and `Exit codes` sections in `--help`**, plus the previously
  undocumented `--email`, `--no-account`, `--reason`, `--interval`, `--webhook`
  and `--slack` flags.

### Changed
- Nothing that changes an existing contract. **Exit codes are unchanged** —
  usage errors exit `1`, same as an unknown command always has.

## [0.13.2] - 2026-05-14

### Fixed
- **Auto-register no longer dead-locks after a transient failure.** The
  `registerPromise` lock was set once and never cleared — a network blip
  on the first trigger left it pointing at a settled promise forever, so
  every subsequent trigger awaited it and proceeded token-less. One
  failed registration meant silent local-only mode for the whole process
  lifetime. The lock now clears on failure and retries are rate-limited
  to once per 60s.

### Changed
- **Internal: deduplicated `classifySeverity` and host-config paths.**
  `classifySeverity` lived in both `server/shared.mjs` and
  `server/server.mjs`; the latter now imports the shared one. MCP
  host-config paths were duplicated between `server/server.mjs` and
  `bin/cli.mjs` — extracted to a canonical `server/hosts.mjs` consumed
  by both. No behavior change; eliminates two drift points.

## [0.13.0] - 2026-05-10

### Added
- **v2 telemetry envelope** for anonymous decision events. Same shape
  as decoy-scan 0.7.0 / decoy-redteam 0.3.0 — schema_version, event_id,
  run_id, env block (node/platform/arch/ci/host/locale).
- **Batched decisions.** Proxy + server now buffer decision events in
  memory (10 events or 5 seconds) and flush as a single batched POST.
  Reduces network chatter on busy MCP sessions.
- **Persistent queue on failure.** Events that fail to ship fall
  through to `~/.decoy/telemetry-queue.jsonl`; the next proxy/server
  start drains them.

## [0.12.1] - 2026-05-10

### Fixed
- `reportTrigger` now runs entirely on a `setImmediate` tick so its
  synchronous portion (including the visible `[decoy] TRIGGER` stderr
  log) can never block the honey-tool response. The 0.12.0 redaction
  added enough sync work to push response timing past 5s on
  back-pressured pipes (saw failures on macOS-latest CI runners).
  Honey-tool MCP responses now go out before any telemetry work runs.

## [0.12.0] - 2026-05-10

### Added
- **Anonymous default-on telemetry.** Decision events are now sent to
  `/api/telemetry` (anonymous, identified by `~/.decoy/install_id`) when no
  `DECOY_TOKEN` is set. Authenticated installs still post to
  `/mcp/{token}` as before. Previously, unauthenticated installs sent
  nothing at all — the highest-volume telemetry source was dark.
- **Argument redaction.** All tool arguments are reduced to type/length
  shape before transmission (e.g. `{path: "<string:42>"}`). The redactor
  applies on both authed and anonymous paths, so raw tool arguments never
  leave the client. For block decisions on critical/high severity, an
  `argsFingerprint` (sha256 prefix) is attached so we can correlate the
  same payload across installs without storing the payload itself.
  `server/redact.mjs` is the privacy boundary; `test/redact.test.mjs`
  enforces that no raw values can leak.

### Changed
- `emitDecoyEvent` and `server.mjs`'s reportTrigger both route through the
  redactor. `DECOY_TELEMETRY=0` now disables both authed and anonymous
  paths; previously there was no opt-out for the authenticated path.

## [0.11.6] - 2026-05-06

### Added
- `init` now prints a one-line GitHub star ask after the post-install summary.
  Mirrors the same line in `decoy-scan` and `decoy-redteam`, so users running
  multiple Decoy CLIs see consistent post-run output.

## [0.11.5] - 2026-04-28

### Changed
- **`init` now uses a browser + paste flow by default**, matching
  `decoy-scan`'s `loginInteractive` UX. The CLI opens
  `https://app.decoy.run/dashboard?tab=settings#s-setup` and prompts the user
  to paste their token. Works for both new and existing accounts —
  `/api/signup` is anti-enumeration-locked for known emails, so the previous
  `--email`-first flow silently failed for any returning user.
  - `init --token=XXX` still works for CI / scripted installs.
  - `init --email=foo@bar.com` still works for fresh emails as a fast path,
    and falls back to the browser flow if `/api/signup` doesn't return a
    token (anti-enumeration response or rate limit).
- The pasted/passed token is now verified against `/api/triggers` before
  any host config is touched, so an invalid token never leaves you with a
  broken install.

### Fixed
- **`init` no longer silently writes broken configs when `/api/signup` returns
  no token.** Previously the CLI plowed past this with `data.token === undefined`,
  rewrote every host config with `env: {}` (since `JSON.stringify` drops
  undefined values), printed `Token: undefined`, and left tripwires unable
  to authenticate. The CLI now detects the missing token and falls back to
  the browser flow (or aborts cleanly in non-TTY environments).

## [0.11.4] - 2026-04-28

### Fixed
- `decoy-tripwire upgrade` now opens
  `https://app.decoy.run/dashboard?tab=settings#s-plan` (the Plan section)
  instead of the dashboard overview, so users land directly on the upgrade
  picker. Matches the dashboard's own internal Upgrade CTAs.

### Changed
- `upgrade` copy now says "Upgrade to Team" and lists current Team-tier
  features (Slack/webhook alerts, threat intel, continuous scanning) instead
  of the legacy "Upgrade to Pro / exposure analysis" wording.

## [0.11.0] - 2026-04-21

### Added
- **Auto-block on tripwire hit.** When a tripwire fires, the tripped agent is paused for 10 minutes (configurable). Subsequent tool calls in any wrapped upstream are denied sub-millisecond via a shared pause registry at `~/.decoy/pause.json`.
- **Desktop notifications** on tripwire hit — native macOS/Linux/Windows alerts surface the tool name, the paused agent, and the TTL.
- **`init` now wraps existing upstream MCP servers** through the local proxy by default, so auto-block covers your whole setup. Pass `--no-wrap` to keep upstreams un-proxied.
- **New CLI commands**:
  - `resume <agent-id>` / `resume --all` — clear an auto-pause immediately.
  - `lock <agent-id>` / `lock --all` — convert an auto-pause into a permanent block.
  - `lockdown on|off|status` — when on, one tripwire pauses every agent, not just the tripped one.
- **Local `status` section** — `decoy-tripwire status` now shows active local pauses above the hosted trigger list.
- New local config at `~/.decoy/config.json` (`lockdownMode`, `pauseTtlMs`, `desktopNotifications`) with read-time migration for the legacy `paranoidMode` key.
- `DECOY_HOME` env var to override the registry/config location, used for test isolation.

### Changed
- Help text reorganized so `resume`/`lock`/`lockdown` sit under a new "When a tripwire fires:" section; `proxy` moved to its own "Proxy (advanced):" section.
- Post-install "Next:" message clarified — tripwires activate on MCP host reconnect; `test` is now an optional verify step, not a required one.

### Fixed
- Test isolation — proxy tests now use `DECOY_HOME` so spawned CLI subprocesses don't write to the real `~/.decoy/pause.json`.

## [0.8.0] - 2026-03-21

### Changed
- **BREAKING:** `decoy_upgrade` no longer collects card details. Returns a Stripe Checkout URL instead. Card data never touches the server (PCI compliance).
- Updated pricing from $9/mo to $99/mo to match current Decoy Guard Pro pricing.

### Added
- `decoy_report_issue` tool for in-context bug reporting
- `decoy_report_servers` tool for shadow MCP server discovery

## [0.7.0] - 2026-03-20

### Added
- Dynamic tripwires with `generateHoneyTools()` for randomized realistic tool definitions
- Enhanced telemetry documentation

## [0.6.0] - 2026-03-18

### Added
- Contribution guidelines and agent guidelines

### Fixed
- CLI cleanup

## [0.5.0] - 2026-03-16

### Fixed
- `pad()` crash on undefined for free users' agent clientName
- README copy updates

## [0.4.4] - 2026-03-15

### Fixed
- Version bump with minor fixes

## [0.4.0] - 2026-03-14

### Added
- `decoy-scan` command integration
- Multi-host support
- Passkey auth and clean URL documentation

## [0.3.3] - 2026-03-13

### Fixed
- Correct README with accurate tool count, tiers, dashboard URL
- Store full SQL query in fake responses (was truncated to 50 chars)

## [0.3.2] - 2026-03-12

### Fixed
- Minor fixes and link cleanup

## [0.3.1] - 2026-03-11

### Added
- 5 new tripwire tools
- Agent pause functionality and new routes

## [0.3.0] - 2026-03-10

### Changed
- All URLs now point to app.decoy.run

## [0.1.0] - 2026-03-06

### Added
- Initial release: security tripwires for AI agents
- 12 built-in tripwire tools
- Real-time prompt injection detection
- CLI interface (`decoy-tripwire`)
