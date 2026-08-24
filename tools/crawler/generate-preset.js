import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const RAW_FILE = path.join(__dirname, "raw_packages.json");
const OUTPUT_DIR = path.join(__dirname, "output");
const PRESET_FILE = path.join(OUTPUT_DIR, "appstore_whitelist_preset.json");
const IMPORT_FILE = path.join(OUTPUT_DIR, "hma_oss_import.json");
const PACKAGE_LIST_FILE = path.join(OUTPUT_DIR, "appstore_packages.json");

const COMMON_PACKAGES = [
  // Android system
  "android",
  "com.android.systemui",
  "com.android.settings",
  "com.android.providers.media",
  "com.android.providers.downloads",
  "com.android.providers.telephony",
  "com.android.providers.contacts",
  "com.android.providers.calendar",
  "com.android.providers.downloads.ui",
  "com.android.providers.userdictionary",
  "com.android.phone",
  "com.android.server.telecom",
  "com.android.packageinstaller",
  "com.android.storagemanager",
  "com.android.permissioncontroller",
  "com.android.traceur",
  "com.android.bluetooth",
  "com.android.nfc",
  "com.android.ons",
  "com.android.se",
  "com.android.hotspot2.osulolauncher",
  "com.android.wifi.resources",
  "com.android.internal.systemui.navbar.gestural",
  "com.android.internal.systemui.navbar.gestural_wide_back",
  "com.android.internal.systemui.navbar.gestural_extra_wide_back",
  "com.android.internal.systemui.navbar.threebutton",
  "com.android.internal.systemui.navbar.twobutton",
  // Google core (always present on GMS devices)
  "com.google.android.gms",
  "com.google.android.gms.tasks",
  "com.google.android.gms.auth",
  "com.google.android.gms.ads",
  "com.google.android.gms.games",
  "com.google.android.gms.fitness",
  "com.google.android.gms.location",
  "com.google.android.gms.nearby",
  "com.google.android.gms.security",
  "com.google.android.gms.vision",
  "com.google.android.gms.wallet",
  "com.google.android.gms.wearable",
  "com.google.android.gsf",
  "com.google.android.gsf.login",
  "com.google.android.apps.topsks",
  "com.google.android.apps.messaging",
  "com.android.vending",
  "com.google.android.packageinstaller",
  "com.google.android.permissioncontroller",
  "com.google.android.ext.services",
  "com.google.android.webview",
  "com.google.android.trichromelibrary",
  "com.google.android.tag",
  "com.google.android.cellbroadcastreceiver",
  "com.google.android.cellbroadcastreceiver.module",
  "com.google.android.dialer",
  "com.google.android.contacts",
  "com.google.android.apps.messaging",
  "com.google.android.apps.nexuslauncher",
  "com.google.android.apps.wallpaper",
  "com.google.android.apps.photos",
  "com.google.android.apps.maps",
  "com.google.android.apps.youtube",
  "com.google.android.apps.youtube.music",
  "com.google.android.gm",
  "com.google.android.apps.docs",
  "com.google.android.appsheets",
  "com.google.android.apps.slides",
  "com.google.android.keep",
  "com.google.android.apps.nbu.files",
  "com.google.android.apps.chromecast.app",
  "com.google.android.apps.walletnfcrel",
  "com.google.android.apps.cloudprint",
  "com.google.android.apps.tachyon",
  "com.google.android.apps.safetyhub",
  "com.google.android.apps.pixelmigrate",
  "com.google.android.apps.restore",
  "com.google.android.apps.translate",
  "com.google.android.inputmethod.latin",
  "com.google.android.marvin.talkback",
  "com.google.android.tts",
  "com.google.android.apps.nexuslauncher",
  "com.google.android.calendar",
  "com.google.android.apps.wellbeing",
  "com.google.android.apps.digitalwellbeing",
  "com.google.android.apps.accessibility.funhouse",
  "com.google.android.apps.kids.familylink",
  "com.google.android.apps.kids.familylink.mainactivity",
  // Chrome
  "com.android.chrome",
  "com.chrome.canary",
  "com.chrome.dev",
  "com.chrome.beta",
  "com.google.android.apps.chrome",
  // Android WebView providers
  "com.android.webview",
  "org.chromium.webview_shell",
  "org.chromium.arc",
  "org.chromium.arc_obb",
  // Input methods
  "com.google.android.inputmethod.latin",
  "com.samsung.android.honeyboard",
  "com.sec.android.app.sbrowser",
  // Default launchers
  "com.google.android.apps.nexuslauncher",
  "com.sec.android.app.launcher",
  "com.miui.home",
  "com.huawei.android.launcher",
  "com.android.launcher",
  "com.android.launcher2",
  "com.android.launcher3",
  "com.android.launcher3.quickstep",
];

function categorizePackages(packages) {
  const categories = {
    system: [],
    google: [],
    social: [],
    messaging: [],
    productivity: [],
    finance: [],
    shopping: [],
    entertainment: [],
    gaming: [],
    tools: [],
    navigation: [],
    health: [],
    education: [],
    photography: [],
    music: [],
    other: [],
  };

  const SYSTEM_PREFIXES = [
    "android.",
    "com.android.",
    "com.google.android.gms",
    "com.google.android.gsf",
  ];
  const GOOGLE_PREFIXES = ["com.google."];
  const SOCIAL_KEYWORDS = [
    "facebook",
    "instagram",
    "twitter",
    "tiktok",
    "snapchat",
    "reddit",
    "linkedin",
    "pinterest",
    "discord",
    "telegram",
    "whatsapp",
    "viber",
    "line",
    "kakao",
    "wechat",
    "qq",
  ];
  const MESSAGING_KEYWORDS = [
    "messaging",
    "sms",
    "messenger",
    "chat",
    "orca",
  ];
  const FINANCE_KEYWORDS = [
    "pay",
    "bank",
    "wallet",
    "venmo",
    "cash",
    "zelle",
    "crypto",
    "coin",
    "trade",
    "invest",
  ];
  const SHOPPING_KEYWORDS = [
    "shop",
    "amazon",
    "ebay",
    "target",
    "walmart",
    "store",
    "market",
    "buy",
    "order",
    "deliver",
    "lyft",
    "uber",
  ];
  const ENTERTAINMENT_KEYWORDS = [
    "video",
    "movie",
    "tv",
    "stream",
    "netflix",
    "youtube",
    "disney",
    "hulu",
    "twitch",
    "player",
    "media",
  ];
  const GAMING_KEYWORDS = [
    "game",
    "play",
    "clash",
    "royale",
    "battle",
    "minecraft",
    "fortnite",
    "pubg",
  ];
  const TOOLS_KEYWORDS = [
    "file",
    "manager",
    "browser",
    "vpn",
    "cleaner",
    "battery",
    "wifi",
    "bluetooth",
    "calculator",
    "calendar",
    "clock",
    "weather",
    "compass",
    "flashlight",
    "scanner",
    "pdf",
    "zip",
    "archive",
    "editor",
    "viewer",
  ];
  const NAV_KEYWORDS = [
    "map",
    "nav",
    "waze",
    "location",
    "gps",
    "direction",
  ];
  const HEALTH_KEYWORDS = [
    "health",
    "fitness",
    "workout",
    "run",
    "sport",
    "exercise",
    "sleep",
    "meditat",
    "calm",
    "headspace",
    "heart",
    "step",
    "track",
  ];
  const EDUCATION_KEYWORDS = [
    "learn",
    "edu",
    "course",
    "study",
    "school",
    "university",
    "language",
    "duolingo",
    "khan",
    "quizlet",
    "notion",
    "note",
    "todo",
    "task",
  ];
  const PHOTO_KEYWORDS = [
    "photo",
    "camera",
    "gallery",
    "image",
    "selfie",
    "portrait",
    "edit",
    "filter",
    "snapseed",
    "lightroom",
    "vsco",
  ];
  const MUSIC_KEYWORDS = [
    "music",
    "song",
    "audio",
    "spotify",
    "soundcloud",
    "shazam",
    "pandora",
    "tidal",
    "iheartradio",
    "deezer",
  ];

  for (const pkg of packages) {
    const lower = pkg.toLowerCase();

    if (SYSTEM_PREFIXES.some((p) => lower.startsWith(p))) {
      categories.system.push(pkg);
    } else if (
      GOOGLE_PREFIXES.some((p) => lower.startsWith(p)) ||
      lower === "com.android.vending"
    ) {
      categories.google.push(pkg);
    } else if (SOCIAL_KEYWORDS.some((k) => lower.includes(k))) {
      categories.social.push(pkg);
    } else if (MESSAGING_KEYWORDS.some((k) => lower.includes(k))) {
      categories.messaging.push(pkg);
    } else if (FINANCE_KEYWORDS.some((k) => lower.includes(k))) {
      categories.finance.push(pkg);
    } else if (SHOPPING_KEYWORDS.some((k) => lower.includes(k))) {
      categories.shopping.push(pkg);
    } else if (ENTERTAINMENT_KEYWORDS.some((k) => lower.includes(k))) {
      categories.entertainment.push(pkg);
    } else if (GAMING_KEYWORDS.some((k) => lower.includes(k))) {
      categories.gaming.push(pkg);
    } else if (TOOLS_KEYWORDS.some((k) => lower.includes(k))) {
      categories.tools.push(pkg);
    } else if (NAV_KEYWORDS.some((k) => lower.includes(k))) {
      categories.navigation.push(pkg);
    } else if (HEALTH_KEYWORDS.some((k) => lower.includes(k))) {
      categories.health.push(pkg);
    } else if (EDUCATION_KEYWORDS.some((k) => lower.includes(k))) {
      categories.education.push(pkg);
    } else if (PHOTO_KEYWORDS.some((k) => lower.includes(k))) {
      categories.photography.push(pkg);
    } else if (MUSIC_KEYWORDS.some((k) => lower.includes(k))) {
      categories.music.push(pkg);
    } else {
      categories.other.push(pkg);
    }
  }

  return categories;
}

function generatePreset(packages, metadata) {
  const allPackages = [...new Set([...COMMON_PACKAGES, ...packages])].sort();

  const categorized = categorizePackages(allPackages);

  // Build the HMA-OSS compatible template
  const preset = {
    _comment:
      "HMA-OSS App Store Whitelist Preset - Generated by crawler. Apply this template to apps you want to hide root from.",
    _usage:
      "In HMA-OSS: App Settings -> Apply Templates -> Create new template -> paste the appList below",
    _metadata: {
      generatedAt: metadata.crawledAt,
      totalPackages: allPackages.length,
      googlePlayPackages: metadata.googlePlayCount,
      fdroidPackages: metadata.fdroidCount,
      categories: Object.fromEntries(
        Object.entries(categorized).map(([k, v]) => [k, v.length])
      ),
    },
    // Direct template format compatible with HMA-OSS
    template: {
      name: "App Store Whitelist",
      isWhitelist: true,
      appList: allPackages,
    },
    // Categorized lists for selective use
    categorized: categorized,
  };

  return preset;
}

function generateHMAConfig(allPackages) {
  // Generate a proper JsonConfig that can be imported via HMA-OSS "还原配置"
  return {
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
    templates: {
      "App Store Whitelist": {
        isWhitelist: true,
        appList: allPackages,
      },
    },
    settingsTemplates: {},
    disabledHooks: [],
    scope: {},
  };
}

function main() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error(
      "raw_packages.json not found. Run 'node crawl.js' first."
    );
    process.exit(1);
  }

  console.log("Reading raw_packages.json...");
  const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf-8"));

  console.log(`Found ${raw.packages.length} packages from crawl`);

  console.log("Generating preset...");
  const preset = generatePreset(raw.packages, raw.metadata);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write full preset
  fs.writeFileSync(PRESET_FILE, JSON.stringify(preset, null, 2));
  console.log(`Preset written to: ${PRESET_FILE}`);

  // Write HMA-OSS importable config (JsonConfig format)
  const hmaConfig = generateHMAConfig(preset.template.appList);
  fs.writeFileSync(IMPORT_FILE, JSON.stringify(hmaConfig, null, 2));
  console.log(`HMA-OSS import config written to: ${IMPORT_FILE}`);

  // Write simplified package list (just the array)
  fs.writeFileSync(
    PACKAGE_LIST_FILE,
    JSON.stringify(preset.template.appList, null, 2)
  );
  console.log(`Package list written to: ${PACKAGE_LIST_FILE}`);

  // Write individual category files
  for (const [category, pkgs] of Object.entries(preset.categorized)) {
    if (pkgs.length > 0) {
      const catFile = path.join(OUTPUT_DIR, `packages_${category}.json`);
      fs.writeFileSync(catFile, JSON.stringify(pkgs, null, 2));
    }
  }
  console.log(
    `Category files written to: ${OUTPUT_DIR}/packages_*.json`
  );

  // Print summary
  console.log("\n=== Summary ===");
  console.log(`Total packages: ${preset.template.appList.length}`);
  for (const [category, pkgs] of Object.entries(preset.categorized)) {
    if (pkgs.length > 0) {
      console.log(`  ${category}: ${pkgs.length}`);
    }
  }

  console.log("\n=== Import Instructions ===");
  console.log("1. Download hma_oss_import.json from Releases");
  console.log("2. In HMA-OSS: 首页 -> 还原配置 -> 选择 hma_oss_import.json");
  console.log("3. Choose '覆盖' (overwrite) or '追加' (append)");
  console.log("4. The 'App Store Whitelist' template will be imported");
  console.log("5. Apply this template to target apps in app settings");
}

main();
