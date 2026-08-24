import gplay from "google-play-scraper";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.dirname(new URL(import.meta.url).pathname);
const OUTPUT_FILE = path.join(OUTPUT_DIR, "raw_packages.json");

const COUNTRIES = ["us", "gb", "de", "fr", "jp", "kr", "cn", "br", "in", "ru"];
const TOP_N_PER_CATEGORY = 200;
const DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGETED_PACKAGES = [
  // Google core
  "com.google.android.gms",
  "com.android.vending",
  "com.google.android.gsf",
  "com.google.android.apps.photos",
  "com.google.android.apps.maps",
  "com.google.android.apps.youtube",
  "com.google.android.apps.youtube.music",
  "com.google.android.gm",
  "com.google.android.apps.messages",
  "com.google.android.dialer",
  "com.google.android.contacts",
  "com.google.android.calendar",
  "com.google.android.apps.docs",
  "com.google.android.appsheets",
  "com.google.android.keep",
  "com.google.android.apps.nbu.files",
  "com.google.android.apps.chromecast.app",
  "com.google.android.apps.walletnfcrel",
  "com.google.android.apps.cloudprint",
  "com.google.android.apps.tachyon",
  "com.google.android.apps.safetyhub",
  "com.google.android.apps.pixelmigrate",
  "com.google.android.apps.restore",
  "com.google.android.apps.nexuslauncher",
  "com.google.android.inputmethod.latin",
  "com.google.android.marvin.talkback",
  "com.google.android.tts",
  "com.google.android.webview",
  "com.google.android.trichromelibrary",
  "com.android.chrome",
  "com.android.browser",
  "com.android.settings",
  "com.android.systemui",
  "com.android.providers.media",
  "com.android.providers.downloads",
  "com.android.providers.telephony",
  "com.android.phone",
  "com.android.server.telecom",
  "com.android.packageinstaller",
  "com.android.storagemanager",
  "com.android.permissioncontroller",
  "com.android.traceur",
  "com.android.hotspot2.osulolauncher",
  "com.android.wifi.resources",
  "com.android.bluetooth",
  "com.android.nfc",
  // Samsung
  "com.samsung.android.visionintelligence",
  "com.samsung.android.game.gamehome",
  "com.samsung.android.app.tips",
  "com.samsung.android.vocalizer",
  "com.sec.android.app.sbrowser",
  "com.samsung.android.spay",
  "com.samsung.android.mobileservice",
  "com.samsung.android.themestore",
  // Xiaomi
  "com.miui.securitycenter",
  "com.miui.gallery",
  "com.miui.calculator",
  // Common social
  "com.whatsapp",
  "com.whatsapp.w4b",
  "org.telegram.messenger",
  "org.telegram.messenger.web",
  "com.facebook.katana",
  "com.facebook.lite",
  "com.facebook.orca",
  "com.instagram.android",
  "com.instagram.lite",
  "com.twitter.android",
  "com.twitter.android.lite",
  "com.zhiliaoapp.musically",
  "com.ss.android.ugc.trill",
  "com.snapchat.android",
  "com.pinterest",
  "com.reddit.frontpage",
  "com.linkedin.android",
  "com.discord",
  "com.viber.voip",
  "com.line.Line",
  "com.kakao.talk",
  "jp.naver.line.android",
  "com.tencent.mm",
  "com.tencent.mobileqq",
  "com.alibaba.android.rimet",
  "com.Slack",
  // Common tools
  "com.opera.browser",
  "com.opera.mini.native",
  "org.mozilla.firefox",
  "org.mozilla.firefox_beta",
  "com.brave.browser",
  "com.microsoft.emmx",
  "com.UCMobile",
  "com褒AcceleratorSecurely.Avoid",
  "com.ghisler.android.TotalCommander",
  "com.google.android.apps.translate",
  "com.duolingo",
  "com.khanacademy.android",
  "com.quizlet.android",
  "com.microsoft.office.outlook",
  "com.microsoft.office.word",
  "com.microsoft.office.excel",
  "com.microsoft.office.powerpoint",
  "com.microsoft.office.onenote",
  "com.microsoft.office.officehubrow",
  "com.google.android.apps.docs.editors.docs",
  "com.google.android.apps.docs.editors.sheets",
  "com.google.android.apps.docs.editors.slides",
  "com.dropbox.android",
  "com.box.android",
  "com.tresorit.tresorit",
  "com.spotify.music",
  "com.apple.android.music",
  "com.amazon.mp3",
  "com.soundcloud.android",
  "com.shazam.android",
  "com.shazam.encore.android",
  "deezer.android.app",
  "com.tidal.music",
  "com.pandora.android",
  "com.iheart.radio",
  "com.amazon.avod.thirdpartyclient",
  "com.netflix.mediaclient",
  "com.disney.disneyplus",
  "com.hbo.hbonow",
  "com.hulu.plus",
  "com.peacocktv.peacockandroid",
  "com.zhiliaoapp.musically.go",
  "com.google.android.youtube.tv",
  "com.amazon.fireTVmissing",
  "tv.twitch.android.app",
  "com.google.android.apps.tv.launcherx",
  "com.netflix.ninja",
  // Gaming
  "com.supercell.clashofclans",
  "com.supercell.clashroyale",
  "com.supercell.brawlstars",
  "com.supercell.hayday",
  "com.supercell.clashmini",
  "com.mojang.minecraftpe",
  "com.riot.league.wildrift",
  "com.riotgames.league.teamfighttactics",
  "com.garena.game.codm",
  "com.garena.game.kgtw",
  "com.tencent.ig",
  "com.pubg.krmobile",
  "com.pubg.imobile",
  "com.epicgames.fortnite",
  "com.ea.gp.fifamobile",
  "com.kabam.marvelbattle",
  "com.innersloth.spacemafia",
  "com.playrix.township",
  "com.playrix.gardenscapes",
  "com.playrix.homescapes",
  "com.outfit7.mytalkingtom2",
  "com.outfit7.talkingtomgoldrun",
  "com.miniclip.eightballpool",
  "com.miniclip.agar.io",
  "com.voodoo.crowdcity",
  "com.voodoo.chainreaction",
  "com.ketchapp.donttapp",
  "com.ketchapp.basketball",
  "com.ketchapp.dontski",
  // Finance
  "com.paypal.android.p2pmobile",
  "com.venmo",
  "com.cash.app",
  "com.zellepay.zelle",
  "com.google.android.apps.walletnfcrel",
  "com.amazon.mShop.android.shopping",
  "com.ebay.mobile",
  "com.target.ui",
  "com.walmart.android",
  "com.bestbuy.android",
  "com.bkmobilard",
  "com.shopee.*",
  "com.lazada.android",
  "com.aliexpress",
  "com.letgo.android",
  "com.offerup",
  "com.wish.android",
  "com.wish.android.pushecommerce",
  // Navigation
  "com.waze",
  "com.uber.rider",
  "com.ubercab",
  "com.lyft.android",
  "com.google.android.apps.maps",
  "com.here.app.maps",
  "com.sygic.aura",
  "net.osmand",
  "com.coherent.locus",
  // Food delivery
  "com.ubercab.eats",
  "com.doordash.driver",
  "com.grubhub.driver",
  "com.postmates.android",
  "com.pizzahut.orders",
  "com.dominos.android",
  // Health
  "com.google.android.apps.fitness",
  "com.strava",
  "com.nike.plusone",
  "com.samsung.health",
  "com.fitbit.FitbitMobile",
  "com.myfitnesspal.android",
  "com.calm.android",
  "com Headspace",
  // Productivity
  "com.google.android.apps.tasks",
  "com.trello",
  "com.asana.app",
  "com.todoist",
  "com.ticktick.task",
  "com.microsoft.to.do",
  "notion.habit",
  "com.notion.Notion",
  "com.slack",
  "com.microsoft.teams",
  "us.zoom.videomeetings",
  "com.google.android.apps.meetings",
  "com.gotoandkeep.zoom",
  "com.logmein.gotomeeting",
  "com.bluejeans.videocall",
  "com.highspot.swift",
];

async function crawlGooglePlay() {
  console.log("[Google Play] Starting crawl...");
  const allPackages = new Set();
  const categories = Object.values(gplay.category);

  for (const country of COUNTRIES) {
    console.log(`[Google Play] Crawling country: ${country}`);

    for (const category of categories) {
      try {
        const apps = await gplay.list({
          category,
          collection: gplay.collection.TOP_FREE,
          num: TOP_N_PER_CATEGORY,
          country,
          lang: "en",
        });

        for (const app of apps) {
          allPackages.add(app.appId);
        }

        console.log(
          `  [${country}] ${category}: +${apps.length} apps (total: ${allPackages.size})`
        );
        await sleep(DELAY_MS);
      } catch (err) {
        if (err.message && err.message.includes("Could not")) {
          // Category not available in this country, skip
        } else {
          console.error(
            `  [${country}] ${category}: ERROR - ${err.message}`
          );
        }
        await sleep(DELAY_MS * 2);
      }
    }
  }

  return [...allPackages];
}

async function crawlFDroid() {
  console.log("[F-Droid] Fetching index-v2.json...");
  const url = "https://f-droid.org/repo/index-v2.json";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "HMA-OSS-Crawler/1.0" },
    });
    const data = await res.json();
    const packages = Object.keys(data.packages || {});
    console.log(`[F-Droid] Found ${packages.length} packages`);
    return packages;
  } catch (err) {
    console.error(`[F-Droid] Failed: ${err.message}`);
    return [];
  }
}

async function main() {
  const startTime = Date.now();

  const [googlePlayPackages, fdroidPackages] = await Promise.all([
    crawlGooglePlay(),
    crawlFDroid(),
  ]);

  // Merge all sources
  const allPackages = new Set([
    ...TARGETED_PACKAGES,
    ...googlePlayPackages,
    ...fdroidPackages,
  ]);

  // Filter out obviously non-store packages
  const filtered = [...allPackages].filter((pkg) => {
    // Skip empty
    if (!pkg || pkg.length === 0) return false;
    // Skip if contains special chars that indicate it's not a real package
    if (/[^a-zA-Z0-9._]/.test(pkg)) return false;
    // Skip very short package names
    if (pkg.split(".").length < 2) return false;
    return true;
  });

  filtered.sort();

  const result = {
    metadata: {
      crawledAt: new Date().toISOString(),
      googlePlayCount: googlePlayPackages.length,
      fdroidCount: fdroidPackages.length,
      targetedCount: TARGETED_PACKAGES.length,
      totalUnique: filtered.length,
      durationMs: Date.now() - startTime,
    },
    packages: filtered,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`\nDone! Saved ${filtered.length} packages to ${OUTPUT_FILE}`);
  console.log(`  Google Play: ${googlePlayPackages.length}`);
  console.log(`  F-Droid: ${fdroidPackages.length}`);
  console.log(`  Targeted: ${TARGETED_PACKAGES.length}`);
  console.log(`  Total unique: ${filtered.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
