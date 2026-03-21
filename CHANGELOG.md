# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
- CLI interface (`decoy-mcp`)
