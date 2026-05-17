#!/usr/bin/env node
/* global console */
/* Detect whether Google Chrome or Microsoft Edge is currently running. */

let process;
let support;

async function loadSupport() {
  process = (await import("node:process")).default;
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const supportPath = path.join(
    path.dirname(path.resolve(process.argv[1] || ".")),
    "browser-support.mjs",
  );
  support = await import(pathToFileURL(supportPath).href);
}

function usage() {
  console.error(
    "Usage: scripts/chrome-is-running.js [--check] [--json] [--browser chrome|edge|all]",
  );
}

function parseArgs(argv) {
  const { browser, remaining } = support.extractBrowserOption(argv);
  const flags = new Set(remaining);
  if (flags.has("-h") || flags.has("--help")) {
    usage();
    process.exit(0);
  }

  const supportedFlags = new Set(["--check", "--json"]);
  const unsupportedFlags = remaining.filter((arg) => !supportedFlags.has(arg));
  if (unsupportedFlags.length > 0) {
    usage();
    process.exit(2);
  }

  return {
    browser,
    check: flags.has("--check"),
    json: flags.has("--json"),
  };
}

function buildResult(targets, processes) {
  const browsers = targets.map((browser) => {
    const browserProcesses = processes.filter(
      (browserProcess) => browserProcess.browser === browser.id,
    );
    return {
      browser: browser.id,
      browserName: browser.name,
      running: browserProcesses.length > 0,
      processes: browserProcesses,
    };
  });

  return {
    platform: process.platform,
    running: processes.length > 0,
    processes,
    browsers,
  };
}

function printTextReport(result, check) {
  if (check) {
    console.log("Chrome/Edge running check");
    console.log(`status: ${result.running ? "ok" : "not running"}`);
    console.log("");
  }

  console.log(`Chrome/Edge running: ${result.running ? "yes" : "no"}`);
  for (const browser of result.browsers) {
    console.log(`  ${browser.browserName}: ${browser.running ? "yes" : "no"}`);
    for (const browserProcess of browser.processes) {
      console.log(`    - pid: ${browserProcess.pid}`);
      console.log(`      process: ${browserProcess.process_name}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = support.browserTargetsForSelection(args.browser);
  const processes = support.findRunningBrowserProcesses(targets);
  const result = buildResult(targets, processes);

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printTextReport(result, args.check);

  if (args.check && !result.running) process.exitCode = 1;
}

void loadSupport()
  .then(() => {
    main();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    (process || globalThis.process)?.exit(2);
  });
