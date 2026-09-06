# App Store Crawler

Crawls Google Play Store, F-Droid, Wandoujia (豌豆荚) and Xiaomi App Store (小米应用商店, CN stores) to generate a whitelist preset for HMA-OSS.

## Purpose

The preset contains package names of legitimate apps available on official app stores. When applied as a whitelist in HMA-OSS, only these apps are visible to target apps, making your device appear as a clean, unrooted phone.

## Quick Start

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
| `packages_*.json` | Per-category package lists |

## GitHub Actions

The workflow `.github/workflows/appstore-crawler.yml` runs daily at 3 AM UTC and publishes a release with the latest preset files.

Download from: **Releases** -> `appstore-presets-latest`

## How to Use in HMA-OSS

### Method 1: Direct import (Recommended)

1. Download `hma_oss_import.json` from Releases (`appstore-presets-latest`)
2. In HMA-OSS: Home -> Restore config -> select the file
3. You must choose **Overwrite** ⚠️: with Append, existing on-device configs take precedence (`putIfAbsent`), so fixes and newly pre-applied apps won't take effect
4. The `App Store Whitelist` template is imported and already pre-applied to ~6800 mainland apps + default config for newly installed apps; system/OEM packages are excluded so the launcher keeps working

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
