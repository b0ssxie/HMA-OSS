# App Store Crawler

Crawls Google Play Store and F-Droid to generate a whitelist preset for HMA-OSS.

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
| `npm run crawl` | Crawl Google Play + F-Droid stores |
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
| `appstore_whitelist_preset.json` | Full preset with metadata and categorized lists |
| `appstore_packages.json` | Flat array of all package names |
| `packages_*.json` | Per-category package lists |

## GitHub Actions

The workflow `.github/workflows/appstore-crawler.yml` runs daily at 3 AM UTC and publishes a release with the latest preset files.

Download from: **Releases** -> `appstore-presets-latest`

## How to Use in HMA-OSS

### Method 1: Push via adb (Recommended)

```bash
node push-preset.js --scope "com.target.app" --all
```

### Method 2: Manual

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
