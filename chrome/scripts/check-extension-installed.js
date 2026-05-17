#!/usr/bin/env node
/* global console */

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
  const config = support.loadExtensionConfig();
  console.error(
    "Usage: scripts/check-extension-installed.js [--json] [--browser chrome|edge|all]",
  );
  console.error("");
  console.error(
    `Default extension ID is configured in scripts/${support.EXTENSION_ID_CONFIG_FILENAME} (${config.extensionId}).`,
  );
  console.error(
    `Optional browser selector: ${support.BROWSER_ENV}=chrome|edge|all`,
  );
  console.error(
    `Optional profile-root override: ${support.BROWSER_USER_DATA_DIR_ENV}=/path/to/browser-root`,
  );
  console.error(
    `Optional Chrome profile-root override: ${support.CHROME_USER_DATA_DIR_ENV}=/path/to/chrome-root`,
  );
  console.error(
    `Optional Edge profile-root override: ${support.EDGE_USER_DATA_DIR_ENV}=/path/to/edge-root`,
  );
  console.error(
    `Optional preferences-file override: ${support.BROWSER_PREFERENCES_PATH_ENV}=/path/to/Profile/Preferences`,
  );
}

function parseArgs(argv) {
  const { browser, remaining } = support.extractBrowserOption(argv);
  const flags = new Set(remaining);
  if (flags.has("-h") || flags.has("--help")) {
    usage();
    process.exit(0);
  }

  const supportedFlags = new Set(["--json"]);
  const unsupportedFlags = remaining.filter((arg) => !supportedFlags.has(arg));
  if (unsupportedFlags.length > 0) {
    usage();
    process.exit(support.EXIT_RUNTIME_ERROR);
  }

  return {
    browser,
    json: flags.has("--json"),
  };
}

function getExtensionInstallResult(targets) {
  const { extensionId } = support.loadExtensionConfig();
  const statuses = targets.map((browser) =>
    support.getBrowserExtensionInstallStatus(browser, extensionId),
  );
  return support.buildExtensionResult(statuses);
}

function printTextReport(result) {
  for (const browser of result.browsers) {
    console.log(`${browser.browserName}`);
    if (browser.error) console.log(`  Error: ${browser.error}`);
    if (browser.profilePath)
      console.log(`  Checked profile: ${browser.profilePath}`);
    console.log(`  Extension ID: ${browser.extensionId}`);
    if (browser.extensionPath)
      console.log(`  Extension path: ${browser.extensionPath}`);
    console.log(`  Installed: ${browser.installed ? "yes" : "no"}`);
    console.log(
      `  Registered in preferences: ${browser.registered ? "yes" : "no"}`,
    );
    console.log(`  Enabled: ${browser.enabled ? "yes" : "no"}`);
    if (browser.disabled)
      console.log(`  Disable reasons: ${browser.disableReasons.join(", ")}`);
    if (browser.versions.length > 0)
      console.log(`  Installed versions: ${browser.versions.join(", ")}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = support.browserTargetsForSelection(args.browser);
  const result = getExtensionInstallResult(targets);

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printTextReport(result);

  process.exit(result.exitCode);
}

void loadSupport()
  .then(() => {
    main();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    (process || globalThis.process)?.exit(support?.EXIT_RUNTIME_ERROR || 3);
  });
