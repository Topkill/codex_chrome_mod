#!/usr/bin/env node
/* global console */
/* Open a Chrome window for the profile selected by plugin checks. */

let path;
let process;
let execFileSync;
let support;

async function loadSupport() {
  path = await import("node:path");
  process = (await import("node:process")).default;
  ({ execFileSync } = await import("node:child_process"));
  const { pathToFileURL } = await import("node:url");
  const supportPath = path.join(
    path.dirname(path.resolve(process.argv[1] || ".")),
    "browser-support.mjs",
  );
  support = await import(pathToFileURL(supportPath).href);
}

function usage() {
  console.error(
    "Usage: scripts/open-chrome-window.js [--dry-run] [--json] [--browser chrome|edge|custom_chrome|all]",
  );
  console.error("");
  console.error(
    `Optional browser selector: ${support.BROWSER_ENV}=chrome|edge|custom_chrome|all`,
  );
  console.error(
    `Optional browser executable override: ${support.BROWSER_EXECUTABLE_PATH_ENV}=/tmp/chrome`,
  );
  console.error(
    `Optional Custom Chrome executable override: ${support.CUSTOM_CHROME_EXECUTABLE_PATH_ENV}=/tmp/chrome`,
  );
  console.error(
    `Optional profile-root override: ${support.BROWSER_USER_DATA_DIR_ENV}=/tmp/browser-root`,
  );
  console.error(
    `Optional Custom Chrome profile-root override: ${support.CUSTOM_CHROME_USER_DATA_DIR_ENV}=/tmp/custom-chrome-root`,
  );
  console.error(
    `Optional Custom Chrome preferences-file override: ${support.CUSTOM_CHROME_PREFERENCES_PATH_ENV}=/tmp/Profile/Preferences`,
  );
  console.error(
    `Optional Chrome profile-root override: ${support.CHROME_USER_DATA_DIR_ENV}=/tmp/chrome-root`,
  );
  console.error(
    `Optional Edge profile-root override: ${support.EDGE_USER_DATA_DIR_ENV}=/tmp/edge-root`,
  );
  console.error(
    `Optional preferences-file override: ${support.BROWSER_PREFERENCES_PATH_ENV}=/tmp/Profile/Preferences`,
  );
}

function parseArgs(argv) {
  const { browser, remaining } = support.extractBrowserOption(argv);
  const flags = new Set(remaining);
  if (flags.has("-h") || flags.has("--help")) {
    usage();
    process.exit(0);
  }

  const supportedFlags = new Set(["--dry-run", "--json"]);
  const unsupportedFlags = remaining.filter((arg) => !supportedFlags.has(arg));
  if (unsupportedFlags.length > 0) {
    usage();
    process.exit(2);
  }

  return {
    browser,
    dryRun: flags.has("--dry-run"),
    json: flags.has("--json"),
  };
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

function printTextReport(result) {
  console.log(`${result.browserName} window open request`);
  console.log(`status: ${result.dryRun ? "dry run" : "opened"}`);
  console.log(`profile: ${result.profileDirectory}`);
  console.log(`command: ${formatCommand(result.command, result.args)}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = support.browserTargetsForSelection(args.browser);
  const { extensionId } = support.loadExtensionConfig();
  const selection = support.chooseBrowserForOpen(targets, extensionId);
  const preferencesPath =
    selection.status.preferencesPath ||
    support.resolveBrowserPreferencesPath(selection.browser);
  const profileDirectory = path.basename(path.dirname(preferencesPath));
  const command =
    selection.command ||
    support.getOpenBrowserCommand(selection.browser, profileDirectory);
  const result = {
    platform: process.platform,
    browser: selection.browser.id,
    browserName: selection.browser.name,
    dryRun: args.dryRun,
    profileDirectory,
    preferencesPath,
    command: command.command,
    args: command.args,
    checkedBrowsers: selection.statuses,
  };

  if (!args.dryRun) {
    execFileSync(command.command, command.args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
  }

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printTextReport(result);
}

void loadSupport()
  .then(() => {
    main();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    (process || globalThis.process)?.exit(2);
  });
