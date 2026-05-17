import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const extensionConfig = {
  extensionId: "hehggadaopoacecdllhhajmbjkdcmajg",
  extensionHostName: "com.openai.codexextension",
};

const browserTargets = [
  {
    id: "chrome",
    nativeHostDirectories: {
      darwin: [
        "Library",
        "Application Support",
        "Google",
        "Chrome",
        "NativeMessagingHosts",
      ],
      linux: [".config", "google-chrome", "NativeMessagingHosts"],
    },
    windowsRegistryKeyPrefix:
      "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts",
  },
  {
    id: "edge",
    nativeHostDirectories: {
      darwin: [
        "Library",
        "Application Support",
        "Microsoft Edge",
        "NativeMessagingHosts",
      ],
      linux: [".config", "microsoft-edge", "NativeMessagingHosts"],
    },
    windowsRegistryKeyPrefix:
      "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts",
  },
];

const platformDirectoryNames = {
  darwin: "macos",
  win32: "windows",
  linux: "linux",
};

function extensionHostPath(pluginRoot) {
  const architecture = os.arch();
  const platformDirectory = platformDirectoryNames[os.platform()];
  const binaryName =
    platformDirectory === "windows" ? "extension-host.exe" : "extension-host";
  if (
    !platformDirectory ||
    (architecture !== "arm64" && architecture !== "x64")
  ) {
    throw new Error(
      `Invalid platform or architecture: ${os.platform()} ${architecture}`,
    );
  }

  return path.resolve(
    pluginRoot,
    "extension-host",
    platformDirectory,
    architecture,
    binaryName,
  );
}

async function checkExtensionHostBinary(pluginRoot) {
  const hostPath = extensionHostPath(pluginRoot);
  if (!existsSync(hostPath)) {
    throw new Error(
      `Missing bundled Browser Use extension host binary at ${hostPath}.`,
    );
  }
}

function nativeHostManifest(pluginRoot, config) {
  return {
    name: config.extensionHostName,
    description: "Codex browser native messaging host",
    type: "stdio",
    path: extensionHostPath(pluginRoot),
    allowed_origins: [`chrome-extension://${config.extensionId}/`],
  };
}

function nativeHostManifestPaths(config) {
  const manifestFileName = `${config.extensionHostName}.json`;
  if (os.platform() === "win32") {
    return [
      path.resolve(
        os.homedir(),
        "AppData",
        "Local",
        "OpenAI",
        "extension",
        manifestFileName,
      ),
    ];
  }

  const platform = os.platform();
  const paths = browserTargets
    .map((browser) => browser.nativeHostDirectories[platform])
    .filter(Boolean)
    .map((parts) => path.resolve(os.homedir(), ...parts, manifestFileName));
  if (paths.length === 0) throw new Error(`Unsupported platform: ${platform}`);

  return paths;
}

async function writeNativeHostManifests(pluginRoot, config) {
  const manifest = JSON.stringify(nativeHostManifest(pluginRoot, config));
  await Promise.all(
    nativeHostManifestPaths(config).map(async (manifestPath) => {
      await mkdir(path.dirname(manifestPath), { recursive: true });
      await writeFile(manifestPath, manifest);
    }),
  );
}

async function registerWindowsNativeHosts(config) {
  if (os.platform() !== "win32") return;

  const manifestPath = nativeHostManifestPaths(config)[0];
  if (!manifestPath) throw new Error("Invalid Windows manifest path returned.");

  await Promise.all(
    browserTargets.map((browser) => {
      const registryKey = `${browser.windowsRegistryKeyPrefix}\\${config.extensionHostName}`;
      return execFileAsync("reg", [
        "add",
        registryKey,
        "/ve",
        "/t",
        "REG_SZ",
        "/d",
        manifestPath,
        "/f",
      ]);
    }),
  );
}

function cacheRootToLatest(pluginRoot) {
  const parts = path.resolve(pluginRoot).split(path.sep);
  const cacheIndex = parts.lastIndexOf("cache");
  if (
    cacheIndex < 1 ||
    parts[cacheIndex - 1] !== "plugins" ||
    parts.length <= cacheIndex + 3
  ) {
    return pluginRoot;
  }

  return path.resolve(pluginRoot, "..", "latest");
}

async function install() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const pluginRoot = cacheRootToLatest(path.resolve(scriptDir, ".."));
  await checkExtensionHostBinary(pluginRoot);
  await writeNativeHostManifests(pluginRoot, extensionConfig);
  await registerWindowsNativeHosts(extensionConfig);
}

export { install };
