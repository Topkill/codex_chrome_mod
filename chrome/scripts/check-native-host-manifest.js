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
  console.error(
    "Usage: scripts/check-native-host-manifest.js [--json] [--browser chrome|edge|custom_chrome|all]",
  );
  console.error("");
  console.error(
    `Expected extension ID is read from scripts/${support.EXTENSION_ID_CONFIG_FILENAME}.`,
  );
  console.error(
    `Optional browser selector: ${support.BROWSER_ENV}=chrome|edge|custom_chrome|all`,
  );
  console.error(
    `Optional manifest-file override: ${support.BROWSER_NATIVE_HOST_MANIFEST_PATH_ENV}=/path/to/native-host.json`,
  );
  console.error(
    `Optional Custom Chrome manifest-file override: ${support.CUSTOM_CHROME_NATIVE_HOST_MANIFEST_PATH_ENV}=/path/to/native-host.json`,
  );
  console.error(
    `Optional Chrome manifest-file override: ${support.CHROME_NATIVE_HOST_MANIFEST_PATH_ENV}=/path/to/native-host.json`,
  );
  console.error(
    `Optional Edge manifest-file override: ${support.EDGE_NATIVE_HOST_MANIFEST_PATH_ENV}=/path/to/native-host.json`,
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
    process.exit(2);
  }

  return {
    browser,
    json: flags.has("--json"),
  };
}

function getNativeHostResult(targets) {
  const { extensionHostName, extensionId } = support.loadExtensionConfig();
  const statuses = targets.map((browser) =>
    support.getNativeHostManifestStatus(
      browser,
      extensionHostName,
      extensionId,
    ),
  );
  return support.buildNativeHostManifestResult(statuses);
}

function printTextReport(result) {
  for (const browser of result.browsers) {
    console.log(`${browser.browserName}`);
    if (browser.manifestPath)
      console.log(`  Native host manifest: ${browser.manifestPath}`);
    if (browser.registryKey)
      console.log(`  Windows registry key: ${browser.registryKey}`);
    if (browser.registryManifestPath) {
      console.log(
        `  Windows registry manifest path: ${browser.registryManifestPath}`,
      );
    }
    console.log(`  Expected host name: ${browser.expectedHostName}`);
    if (browser.actualHostName)
      console.log(`  Actual host name: ${browser.actualHostName}`);
    console.log(`  Expected extension ID: ${browser.expectedExtensionId}`);
    console.log(`  Expected allowed origin: ${browser.expectedOrigin}`);
    if (browser.allowedOrigins)
      console.log(`  Allowed origins: ${browser.allowedOrigins.join(", ")}`);
    console.log(`  Correct: ${browser.correct ? "yes" : "no"}`);
    if (browser.problem) console.log(`  Problem: ${browser.problem}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = support.browserTargetsForSelection(args.browser);
  const result = getNativeHostResult(targets);

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printTextReport(result);

  process.exit(result.correct ? 0 : 1);
}

void loadSupport()
  .then(() => {
    main();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    (process || globalThis.process)?.exit(2);
  });
