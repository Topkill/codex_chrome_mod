import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export const BROWSER_ENV = "CODEX_BROWSER";
export const BROWSER_USER_DATA_DIR_ENV = "CODEX_BROWSER_USER_DATA_DIR";
export const BROWSER_PREFERENCES_PATH_ENV = "CODEX_BROWSER_PREFERENCES_PATH";
export const BROWSER_NATIVE_HOST_MANIFEST_PATH_ENV =
  "CODEX_BROWSER_NATIVE_HOST_MANIFEST_PATH";
export const CHROME_USER_DATA_DIR_ENV = "CODEX_CHROME_USER_DATA_DIR";
export const CHROME_PREFERENCES_PATH_ENV = "CODEX_CHROME_PREFERENCES_PATH";
export const CHROME_NATIVE_HOST_MANIFEST_PATH_ENV =
  "CODEX_CHROME_NATIVE_HOST_MANIFEST_PATH";
export const EDGE_USER_DATA_DIR_ENV = "CODEX_EDGE_USER_DATA_DIR";
export const EDGE_PREFERENCES_PATH_ENV = "CODEX_EDGE_PREFERENCES_PATH";
export const EDGE_NATIVE_HOST_MANIFEST_PATH_ENV =
  "CODEX_EDGE_NATIVE_HOST_MANIFEST_PATH";

export const EXTENSION_ID_CONFIG_FILENAME = "extension-id.json";
export const EXIT_INSTALLED_AND_ENABLED = 0;
export const EXIT_INSTALLED_NOT_ENABLED = 1;
export const EXIT_NOT_INSTALLED = 2;
export const EXIT_RUNTIME_ERROR = 3;
export const ABOUT_BLANK_URL = "about:blank";

export const BROWSER_TARGETS = [
  {
    id: "chrome",
    name: "Google Chrome",
    shortName: "Chrome",
    envKey: "CHROME",
    bundleIds: ["com.google.Chrome"],
    appNames: ["Google Chrome.app"],
    commands: ["google-chrome", "chrome"],
    windowsExecutable: "chrome.exe",
    windowsCommand: "chrome",
    windowsAppPathKeys: [
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe",
      "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe",
      "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe",
    ],
    windowsInstallSubPath: ["Google", "Chrome", "Application", "chrome.exe"],
    windowsUninstallKeys: [
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome",
      "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome",
      "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Google Chrome",
    ],
    windowsProgIdPrefixes: ["chrome"],
    nativeHostRegistryKeyPrefix:
      "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts",
    userDataDirectoryParts: {
      darwin: [
        "Library",
        "Application Support",
        "Google",
        "Chrome",
      ],
      win32: ["Google", "Chrome", "User Data"],
      linux: [".config", "google-chrome"],
    },
    nativeHostDirectoryParts: {
      darwin: [
        "Library",
        "Application Support",
        "Google",
        "Chrome",
        "NativeMessagingHosts",
      ],
      linux: [".config", "google-chrome", "NativeMessagingHosts"],
    },
    processNames: {
      darwin: ["Google Chrome", "Google Chrome Helper"],
      win32: ["chrome.exe"],
      linux: ["chrome", "google-chrome"],
    },
    macosAppPathFragment: "/Google Chrome.app/Contents/",
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    shortName: "Edge",
    envKey: "EDGE",
    bundleIds: ["com.microsoft.edgemac"],
    appNames: ["Microsoft Edge.app"],
    commands: ["microsoft-edge", "microsoft-edge-stable", "msedge"],
    windowsExecutable: "msedge.exe",
    windowsCommand: "msedge",
    windowsAppPathKeys: [
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe",
      "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe",
      "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\msedge.exe",
    ],
    windowsInstallSubPath: ["Microsoft", "Edge", "Application", "msedge.exe"],
    windowsUninstallKeys: [
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Microsoft Edge",
      "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Microsoft Edge",
      "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Microsoft Edge",
    ],
    windowsProgIdPrefixes: ["msedge", "microsoftedge"],
    nativeHostRegistryKeyPrefix:
      "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts",
    userDataDirectoryParts: {
      darwin: ["Library", "Application Support", "Microsoft Edge"],
      win32: ["Microsoft", "Edge", "User Data"],
      linux: [".config", "microsoft-edge"],
    },
    nativeHostDirectoryParts: {
      darwin: [
        "Library",
        "Application Support",
        "Microsoft Edge",
        "NativeMessagingHosts",
      ],
      linux: [".config", "microsoft-edge", "NativeMessagingHosts"],
    },
    processNames: {
      darwin: ["Microsoft Edge", "Microsoft Edge Helper"],
      win32: ["msedge.exe"],
      linux: ["microsoft-edge", "microsoft-edge-stable", "msedge"],
    },
    macosAppPathFragment: "/Microsoft Edge.app/Contents/",
  },
];

export function runCommand(args) {
  try {
    return execFileSync(args[0], args.slice(1), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function readWindowsRegistryValue(keyPath, valueName) {
  const args = ["reg", "query", keyPath, valueName == null ? "/ve" : "/v"];
  if (valueName != null) args.push(valueName);

  const output = runCommand(args);
  if (!output) return null;

  const label = valueName == null ? "(Default)" : valueName;
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(.*?)\s+REG_\w+\s+(.+?)\s*$/);
    if (match && match[1] === label) return stripRegistryString(match[2]);
  }

  return null;
}

export function stripRegistryString(value) {
  return value.replace(/^"(.*)"$/, "$1");
}

export function commandPath(command) {
  if (process.platform === "win32")
    return runCommand(["where", command])?.split(/\r?\n/)[0] || null;

  return runCommand(["which", command]);
}

export function resolveSiblingScriptPath(filename, argv1 = process.argv[1]) {
  const scriptPath = path.resolve(argv1 || ".");
  return path.join(path.dirname(scriptPath), filename);
}

export function loadExtensionConfig(argv1 = process.argv[1]) {
  const configPath = resolveSiblingScriptPath(EXTENSION_ID_CONFIG_FILENAME, argv1);
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!config || typeof config.extensionId !== "string")
    throw new Error(`Could not read extensionId from ${configPath}.`);
  if (typeof config.extensionHostName !== "string")
    throw new Error(`Could not read extensionHostName from ${configPath}.`);

  return config;
}

export function extractBrowserOption(argv) {
  const remaining = [];
  let browser = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--browser") {
      browser = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--browser=")) {
      browser = arg.slice("--browser=".length);
      continue;
    }
    remaining.push(arg);
  }

  return { browser: normalizeBrowserId(browser), remaining };
}

export function normalizeBrowserId(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "all") return "all";
  if (normalized === "google" || normalized === "google-chrome")
    return "chrome";
  if (
    normalized === "microsoft-edge" ||
    normalized === "msedge" ||
    normalized === "edge"
  )
    return "edge";
  if (normalized === "chrome") return "chrome";

  throw new Error(`Unsupported browser "${value}". Use chrome, edge, or all.`);
}

export function browserTargetsForSelection(browserId, env = process.env) {
  const selected = browserId || normalizeBrowserId(env[BROWSER_ENV]);
  if (selected == null || selected === "all") return BROWSER_TARGETS;

  const target = BROWSER_TARGETS.find((browser) => browser.id === selected);
  if (!target) throw new Error(`Unsupported browser "${selected}".`);

  return [target];
}

export function getBrowserById(browserId) {
  return BROWSER_TARGETS.find((browser) => browser.id === browserId) || null;
}

export function browserEnvValue(browser, suffix, env = process.env) {
  const specific = env[`CODEX_${browser.envKey}_${suffix}`];
  if (specific) return specific;

  if (browser.id === "chrome") {
    const legacy = env[`CODEX_CHROME_${suffix}`];
    if (legacy) return legacy;
  }

  const generic = env[`CODEX_BROWSER_${suffix}`];
  return generic || null;
}

export function resolveBrowserUserDataDirectory(browser, env = process.env) {
  const override = browserEnvValue(browser, "USER_DATA_DIR", env);
  if (override) return path.resolve(override);

  if (process.platform === "darwin") {
    return path.join(os.homedir(), ...browser.userDataDirectoryParts.darwin);
  }

  if (process.platform === "win32") {
    return path.join(
      env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
      ...browser.userDataDirectoryParts.win32,
    );
  }

  return path.join(os.homedir(), ...browser.userDataDirectoryParts.linux);
}

export function resolveBrowserPreferencesPath(browser, env = process.env) {
  const override = browserEnvValue(browser, "PREFERENCES_PATH", env);
  if (override) return path.resolve(override);

  const userDataDirectory = resolveBrowserUserDataDirectory(browser, env);
  const profileDirectory = resolveBrowserProfileDirectory(
    browser,
    userDataDirectory,
  );
  return path.join(userDataDirectory, profileDirectory, "Preferences");
}

export function resolveBrowserProfilePath(browser, env = process.env) {
  return path.dirname(resolveBrowserPreferencesPath(browser, env));
}

export function resolveBrowserProfileDirectory(browser, userDataDirectory) {
  const localStateProfile = resolveBrowserProfileDirectoryFromLocalState(
    browser,
    userDataDirectory,
  );
  if (localStateProfile) return localStateProfile;

  const latestProfile = findLatestBrowserProfile(browser, userDataDirectory);
  if (latestProfile) return latestProfile;

  throw new Error(
    `Could not find a ${browser.name} profile directory with Preferences in ${userDataDirectory}.`,
  );
}

export function resolveBrowserProfileDirectoryFromLocalState(
  browser,
  userDataDirectory,
) {
  const localState = readJsonFileIfPresent(
    path.join(userDataDirectory, "Local State"),
  );
  const profile = localState?.profile;
  if (!profile || typeof profile !== "object") return null;

  if (isUsableBrowserProfile(userDataDirectory, profile.last_used))
    return profile.last_used;

  if (Array.isArray(profile.last_active_profiles)) {
    return chooseLatestUsableBrowserProfile(
      browser,
      userDataDirectory,
      profile.last_active_profiles,
    );
  }

  if (Array.isArray(profile.profiles_order)) {
    return chooseLatestUsableBrowserProfile(
      browser,
      userDataDirectory,
      profile.profiles_order,
    );
  }

  return null;
}

export function chooseLatestUsableBrowserProfile(
  browser,
  userDataDirectory,
  profileDirectories,
) {
  const usableProfiles = profileDirectories.filter((profileDirectory) => {
    return isUsableBrowserProfile(userDataDirectory, profileDirectory);
  });
  if (usableProfiles.length === 0) return null;

  return usableProfiles.sort(compareBrowserProfileDirectories).at(-1);
}

export function findLatestBrowserProfile(browser, userDataDirectory) {
  if (!fs.existsSync(userDataDirectory)) {
    throw new Error(
      `${browser.name} user data directory does not exist: ${userDataDirectory}`,
    );
  }

  const profileDirectories = fs
    .readdirSync(userDataDirectory, { withFileTypes: true })
    .filter((entry) => {
      return (
        entry.isDirectory() &&
        (entry.name === "Default" || /^Profile \d+$/.test(entry.name))
      );
    })
    .map((entry) => entry.name);

  return chooseLatestUsableBrowserProfile(
    browser,
    userDataDirectory,
    profileDirectories,
  );
}

export function isUsableBrowserProfile(userDataDirectory, profileDirectory) {
  if (typeof profileDirectory !== "string" || profileDirectory.length === 0)
    return false;

  return fs.existsSync(
    path.join(userDataDirectory, profileDirectory, "Preferences"),
  );
}

export function compareBrowserProfileDirectories(first, second) {
  return browserProfileDirectorySortKey(first) - browserProfileDirectorySortKey(second);
}

export function browserProfileDirectorySortKey(profileDirectory) {
  if (profileDirectory === "Default") return 0;

  const match = profileDirectory.match(/^Profile (\d+)$/);
  if (!match) return -1;

  return Number(match[1]);
}

export function readJsonFileIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function getBrowserExtensionInstallStatus(browser, extensionId) {
  try {
    const profilePath = resolveBrowserProfilePath(browser);
    const preferences = getBrowserExtensionPreferences(profilePath, extensionId);
    const extensionsDirectory = path.join(profilePath, "Extensions");
    const extensionPath = path.join(extensionsDirectory, extensionId);
    const versions =
      fs.existsSync(extensionPath) && fs.statSync(extensionPath).isDirectory()
        ? fs
            .readdirSync(extensionPath, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort()
        : [];
    const unpackedInstalled =
      preferences.path !== null &&
      fs.existsSync(preferences.path) &&
      fs.statSync(preferences.path).isDirectory();
    const installed = versions.length > 0 || unpackedInstalled;
    const disabled =
      preferences.state === 0 || preferences.disableReasons.length > 0;
    const enabled = installed && preferences.registered && !disabled;

    return {
      browser: browser.id,
      browserName: browser.name,
      extensionId,
      preferencesPath: preferences.preferencesPath,
      profilePath,
      extensionsDirectory,
      extensionPath,
      installed,
      registered: preferences.registered,
      enabled,
      disabled,
      exitCode: getExtensionExitCode({ enabled, installed }),
      state: preferences.state,
      disableReasons: preferences.disableReasons,
      versions,
      error: null,
    };
  } catch (error) {
    return {
      browser: browser.id,
      browserName: browser.name,
      extensionId,
      preferencesPath: null,
      profilePath: null,
      extensionsDirectory: null,
      extensionPath: null,
      installed: false,
      registered: false,
      enabled: false,
      disabled: false,
      exitCode: EXIT_NOT_INSTALLED,
      state: null,
      disableReasons: [],
      versions: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getBrowserExtensionPreferences(profilePath, extensionId) {
  const preferencesPaths = [
    path.join(profilePath, "Secure Preferences"),
    path.join(profilePath, "Preferences"),
  ];
  for (const preferencesPath of preferencesPaths) {
    const preferences = readJsonFileIfPresent(preferencesPath);
    const extensionSettings = preferences?.extensions?.settings?.[extensionId];
    if (!extensionSettings || typeof extensionSettings !== "object") continue;

    return {
      preferencesPath,
      registered: true,
      state:
        typeof extensionSettings.state === "number"
          ? extensionSettings.state
          : null,
      path:
        typeof extensionSettings.path === "string"
          ? extensionSettings.path
          : null,
      disableReasons: getDisableReasons(extensionSettings.disable_reasons),
    };
  }

  return {
    preferencesPath: null,
    registered: false,
    state: null,
    path: null,
    disableReasons: [],
  };
}

export function getDisableReasons(disableReasons) {
  if (Array.isArray(disableReasons)) return disableReasons;
  if (typeof disableReasons === "number" && disableReasons !== 0)
    return [disableReasons];
  return [];
}

export function getExtensionExitCode({ enabled, installed }) {
  if (enabled) return EXIT_INSTALLED_AND_ENABLED;
  if (installed) return EXIT_INSTALLED_NOT_ENABLED;
  return EXIT_NOT_INSTALLED;
}

export function summarizeExtensionStatuses(statuses) {
  const selected =
    statuses.find((status) => status.enabled) ||
    statuses.find((status) => status.installed) ||
    statuses[0] ||
    null;
  const anyEnabled = statuses.some((status) => status.enabled);
  const anyInstalled = statuses.some((status) => status.installed);
  const exitCode = anyEnabled
    ? EXIT_INSTALLED_AND_ENABLED
    : anyInstalled
      ? EXIT_INSTALLED_NOT_ENABLED
      : EXIT_NOT_INSTALLED;

  return { selected, exitCode };
}

export function buildExtensionResult(statuses) {
  const { selected, exitCode } = summarizeExtensionStatuses(statuses);
  return {
    ...(selected || {}),
    platform: process.platform,
    selectedBrowser: selected?.browser || null,
    exitCode,
    browsers: statuses,
  };
}

export function windowsBrowserInstallPaths(browser) {
  const candidates = browser.windowsAppPathKeys
    .map((keyPath) => readWindowsRegistryValue(keyPath, null))
    .filter(Boolean);

  const localAppData =
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const standardRoots = [
    localAppData,
    process.env.PROGRAMFILES,
    process.env["PROGRAMFILES(X86)"],
  ].filter(Boolean);

  for (const root of standardRoots) {
    candidates.push(path.join(root, ...browser.windowsInstallSubPath));
  }

  for (const command of browser.commands) {
    const pathFromCommand = commandPath(command);
    if (pathFromCommand) candidates.push(pathFromCommand);
  }

  const found = new Map();
  for (const candidate of candidates) {
    const executablePath = path.resolve(candidate);
    if (!fs.existsSync(executablePath)) continue;

    found.set(executablePath.toLowerCase(), executablePath);
  }

  return [...found.values()];
}

export function windowsBrowserVersion(browser) {
  for (const keyPath of browser.windowsUninstallKeys) {
    const version = readWindowsRegistryValue(keyPath, "DisplayVersion");
    if (version) return version;
  }

  return null;
}

export function macosAppSearchDirs() {
  return [
    "/Applications",
    "/System/Applications",
    path.join(os.homedir(), "Applications"),
  ];
}

export function readPlistKey(plistPath, key) {
  return runCommand(["plutil", "-extract", key, "raw", "-o", "-", plistPath]);
}

export function readPlistJson(plistPath) {
  const output = runCommand([
    "plutil",
    "-convert",
    "json",
    "-o",
    "-",
    plistPath,
  ]);
  if (!output) return {};

  try {
    return JSON.parse(output);
  } catch {
    return {};
  }
}

export function readBundleInfo(appPath) {
  const infoPath = path.join(appPath, "Contents", "Info.plist");
  if (!fs.existsSync(infoPath)) return {};

  const info = readPlistJson(infoPath);
  if (Object.keys(info).length > 0) return info;

  return {
    CFBundleIdentifier: readPlistKey(infoPath, "CFBundleIdentifier"),
    CFBundleShortVersionString: readPlistKey(
      infoPath,
      "CFBundleShortVersionString",
    ),
  };
}

export function knownBrowserByBundleId() {
  const byBundleId = new Map();
  for (const browser of BROWSER_TARGETS)
    for (const bundleId of browser.bundleIds) byBundleId.set(bundleId, browser);

  return byBundleId;
}

export function macosAppCandidates(browser) {
  const candidates = [];
  for (const baseDir of macosAppSearchDirs()) {
    for (const appName of browser.appNames)
      candidates.push(path.join(baseDir, appName));
  }
  return candidates;
}

export function mdfindAppsForBundleId(bundleId) {
  const output = runCommand([
    "mdfind",
    `kMDItemCFBundleIdentifier == '${bundleId}'`,
  ]);
  if (!output) return [];

  return output.split(/\r?\n/).filter((line) => line.endsWith(".app"));
}

export function addMacosApp(
  installedByBundleId,
  browser,
  appPath,
  fallbackBundleId = null,
) {
  if (!fs.existsSync(appPath)) return;

  const info = readBundleInfo(appPath);
  const bundleId =
    info.CFBundleIdentifier || fallbackBundleId || browser.bundleIds[0];
  if (!bundleId) return;

  installedByBundleId.set(bundleId, {
    id: browser.id,
    name: browser.name,
    bundle_id: bundleId,
    path: appPath,
    version: info.CFBundleShortVersionString || info.CFBundleVersion || null,
  });
}

export function findMacosApps() {
  const installedByBundleId = new Map();

  for (const browser of BROWSER_TARGETS) {
    for (const appPath of macosAppCandidates(browser))
      addMacosApp(installedByBundleId, browser, appPath);

    for (const bundleId of browser.bundleIds) {
      for (const appPath of mdfindAppsForBundleId(bundleId))
        addMacosApp(installedByBundleId, browser, appPath, bundleId);
    }
  }

  const knownByBundleId = knownBrowserByBundleId();
  for (const baseDir of macosAppSearchDirs()) {
    if (!fs.existsSync(baseDir)) continue;

    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.endsWith(".app")) continue;

      const appPath = path.join(baseDir, entry.name);
      const info = readBundleInfo(appPath);
      const browser = knownByBundleId.get(info.CFBundleIdentifier);
      if (!browser) continue;

      addMacosApp(
        installedByBundleId,
        browser,
        appPath,
        info.CFBundleIdentifier,
      );
    }
  }

  return [...installedByBundleId.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function resolveMacosAppByBundleId(bundleId) {
  for (const appPath of mdfindAppsForBundleId(bundleId)) {
    if (!fs.existsSync(appPath)) continue;

    const info = readBundleInfo(appPath);
    if (info.CFBundleIdentifier && info.CFBundleIdentifier !== bundleId)
      continue;

    return {
      name:
        info.CFBundleName ||
        info.CFBundleDisplayName ||
        path.basename(appPath, ".app"),
      bundle_id: bundleId,
      path: appPath,
      version: info.CFBundleShortVersionString || info.CFBundleVersion || null,
    };
  }

  return null;
}

export function findCommandBrowsers() {
  const found = new Map();

  for (const browser of BROWSER_TARGETS) {
    for (const command of browser.commands) {
      const executable = commandPath(command);
      if (!executable) continue;

      found.set(browser.name, {
        id: browser.id,
        name: browser.name,
        command,
        path: executable,
        bundle_id: browser.bundleIds[0] || null,
        version: null,
      });
      break;
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function findWindowsApps() {
  const found = new Map();

  for (const browser of BROWSER_TARGETS) {
    const version = windowsBrowserVersion(browser);
    for (const executablePath of windowsBrowserInstallPaths(browser)) {
      if (
        path.basename(executablePath).toLowerCase() !==
        browser.windowsExecutable
      )
        continue;

      found.set(executablePath.toLowerCase(), {
        id: browser.id,
        name: browser.name,
        command: browser.windowsCommand,
        path: executablePath,
        bundle_id: null,
        version,
      });
    }
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function loadLaunchServicesHandlers() {
  const plistPath = path.join(
    os.homedir(),
    "Library",
    "Preferences",
    "com.apple.LaunchServices",
    "com.apple.launchservices.secure.plist",
  );

  if (!fs.existsSync(plistPath)) return [];

  const output = runCommand([
    "plutil",
    "-extract",
    "LSHandlers",
    "json",
    "-o",
    "-",
    plistPath,
  ]);
  if (!output) return [];

  try {
    const handlers = JSON.parse(output);
    return Array.isArray(handlers) ? handlers : [];
  } catch {
    return [];
  }
}

export function findDefaultBrowserMacos(installed) {
  const byBundleId = new Map(
    installed
      .filter((item) => item.bundle_id)
      .map((item) => [item.bundle_id, item]),
  );
  const knownByBundleId = knownBrowserByBundleId();
  const schemes = {};

  for (const handler of loadLaunchServicesHandlers()) {
    const scheme = handler.LSHandlerURLScheme;
    if (scheme !== "http" && scheme !== "https") continue;

    const bundleId = handler.LSHandlerRoleAll || handler.LSHandlerRoleViewer;
    if (!bundleId) continue;

    const installedMatch = byBundleId.get(bundleId);
    const knownMatch = knownByBundleId.get(bundleId);
    const resolvedMatch =
      installedMatch ||
      (knownMatch ? null : resolveMacosAppByBundleId(bundleId));
    schemes[scheme] = {
      scheme,
      bundle_id: bundleId,
      name:
        installedMatch?.name || knownMatch?.name || resolvedMatch?.name || null,
      path: installedMatch?.path || resolvedMatch?.path || null,
      version: installedMatch?.version || resolvedMatch?.version || null,
    };
  }

  return { source: "LaunchServices", schemes };
}

export function findDefaultBrowserLinux() {
  return {
    source: "xdg-settings",
    desktop_file: runCommand(["xdg-settings", "get", "default-web-browser"]),
  };
}

export function browserForWindowsProgId(progId) {
  if (!progId) return null;

  const normalized = progId.toLowerCase();
  return (
    BROWSER_TARGETS.find((browser) =>
      browser.windowsProgIdPrefixes.some((prefix) =>
        normalized.startsWith(prefix),
      ),
    ) ||
    (normalized.includes("edge")
      ? BROWSER_TARGETS.find((browser) => browser.id === "edge")
      : null)
  );
}

export function findDefaultBrowserWindows() {
  const schemes = {};

  for (const scheme of ["http", "https"]) {
    const keyPath = `HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${scheme}\\UserChoice`;
    const progId = readWindowsRegistryValue(keyPath, "ProgId");
    if (!progId) continue;

    const browser = browserForWindowsProgId(progId);
    schemes[scheme] = {
      scheme,
      prog_id: progId,
      name: browser?.name || null,
      browser: browser?.id || null,
    };
  }

  return { source: "registry", schemes };
}

export function collectBrowserInventory() {
  let installed;
  let defaultBrowser;

  if (process.platform === "darwin") {
    installed = findMacosApps();
    defaultBrowser = findDefaultBrowserMacos(installed);
  } else if (process.platform === "linux") {
    installed = findCommandBrowsers();
    defaultBrowser = findDefaultBrowserLinux();
  } else if (process.platform === "win32") {
    installed = findWindowsApps();
    defaultBrowser = findDefaultBrowserWindows();
  } else {
    installed = findCommandBrowsers();
    defaultBrowser = { source: "unsupported", platform: process.platform };
  }

  return {
    platform: process.platform,
    default_browser: defaultBrowser,
    installed_browsers: installed,
  };
}

export function findMacosBrowserAppPath(browser) {
  for (const appPath of macosAppCandidates(browser)) {
    if (isMacosBrowserApp(browser, appPath, true)) return appPath;
  }

  for (const bundleId of browser.bundleIds) {
    for (const appPath of mdfindAppsForBundleId(bundleId)) {
      if (isMacosBrowserApp(browser, appPath)) return appPath;
    }
  }

  for (const baseDir of macosAppSearchDirs()) {
    if (!fs.existsSync(baseDir)) continue;

    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.endsWith(".app")) continue;

      const appPath = path.join(baseDir, entry.name);
      if (isMacosBrowserApp(browser, appPath)) return appPath;
    }
  }

  throw new Error(`Could not find the ${browser.name} app.`);
}

export function isMacosBrowserApp(browser, appPath, allowNamedFallback = false) {
  if (!fs.existsSync(appPath)) return false;

  const info = readBundleInfo(appPath);
  if (browser.bundleIds.includes(info.CFBundleIdentifier)) return true;

  return allowNamedFallback && browser.appNames.includes(path.basename(appPath));
}

export function findWindowsBrowserExecutable(browser) {
  for (const executablePath of windowsBrowserInstallPaths(browser)) {
    if (path.basename(executablePath).toLowerCase() === browser.windowsExecutable)
      return executablePath;
  }

  throw new Error(`Could not find the ${browser.name} executable.`);
}

export function getOpenBrowserCommand(browser, profileDirectory) {
  const browserArgs = [
    `--profile-directory=${profileDirectory}`,
    "--new-window",
    ABOUT_BLANK_URL,
  ];

  if (process.platform === "darwin") {
    return {
      command: "open",
      args: [
        "-n",
        "-a",
        findMacosBrowserAppPath(browser),
        "--args",
        ...browserArgs,
      ],
    };
  }

  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        "start",
        '""',
        findWindowsBrowserExecutable(browser),
        ...browserArgs,
      ],
    };
  }

  return {
    command: commandPath(browser.commands[0]) || browser.commands[0],
    args: browserArgs,
  };
}

export function chooseBrowserForOpen(targets, extensionId) {
  const statuses = targets.map((browser) =>
    getBrowserExtensionInstallStatus(browser, extensionId),
  );
  const enabledStatus = statuses.find((status) => status.enabled);
  const installedStatus = statuses.find((status) => status.installed);
  const preferredStatus = enabledStatus || installedStatus;
  if (preferredStatus) {
    const browser = getBrowserById(preferredStatus.browser);
    if (browser) return { browser, status: preferredStatus, statuses };
  }

  for (const browser of targets) {
    try {
      const preferencesPath = resolveBrowserPreferencesPath(browser);
      const profilePath = path.dirname(preferencesPath);
      const command = getOpenBrowserCommand(browser, path.basename(profilePath));
      return {
        browser,
        status: {
          browser: browser.id,
          browserName: browser.name,
          preferencesPath,
          profilePath,
          enabled: false,
          installed: false,
        },
        statuses,
        command,
      };
    } catch {
      // Try the next supported browser.
    }
  }

  throw new Error(
    `Could not find a usable profile in ${targets
      .map((browser) => browser.name)
      .join(" or ")}.`,
  );
}

export function nativeHostManifestOverride(browser, env = process.env) {
  const specific = env[`CODEX_${browser.envKey}_NATIVE_HOST_MANIFEST_PATH`];
  if (specific) return specific;

  if (browser.id === "chrome") {
    const legacy = env[CHROME_NATIVE_HOST_MANIFEST_PATH_ENV];
    if (legacy) return legacy;
  }

  return env[BROWSER_NATIVE_HOST_MANIFEST_PATH_ENV] || null;
}

export function getDefaultWindowsManifestPath(expectedHostName) {
  return path.join(
    os.homedir(),
    "AppData",
    "Local",
    "OpenAI",
    "extension",
    `${expectedHostName}.json`,
  );
}

export function getNativeHostManifestLocation(browser, expectedHostName) {
  const override = nativeHostManifestOverride(browser);
  if (override) {
    return {
      browser: browser.id,
      browserName: browser.name,
      manifestPath: path.resolve(override),
      registryKey: null,
      registryManifestPath: null,
      registryKeyExists: null,
    };
  }

  if (process.platform === "darwin") {
    return {
      browser: browser.id,
      browserName: browser.name,
      manifestPath: path.join(
        os.homedir(),
        ...browser.nativeHostDirectoryParts.darwin,
        `${expectedHostName}.json`,
      ),
      registryKey: null,
      registryManifestPath: null,
      registryKeyExists: null,
    };
  }

  if (process.platform === "linux") {
    return {
      browser: browser.id,
      browserName: browser.name,
      manifestPath: path.join(
        os.homedir(),
        ...browser.nativeHostDirectoryParts.linux,
        `${expectedHostName}.json`,
      ),
      registryKey: null,
      registryManifestPath: null,
      registryKeyExists: null,
    };
  }

  if (process.platform === "win32") {
    const registryKey = `${browser.nativeHostRegistryKeyPrefix}\\${expectedHostName}`;
    const registryManifestPath = readWindowsRegistryValue(registryKey, null);

    return {
      browser: browser.id,
      browserName: browser.name,
      manifestPath: registryManifestPath || getDefaultWindowsManifestPath(expectedHostName),
      registryKey,
      registryManifestPath,
      registryKeyExists: registryManifestPath != null,
    };
  }

  throw new Error(
    `Unsupported platform for native host manifest check: ${process.platform}.`,
  );
}

export function getNativeHostManifestStatus(
  browser,
  expectedHostName,
  expectedExtensionId,
) {
  try {
    const location = getNativeHostManifestLocation(browser, expectedHostName);
    const expectedOrigin = `chrome-extension://${expectedExtensionId}/`;
    const exists = fs.existsSync(location.manifestPath);
    const locationProblem = getNativeHostManifestLocationProblem(
      location,
      exists,
    );

    if (locationProblem) {
      return {
        ...location,
        expectedHostName,
        expectedExtensionId,
        expectedOrigin,
        exists,
        correct: false,
        problem: locationProblem,
      };
    }

    const manifest = readJsonFile(location.manifestPath);
    const allowedOrigins = Array.isArray(manifest.allowed_origins)
      ? manifest.allowed_origins
      : [];
    const nameMatches = manifest.name === expectedHostName;
    const hasExpectedOrigin = allowedOrigins.includes(expectedOrigin);
    const registryMatchesManifestPath =
      location.registryManifestPath == null ||
      path.resolve(location.registryManifestPath) ===
        path.resolve(location.manifestPath);
    const correct =
      nameMatches && hasExpectedOrigin && registryMatchesManifestPath;

    return {
      ...location,
      expectedHostName,
      actualHostName: manifest.name,
      expectedExtensionId,
      expectedOrigin,
      allowedOrigins,
      exists,
      nameMatches,
      hasExpectedOrigin,
      registryMatchesManifestPath,
      correct,
      problem: correct
        ? null
        : describeManifestProblem({
            expectedHostName,
            expectedExtensionId,
            nameMatches,
            hasExpectedOrigin,
            registryMatchesManifestPath,
          }),
    };
  } catch (error) {
    return {
      browser: browser.id,
      browserName: browser.name,
      manifestPath: null,
      registryKey: null,
      registryManifestPath: null,
      expectedHostName,
      expectedExtensionId,
      expectedOrigin: `chrome-extension://${expectedExtensionId}/`,
      exists: false,
      correct: false,
      problem: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getNativeHostManifestLocationProblem(location, manifestExists) {
  const problems = [];

  if (location.registryKeyExists === false) {
    problems.push(
      `Windows native host registry key does not exist: ${location.registryKey}`,
    );
  }

  if (!manifestExists) {
    problems.push(
      `Native host manifest does not exist: ${location.manifestPath}`,
    );
  }

  return problems.length > 0 ? problems.join("; ") : null;
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function describeManifestProblem({
  expectedHostName,
  expectedExtensionId,
  nameMatches,
  hasExpectedOrigin,
  registryMatchesManifestPath,
}) {
  const problems = [];
  if (!nameMatches)
    problems.push(`manifest name does not match ${expectedHostName}`);
  if (!hasExpectedOrigin) {
    problems.push(
      `allowed_origins does not include chrome-extension://${expectedExtensionId}/`,
    );
  }
  if (!registryMatchesManifestPath) {
    problems.push(
      "registry manifest path does not match checked manifest path",
    );
  }

  return problems.join("; ");
}

export function buildNativeHostManifestResult(statuses) {
  const selected =
    statuses.find((status) => status.correct) || statuses[0] || null;
  return {
    ...(selected || {}),
    platform: process.platform,
    selectedBrowser: selected?.browser || null,
    correct: statuses.some((status) => status.correct),
    browsers: statuses,
  };
}

export function findRunningBrowserProcesses(targets = BROWSER_TARGETS) {
  if (process.platform === "win32") return findRunningWindowsBrowserProcesses(targets);

  const singletonProcesses =
    process.platform === "darwin"
      ? targets
          .map((browser) => getMacosBrowserSingletonProcess(browser))
          .filter(Boolean)
      : [];

  let processList;
  try {
    processList = runProcessCommand("ps", ["-A", "-o", "pid=", "-o", "comm="]);
  } catch (error) {
    if (singletonProcesses.length > 0) return singletonProcesses;
    throw error;
  }

  const processes = parseProcessList(processList, targets);
  if (processes.length > 0 || process.platform !== "darwin")
    return processes;

  try {
    const applicationProcesses = parseProcessList(
      runProcessCommand("ps", ["-A", "-ww", "-o", "pid=", "-o", "command="]),
      targets,
    ).filter((browserProcess) => {
      const browser = getBrowserById(browserProcess.browser);
      return browser
        ? browserProcess.command.includes(browser.macosAppPathFragment)
        : false;
    });
    return applicationProcesses.length > 0
      ? applicationProcesses
      : singletonProcesses;
  } catch (error) {
    if (singletonProcesses.length > 0) return singletonProcesses;
    throw error;
  }
}

export function runProcessCommand(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error(formatCommandError(command, args, error), { cause: error });
  }
}

export function formatCommandError(command, args, error) {
  const commandDisplay = [command, ...args].join(" ");
  const details = [
    error?.code,
    typeof error?.status === "number" ? `exit ${error.status}` : null,
    error?.stderr?.toString().trim(),
    error?.message,
  ].filter(Boolean);
  return `Failed to run ${commandDisplay}: ${details.join("; ")}`;
}

export function stripCommandArguments(command) {
  return command.trim().replace(/\s--.*$/, "");
}

export function processNameForCommand(command) {
  const executable = stripCommandArguments(command);
  return path.basename(executable);
}

export function parseProcessList(output, targets) {
  if (!output) return [];

  const processes = [];
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
    if (!match) continue;

    const [, pid, command] = match;
    const processName = processNameForCommand(command);
    const browser = browserForProcessName(processName, targets);
    if (!browser) continue;

    processes.push({
      browser: browser.id,
      browserName: browser.name,
      pid: Number(pid),
      process_name: processName,
      command: stripCommandArguments(command),
    });
  }

  return processes;
}

export function browserForProcessName(processName, targets) {
  const normalized = processName.toLowerCase();
  return (
    targets.find((browser) =>
      (browser.processNames[process.platform] || browser.processNames.linux)
        .map((name) => name.toLowerCase())
        .includes(normalized),
    ) || null
  );
}

export function findRunningWindowsBrowserProcesses(targets) {
  const output = runProcessCommand("tasklist", ["/fo", "csv", "/nh"]);
  const executableToBrowser = new Map(
    targets.map((browser) => [
      browser.windowsExecutable.toLowerCase(),
      browser,
    ]),
  );
  const processes = [];

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^"([^"]+)","(\d+)",/);
    if (!match) continue;

    const imageName = match[1].toLowerCase();
    const browser = executableToBrowser.get(imageName);
    if (!browser) continue;

    processes.push({
      browser: browser.id,
      browserName: browser.name,
      pid: Number(match[2]),
      process_name: match[1],
      command: match[1],
    });
  }

  return processes;
}

export function getMacosBrowserSingletonProcess(browser) {
  if (!process.env.HOME) return null;

  let singletonLockTarget;
  try {
    singletonLockTarget = fs.readlinkSync(
      path.join(
        process.env.HOME,
        ...browser.userDataDirectoryParts.darwin,
        "SingletonLock",
      ),
      "utf8",
    );
  } catch {
    return null;
  }

  const pidMatch = singletonLockTarget.match(/-(\d+)$/);
  if (!pidMatch) return null;

  const pid = Number(pidMatch[1]);
  if (!Number.isInteger(pid) || pid <= 0) return null;

  try {
    process.kill(pid, 0);
  } catch (error) {
    if (error?.code !== "EPERM") return null;
  }

  return {
    browser: browser.id,
    browserName: browser.name,
    pid,
    process_name: browser.name,
    command: browser.name,
  };
}
