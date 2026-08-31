// decoy-tripwire CLI tests
// Run: node --test test/cli.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, platform } from "node:os";
import { pathToFileURL } from "node:url";

const exec = promisify(execFile);
const CLI = join(import.meta.dirname, "..", "bin", "cli.mjs");

async function run(args = [], opts = {}) {
  try {
    const { stdout, stderr } = await exec("node", [CLI, ...args], {
      timeout: 30000,
      env: { ...process.env, ...opts.env },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout || "", stderr: e.stderr || "", exitCode: e.code || 1 };
  }
}

// ─── Basics ───

describe("basics", () => {
  it("--version prints version from package.json", async () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
    const { stdout, exitCode } = await run(["--version"]);
    assert.equal(exitCode, 0);
    assert.match(stdout.trim(), new RegExp(`^decoy-tripwire ${pkg.version}$`));
  });

  it("--help prints help to stdout and exits 0", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Know when your agents are compromised/);
    assert.match(stdout, /init/);
    assert.match(stdout, /test/);
    assert.match(stdout, /status/);
    assert.match(stdout, /watch/);
  });

  it("bare command shows help and exits 0", async () => {
    const { stdout, exitCode } = await run([]);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Know when your agents are compromised/);
  });

  it("--help contains no ANSI codes when --no-color is passed", async () => {
    const { stdout } = await run(["--help", "--no-color"]);
    assert.ok(!stdout.includes("\x1b["), "help should not contain ANSI escape codes with --no-color");
  });

  it("module loads without error", async () => {
    // `exec` (promisify(execFile)) rejects on non-zero exit, so reaching
    // the next line is the assertion. Previously this ended with
    // `assert.ok(true)` which looked tautological but was load-bearing —
    // remove the suggestive line since reaching here already implies success.
    const cliUrl = pathToFileURL(CLI).href;
    await exec("node", ["-e", `import('${cliUrl}')`]);
  });
});

// ─── Unknown commands ───

describe("unknown commands", () => {
  it("unknown command exits 1", async () => {
    const { exitCode } = await run(["boguscmd"]);
    assert.equal(exitCode, 1);
  });

  it("unknown command suggests the closest real one", async () => {
    const { stderr } = await run(["docter"]);
    assert.match(stderr, /Did you mean `decoy-tripwire doctor`\?/);
  });

  it("unknown command prints error to stderr", async () => {
    const { stderr } = await run(["boguscmd"]);
    assert.match(stderr, /unknown command.*boguscmd/i);
  });

  it("unknown command does not print help to stdout", async () => {
    const { stdout } = await run(["boguscmd"]);
    assert.equal(stdout, "", "stdout should be empty on unknown command");
  });
});

// ─── --help on subcommands ───

describe("subcommand --help", () => {
  it("test --help shows help, does NOT send a trigger", async () => {
    const { stdout, stderr, exitCode } = await run(["test", "--help"]);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Know when your agents are compromised/);
    // Should NOT contain trigger output
    assert.ok(!stderr.includes("trigger sent"), "should not send a test trigger");
  });

  it("status --help shows help, does NOT fetch status", async () => {
    const { stdout, exitCode } = await run(["status", "--help"]);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Usage/);
  });

  it("uninstall --help shows help, does NOT uninstall", async () => {
    const { stdout, exitCode } = await run(["uninstall", "--help"]);
    assert.equal(exitCode, 0);
    assert.match(stdout, /Usage/);
  });
});

// ─── Scan redirect ───

describe("scan redirect", () => {
  it("scan command redirects to decoy-scan", async () => {
    const { stderr, exitCode } = await run(["scan"]);
    assert.equal(exitCode, 0);
    assert.match(stderr, /decoy-scan/);
    assert.match(stderr, /moved/i);
  });
});

// ─── Uninstall confirmation ───

describe("uninstall confirmation", () => {
  it("uninstall without --confirm in non-TTY exits 1", async () => {
    // Create a temporary HOME with a mock Claude Desktop config containing system-tools
    const fakeHome = join(tmpdir(), `decoy-test-uninstall-${Date.now()}`);
    const isWin = platform() === "win32";
    const configDir = process.platform === "darwin"
      ? join(fakeHome, "Library", "Application Support", "Claude")
      : isWin
        ? join(fakeHome, "AppData", "Roaming", "Claude")
        : join(fakeHome, ".config", "Claude");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, "claude_desktop_config.json"), JSON.stringify({
      mcpServers: { "system-tools": { command: "npx", args: ["decoy-tripwire"] } }
    }));

    // On Windows, homedir() uses USERPROFILE; on Unix it uses HOME
    const homeEnv = isWin
      ? { USERPROFILE: fakeHome, APPDATA: join(fakeHome, "AppData", "Roaming") }
      : { HOME: fakeHome };

    try {
      const { exitCode, stderr } = await run(["uninstall"], { env: { ...homeEnv, DECOY_TOKEN: "" } });
      assert.equal(exitCode, 1);
      assert.match(stderr, /--confirm/);
    } finally {
      rmSync(fakeHome, { recursive: true, force: true });
    }
  });
});

// ─── Doctor ───

describe("doctor", () => {
  it("doctor --json returns structured output", async () => {
    const { stdout } = await run(["doctor", "--json"]);
    const result = JSON.parse(stdout);
    assert.ok(typeof result.ok === "boolean", "should have ok field");
    assert.ok(typeof result.issues === "number", "should have issues count");
    assert.ok(Array.isArray(result.checks), "should have checks array");
  });

  it("doctor without --json runs checks", async () => {
    const { stderr, exitCode } = await run(["doctor"]);
    // Doctor checks Node.js version, which should always pass
    assert.match(stderr, /Node\.js/);
  });
});

// ─── Upgrade ───

describe("upgrade", () => {
  it("upgrade shows dashboard URL, no card flags", async () => {
    const { stderr } = await run(["upgrade"], { env: { DECOY_TOKEN: "", HOME: "/nonexistent" } });
    assert.match(stderr, /dashboard/i);
    assert.ok(!stderr.includes("card-number"), "should not mention card-number flag");
    assert.ok(!stderr.includes("4242"), "should not show test card number");
  });

  it("upgrade --json returns URL", async () => {
    const { stdout } = await run(["upgrade", "--json"], { env: { DECOY_TOKEN: "", HOME: "/nonexistent" } });
    const result = JSON.parse(stdout);
    assert.ok(result.url, "should have url field");
    assert.match(result.url, /dashboard/);
  });
});

// ─── Token handling ───

describe("token handling", () => {
  it("status without token shows actionable error", async () => {
    // Override HOME to prevent findToken() from discovering tokens in host configs
    const { stderr, exitCode } = await run(["status"], { env: { DECOY_TOKEN: "", HOME: "/tmp/decoy-test-nonexistent" } });
    assert.equal(exitCode, 1);
    assert.match(stderr, /no token/i);
    assert.match(stderr, /npx decoy-tripwire init/);
  });

  it("status --json without token returns error JSON", async () => {
    const { stdout, exitCode } = await run(["status", "--json"], { env: { DECOY_TOKEN: "", HOME: "/tmp/decoy-test-nonexistent" } });
    assert.equal(exitCode, 1);
    const result = JSON.parse(stdout);
    assert.ok(result.error, "should have error field");
  });

  it("login with bad token shows error", async () => {
    const { stderr, exitCode } = await run(["login", "--token=bad"]);
    assert.equal(exitCode, 1);
    assert.match(stderr, /invalid token/i);
  });
});

// ─── Argument hygiene ───
// Before this, parseArgs swallowed any misspelled flag into an unread key, so
// `status --josn` printed human output and `init --no-wrp` wrapped anyway.

describe("argument hygiene", () => {
  it("rejects an unknown flag", async () => {
    const { stderr, exitCode } = await run(["status", "--josn", "--no-color"]);
    assert.equal(exitCode, 1);
    assert.match(stderr, /unknown flag --josn/);
  });

  it("suggests the intended flag", async () => {
    const { stderr } = await run(["status", "--josn", "--no-color"]);
    assert.match(stderr, /Did you mean --json\?/);
  });

  // A real flag on the wrong command only warns. It was silently ignored
  // before, so failing outright could break a script that has been passing a
  // harmless extra flag for months.
  it("warns about a real flag used on the wrong command, and still runs", async () => {
    const { stderr } = await run(["status", "--no-wrap", "--no-color"]);
    assert.match(stderr, /warning: --no-wrap does nothing on `status`/);
    assert.match(stderr, /applies to `init`/);
  });

  it("does not warn about that flag on the command that owns it", async () => {
    const { stderr, exitCode } = await run(["init", "--no-wrap", "--help"]);
    assert.equal(exitCode, 0);
    assert.ok(!/warning/.test(stderr), stderr);
  });

  it("rejects an unknown agents subcommand", async () => {
    const { stderr, exitCode } = await run(["agents", "puase", "--no-color"]);
    assert.equal(exitCode, 1);
    assert.match(stderr, /Did you mean `decoy-tripwire agents pause`\?/);
  });

  it("rejects an unknown lockdown mode", async () => {
    const { stderr, exitCode } = await run(["lockdown", "onn", "--no-color"]);
    assert.equal(exitCode, 1);
    assert.match(stderr, /Did you mean `decoy-tripwire lockdown on`\?/);
  });

  it("leaves the upstream command line after `--` alone", async () => {
    // --anything-at-all belongs to the wrapped server, not to us.
    const { stdout, stderr, exitCode } = await run(["proxy", "--", "node", "-e", "0", "--upstream-only-flag"]);
    assert.ok(!/unknown flag/.test(stderr), stderr);
  });
});

// ─── Non-TTY behavior ───

describe("non-tty behavior", () => {
  it("init without email in non-TTY shows flag hint", async () => {
    const { stderr, exitCode } = await run(["init"]);
    // In exec(), stdin is not a TTY, so it should error
    assert.equal(exitCode, 1);
    assert.match(stderr, /interactive terminal|--email/i);
  });
});

// ─── Init token resolution ───
// The init flow must never write a host config without a verified token.
// Three paths:
//   1. --token=XXX           — direct
//   2. --email=...           — /api/signup; falls back to browser if no token
//   3. bare                  — browser + paste (default)
// All must abort cleanly without rewriting host configs when a token isn't
// resolved (anti-enumeration response, non-TTY environments, etc.).

describe("init token resolution", () => {
  it("init --email aborts without writing configs when /api/signup returns no token", async () => {
    const { createServer } = await import("node:http");
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        // Anti-enumeration response: ok+message, no token, no `existing` field.
        res.end(JSON.stringify({ ok: true, message: "If this email is new, check your inbox for a verification link." }));
      });
    });
    await new Promise(r => server.listen(0, "127.0.0.1", r));
    const { port } = server.address();

    const tmpHome = join(tmpdir(), `decoy-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpHome, { recursive: true });

    try {
      const { stderr, exitCode } = await run(
        ["init", "--email=existing@example.com", "--no-color"],
        { env: { HOME: tmpHome, DECOY_URL: `http://127.0.0.1:${port}` } },
      );
      assert.equal(exitCode, 1, "should exit 1 when signup returned no token and stdin isn't a TTY");
      // Falls through to browser flow, which exits because exec() has no TTY.
      assert.match(stderr, /Auto-signup didn't return a token|interactive terminal/i);
      const claudeConfig = join(tmpHome, "Library", "Application Support", "Claude", "claude_desktop_config.json");
      assert.ok(!existsSync(claudeConfig), "must not write Claude config when token isn't resolved");
    } finally {
      server.close();
      rmSync(tmpHome, { recursive: true, force: true });
    }
  });

  it("bare init in non-TTY exits cleanly without touching configs", async () => {
    const tmpHome = join(tmpdir(), `decoy-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpHome, { recursive: true });
    try {
      const { stderr, exitCode } = await run(
        ["init", "--no-color"],
        { env: { HOME: tmpHome } },
      );
      assert.equal(exitCode, 1, "non-TTY init should exit 1");
      assert.match(stderr, /interactive terminal|Sign in to Decoy/i, "should mention browser flow or non-TTY");
      const claudeConfig = join(tmpHome, "Library", "Application Support", "Claude", "claude_desktop_config.json");
      assert.ok(!existsSync(claudeConfig), "must not write Claude config in non-TTY without --token");
    } finally {
      rmSync(tmpHome, { recursive: true, force: true });
    }
  });
});

// ─── Dashboard URL security ───

describe("dashboard url security", () => {
  it("human output does not contain full token in URLs", async () => {
    const { stderr } = await run(["doctor"]);
    // Doctor output should not have ?token= URLs
    const tokenUrlPattern = /dashboard\?token=[a-f0-9]{20,}/;
    assert.ok(!tokenUrlPattern.test(stderr), "human output should not contain full token in dashboard URL");
  });

  it("upgrade human output does not leak token", async () => {
    const { stderr } = await run(["upgrade"]);
    const tokenUrlPattern = /\?token=[a-f0-9]{20,}/;
    assert.ok(!tokenUrlPattern.test(stderr), "upgrade should not leak token in URL");
  });
});

// ─── Color handling ───

describe("color handling", () => {
  it("--no-color removes ANSI from help", async () => {
    const { stdout } = await run(["--help", "--no-color"]);
    assert.ok(!stdout.includes("\x1b["), "should not contain ANSI codes");
  });

  it("NO_COLOR env var disables colors", async () => {
    const { stdout } = await run(["--help"], { env: { NO_COLOR: "1" } });
    assert.ok(!stdout.includes("\x1b["), "should not contain ANSI codes with NO_COLOR");
  });
});
