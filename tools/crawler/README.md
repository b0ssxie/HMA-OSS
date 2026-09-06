# App Store Crawler

> Daily-updated clean-device simulation: crawls package names of legitimate apps
> from major app stores and generates a whitelist preset for HMA-OSS.
> Once applied, target apps only see store-available apps — never root-related ones.

[![App Store Crawler](https://img.shields.io/github/actions/workflow/status/b0ssxie/HMA-OSS/appstore-crawler.yml?label=appstore-crawler&logo=github)](https://github.com/b0ssxie/HMA-OSS/actions/workflows/appstore-crawler.yml)

## Quick Start (1 minute)

| Step | Action |
|------|--------|
| 1 | Download `hma_oss_import.json` from Releases (`appstore-presets-latest`) |
| 2 | HMA-OSS Home -> Restore config -> select the file |
| 3 | Choose **Overwrite** -> done |

> **Note:** you must choose Overwrite. With Append, existing on-device configs
> take precedence and fixes/newly pre-applied apps won't take effect.

After import everything applies automatically: ~6800 mainland apps come
pre-applied with the whitelist template, newly installed apps are covered by
the default config, and system/launcher packages are excluded so the device
keeps working normally.

## Current Scale

| Metric | Count |
|--------|-------|
| Whitelisted packages | ~20,000 |
| Pre-applied scope apps | ~6,800 |
| Built-in CN packages | 900+ |
| Refresh cadence | Daily (03:00 UTC, automatic) |

## Source Status

| Source | Works in CI | Notes |
|--------|-------------|-------|
| Google Play (us/jp/de/cn) | Yes | Top free apps per category |
| F-Droid | Yes | All open-source apps |
| Xiaomi App Store | Yes | Popular apps per category (incl. Tencent games) |
| Wandoujia | No (IP-blocked in CI) | Blocks datacenter IPs; works from mainland networks |
| MyApp (Tencent) | No (dead) | Site rebuilt as SPA with anti-scraping; no package names served |
| Built-in list | Yes | 900+ CN apps (WeChat/Alipay/banks/games) |

## Local Run

```bash
cd tools/crawler
npm install
npm run all
```

Output files will be in `tools/crawler/output/`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run crawl` | Crawl Google Play + F-Droid + Wandoujia + Xiaomi stores |
| `npm run generate` | Generate HMA-OSS preset from crawled data |
| `npm run all` | Run both steps |
| `node push-preset.js` | Push preset to connected device via adb |

## Push to Device

```bash
# Apply to specific apps
node push-preset.js --scope "com.target.app1" --scope "com.target.app2"

# Apply to all apps (defaultConfig)
node push-preset.js --all

# Custom template name
node push-preset.js --template "My Whitelist" --all

# Dry run (preview without changes)
node push-preset.js --all --dry-run
```

## Output Files

| File | Description |
|------|-------------|
| `hma_oss_import.json` | Directly importable HMA-OSS config (whitelist template + pre-applied scope) |
| `appstore_whitelist_preset.json` | Full preset with metadata and categorized lists |
| `appstore_packages.json` | Flat array of all package names |
| `packages_cn.json` | Mainland-CN downloadable packages (source of the pre-applied scope) |
| `excluded_preset_packages.json` | Packages removed from the whitelist for matching built-in presets |
| `packages_*.json` | Per-category package lists |

## Built-in Preset Exclusions

At generation time, `generate-preset.js` parses `exactPackageNames` from the
seven preset sources under `common/.../app_presets/` and mirrors their static
prefix/suffix package rules. Matching packages (detectors, root, suspicious
apps — e.g. Magisk, AdAway, Termux) are removed from the visible whitelist so
whitelisted callers cannot see them. No crawler changes are needed when upstream
presets are updated; just re-run. Manifest/APK-based heuristics can't be
evaluated statically and are not covered.

## GitHub Actions

The workflow `.github/workflows/appstore-crawler.yml` runs daily at 3 AM UTC and publishes a release with the latest preset files.

Download from: **Releases** -> `appstore-presets-latest`

## How to Use in HMA-OSS

### Method 1: Direct import (Recommended)

See Quick Start above — three steps. The `App Store Whitelist` template is
imported along with the file, no per-app manual work needed.

### Method 2: Push via adb

```bash
node push-preset.js --scope "com.target.app" --all
```

### Method 3: Manual

1. Open `appstore_packages.json`
2. Copy the array contents
3. In HMA-OSS: App Settings -> Apply Templates -> Create new template
4. Set mode to **Whitelist**
5. Paste package names into the app list
6. Apply the template to target apps

## Customization

Edit `crawl.js` to:
- Add/remove countries in `COUNTRIES`
- Adjust `TOP_N_PER_CATEGORY` for more/fewer apps
- Add hardcoded `TARGETED_PACKAGES` for specific apps

Edit `generate-preset.js` to:
- Modify `COMMON_PACKAGES` (Android system packages always present)
- Change category keyword matching logic

## FAQ

**Overwrite or Append on restore?**
Overwrite. Append keeps existing on-device configs, so fixes never apply.

**Launcher/gestures broken after import?**
That was caused by system apps in the scope in an old build — already fixed.
Re-download the latest file and import with Overwrite.

**A CN app is not pre-applied?**
File an issue with its package name (visible in the HMA app details page),
or add it to `TARGETED_PACKAGES` in `crawl.js` and open a PR.

**Why is there no Wandoujia data?**
Wandoujia blocks GitHub datacenter IPs. Run `npm run all` from a mainland
China network to include it.
