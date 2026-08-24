#!/usr/bin/env node

/**
 * push-preset.js
 *
 * Pushes the app store whitelist preset to a connected Android device via adb.
 * Reads the HMA-OSS config.json, merges the whitelist template, and writes it back.
 *
 * Usage:
 *   node push-preset.js [--template "Template Name"] [--scope "com.target.app"] [--all]
 *
 * Options:
 *   --template  Name of the template to create/update (default: "App Store Whitelist")
 *   --scope     Apply to specific target app package (can be repeated)
 *   --all       Apply to all apps in scope (set defaultConfig)
 *   --reset     Remove existing whitelist template before applying
 *   --dry-run   Print commands without executing
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const PRESET_FILE = path.join(__dirname, "output", "appstore_whitelist_preset.json");

const HMA_DATA_DIR = "/data/misc";
const HMA_CONFIG_PATTERN = "hide_my_applist_*";
const DEVICE_CONFIG_PATH = `/data/misc/${HMA_CONFIG_PATTERN}/config.json`;

const args = process.argv.slice(2);

function getArg(name, defaultValue) {
  const idx = args.indexOf(name);
  if (idx === -1) return defaultValue;
  return args[idx + 1] || defaultValue;
}

function hasFlag(name) {
  return args.includes(name);
}

function adbShell(cmd) {
  try {
    return execSync(`adb shell "${cmd}"`, { encoding: "utf-8" }).trim();
  } catch (err) {
    console.error(`adb shell failed: ${cmd}`);
    console.error(err.message);
    return null;
  }
}

function adbPush(localPath, remotePath) {
  try {
    execSync(`adb push "${localPath}" "${remotePath}"`, { stdio: "inherit" });
    return true;
  } catch (err) {
    console.error(`adb push failed: ${localPath} -> ${remotePath}`);
    return false;
  }
}

function findConfigPath() {
  // Try to find the HMA-OSS config directory
  const dirs = adbShell(`ls ${HMA_DATA_DIR}/ | grep hide_my_applist`);
  if (!dirs) {
    console.error("HMA-OSS data directory not found on device.");
    console.error("Make sure HMA-OSS is installed and has been run at least once.");
    process.exit(1);
  }

  const firstDir = dirs.split("\n")[0];
  return `${HMA_DATA_DIR}/${firstDir}/config.json`;
}

function readDeviceConfig(configPath) {
  const tmpPath = path.join(__dirname, "device_config_tmp.json");

  try {
    execSync(`adb pull "${configPath}" "${tmpPath}"`, { stdio: "inherit" });
    const content = fs.readFileSync(tmpPath, "utf-8");
    fs.unlinkSync(tmpPath);
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to read config from device: ${err.message}`);
    return null;
  }
}

function writeDeviceConfig(configPath, config) {
  const tmpPath = path.join(__dirname, "device_config_push.json");
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2));

  // Get directory permissions before push
  const dirPath = configPath.replace("/config.json", "");
  const perms = adbShell(`stat -c '%a' ${dirPath}`);
  const owner = adbShell(`stat -c '%u:%g' ${dirPath}`);

  const success = adbPush(tmpPath, configPath);
  fs.unlinkSync(tmpPath);

  if (success && perms) {
    adbShell(`chmod ${perms} ${configPath}`);
    if (owner) {
      adbShell(`chown ${owner} ${configPath}`);
    }
  }

  return success;
}

function main() {
  const templateName = getArg("--template", "App Store Whitelist");
  const dryRun = hasFlag("--dry-run");
  const applyAll = hasFlag("--all");
  const reset = hasFlag("--reset");

  // Collect --scope arguments
  const scopes = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--scope" && args[i + 1]) {
      scopes.push(args[i + 1]);
    }
  }

  // Read preset file
  if (!fs.existsSync(PRESET_FILE)) {
    console.error(`Preset file not found: ${PRESET_FILE}`);
    console.error("Run 'npm run all' first to generate the preset.");
    process.exit(1);
  }

  console.log("Reading preset file...");
  const preset = JSON.parse(fs.readFileSync(PRESET_FILE, "utf-8"));
  const appList = preset.template.appList;

  console.log(`Preset contains ${appList.length} packages`);

  if (dryRun) {
    console.log("\n[DRY RUN] Commands that would be executed:");
    console.log(`  adb pull device config`);
    console.log(
      `  Add template "${templateName}" with ${appList.length} packages`
    );
    if (scopes.length > 0) {
      for (const scope of scopes) {
        console.log(`  Apply template to scope: ${scope}`);
      }
    }
    if (applyAll) {
      console.log(`  Apply to defaultConfig for all new apps`);
    }
    return;
  }

  // Check adb connection
  const devices = adbShell("devices");
  if (!devices || devices.split("\n").length <= 1) {
    console.error("No Android device connected. Connect via USB or adb WiFi.");
    process.exit(1);
  }

  // Find and read config
  const configPath = findConfigPath();
  console.log(`Config path: ${configPath}`);

  const config = readDeviceConfig(configPath);
  if (!config) {
    console.error("Failed to read config. Creating new one...");
    config = {
      configVersion: 93,
      detailLog: false,
      errorOnlyLog: false,
      maxLogSize: 512,
      forceMountData: true,
      disableActivityLaunchProtection: false,
      altAppDataIsolation: false,
      altVoldAppDataIsolation: false,
      skipSystemAppDataIsolation: true,
      packageQueryWorkaround: false,
      webViewProtection: true,
      defaultConfig: null,
      ignoredPackagesForPresets: [],
      templates: {},
      settingsTemplates: {},
      disabledHooks: [],
      scope: {},
    };
  }

  // Initialize templates if missing
  if (!config.templates) config.templates = {};
  if (!config.scope) config.scope = {};

  // Remove existing template if reset
  if (reset && config.templates[templateName]) {
    delete config.templates[templateName];
    console.log(`Removed existing template: ${templateName}`);
  }

  // Add/update the whitelist template
  config.templates[templateName] = {
    isWhitelist: true,
    appList: appList,
  };

  console.log(
    `Template "${templateName}" set with ${appList.length} packages (whitelist mode)`
  );

  // Apply to specified scopes
  if (scopes.length > 0) {
    for (const scope of scopes) {
      if (!config.scope[scope]) {
        config.scope[scope] = {
          useWhitelist: false,
          excludeSystemApps: true,
          hideInstallationSource: false,
          hideSystemInstallationSource: false,
          excludeTargetInstallationSource: false,
          invertActivityLaunchProtection: false,
          excludeVoldIsolation: false,
          restrictedZygotePermissions: [],
          applyTemplates: [],
          applyPresets: [],
          applySettingTemplates: [],
          applySettingsPresets: [],
          extraAppList: [],
          extraOppositeAppList: [],
        };
      }

      const appConfig = config.scope[scope];
      if (!appConfig.applyTemplates) appConfig.applyTemplates = [];
      if (!appConfig.applyTemplates.includes(templateName)) {
        appConfig.applyTemplates.push(templateName);
      }

      // Set whitelist mode
      appConfig.useWhitelist = true;

      console.log(`Applied template to scope: ${scope}`);
    }
  }

  // Apply to default config if --all
  if (applyAll) {
    if (!config.defaultConfig) {
      config.defaultConfig = {
        useWhitelist: false,
        excludeSystemApps: true,
        hideInstallationSource: false,
        hideSystemInstallationSource: false,
        excludeTargetInstallationSource: false,
        invertActivityLaunchProtection: false,
        excludeVoldIsolation: false,
        restrictedZygotePermissions: [],
        applyTemplates: [],
        applyPresets: [],
        applySettingTemplates: [],
        applySettingsPresets: [],
        extraAppList: [],
        extraOppositeAppList: [],
      };
    }

    if (!config.defaultConfig.applyTemplates) {
      config.defaultConfig.applyTemplates = [];
    }
    if (!config.defaultConfig.applyTemplates.includes(templateName)) {
      config.defaultConfig.applyTemplates.push(templateName);
    }

    console.log("Applied template to defaultConfig (all new apps)");
  }

  // Write config back
  console.log("Writing config to device...");
  if (writeDeviceConfig(configPath, config)) {
    console.log("Done! Config updated successfully.");
    console.log(
      "Note: You may need to force-stop and reopen HMA-OSS for changes to take effect."
    );
  } else {
    console.error("Failed to write config to device.");
    process.exit(1);
  }
}

main();
