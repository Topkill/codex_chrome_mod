#!/usr/bin/env node
/* global console */
/* Report the default browser and known installed Chromium browsers. */

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
  console.error("Usage: installed-browsers.js [--check] [--json]");
}

function printTextReport(inventory, check) {
  if (check) {
    console.log("Chrome/Edge plugin setup/configuration check");
    console.log("status: ok");
    console.log("");
  }

  console.log("Default browser");
  const defaultBrowser = inventory.default_browser;
  const schemes = defaultBrowser.schemes;
  if (schemes && Object.keys(schemes).length > 0) {
    for (const scheme of ["http", "https"]) {
      const item = schemes[scheme];
      if (!item) {
        console.log(`  ${scheme}: unknown`);
        continue;
      }
      const name = item.name || "unknown app";
      const identifier = item.bundle_id || item.prog_id || "unknown id";
      console.log(`  ${scheme}: ${name} (${identifier})`);
      if (item.path) console.log(`      path: ${item.path}`);
    }
  } else if (defaultBrowser.desktop_file)
    console.log(`  ${defaultBrowser.desktop_file}`);
  else if (defaultBrowser.prog_id) console.log(`  ${defaultBrowser.prog_id}`);
  else console.log(`  unknown (source: ${defaultBrowser.source || "unknown"})`);

  console.log("");
  console.log("Installed known Chromium browsers");
  if (inventory.installed_browsers.length === 0) {
    console.log("  none found");
    return;
  }

  for (const item of inventory.installed_browsers) {
    console.log(`  - ${item.name}`);
    if (item.bundle_id) console.log(`      bundle id: ${item.bundle_id}`);
    if (item.version) console.log(`      version: ${item.version}`);
    console.log(`      path: ${item.path}`);
  }
}

function parseArgs(argv) {
  const flags = new Set(argv);
  if (flags.has("-h") || flags.has("--help")) {
    usage();
    process.exit(0);
  }

  const supportedFlags = new Set(["--check", "--json"]);
  const unsupportedFlags = argv.filter((arg) => !supportedFlags.has(arg));
  if (unsupportedFlags.length > 0) {
    usage();
    process.exit(2);
  }

  return {
    check: flags.has("--check"),
    json: flags.has("--json"),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inventory = support.collectBrowserInventory();

  if (args.json) console.log(JSON.stringify(inventory, null, 2));
  else printTextReport(inventory, args.check);

  if (args.check && inventory.installed_browsers.length === 0)
    process.exitCode = 1;
}

void loadSupport()
  .then(() => {
    main();
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    (process || globalThis.process)?.exit(2);
  });
