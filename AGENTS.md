# AGENTS.md - HMA-OSS

## What This Is

Android Zygisk module that hides apps / rejects app list requests to defeat root detection. Fork of "Hide My App List" with an OSS build system. Three Gradle modules (`:app`, `:common`, `:zygote`) plus a Node.js crawler that generates whitelist presets.

## Build

```bash
./gradlew prebuild          # REQUIRED before any other task
./gradlew :app:assembleDebug
./gradlew :zygote:assembleDebug   # requires :app built first (embeds its APK as asset)
```

- **JDK 21**, Android SDK targetSdk 36 / minSdk 29
- `local.properties` **must exist** (even empty) — root `build.gradle.kts` reads it unconditionally
- Version code = `git rev-list origin/master --count + 0x6f7373`; version name derived from branch + commit hash. Don't hardcode.
- Release signing via `local.properties`: `fileDir`, `storePassword`, `keyAlias`, `keyPassword`
- `officialBuild=true` in `local.properties` strips the git-suffix from version name

## Architecture

- `:app` — Manager APK (Kotlin, View Binding, Material themes). UI for configuring hide rules. Entry: `org.frknkrc44.hma_oss.ui.activity.MainActivity`
- `:common` — Shared models, JSON config, preset definitions. The 7 `app_presets/*.kt` files (`DetectorAppsPreset`, `RootAppsPreset`, `SuspiciousAppsPreset`, etc.) are the source of truth for what counts as "detector/root/suspicious"
- `:zygote` — Zygisk module. Injects into **system_server** (not just zygote) via ZygoteLoader. Hooks PMS to intercept `getInstalledPackages`. Entry: `org.frknkrc44.hma_oss.zygote.ZygoteEntry`

Key runtime behavior an agent must understand:
- `HMAService.shouldHide()` returns `false` for any caller **not in `config.scope`** — `defaultConfig` is NOT a fallback for existing apps
- `defaultConfig` only auto-applies to **newly installed** apps via `ACTION_PACKAGE_ADDED` broadcast (`putIfAbsent`)
- This is why detector preset packages are explicitly added to scope in the generated config

## App Store Crawler (`tools/crawler/`)

Node.js (not Python). `npm run all` = `crawl.js` then `generate-preset.js`.

```bash
cd tools/crawler
npm install
npm run crawl      # fetch from all sources
npm run generate   # build preset JSONs
npm run all        # both
```

Sources: Google Play, F-Droid, Xiaomi, Coolapk (CI-available); Wandoujia (IP-blocked in CI, works from mainland); built-in 900+ CN packages. Each source fail-softs — Wandoujia/Coolapk abort independently without failing the run.

**Coolapk auth**: v3 `X-App-Token` reimplemented in pure JS (`bcryptjs`, not `bcrypt`). Secret key (`phase2`) is pinned in `coolapk_auth.json`, extracted once from `lib/arm64-v8a/libauth.so`. CI never downloads the APK. If the log shows `TOKEN REJECTED`, Coolapk rotated keys — re-extract from a new APK (see `tools/crawler/README.md`).

**Preset generation**: `generate-preset.js` parses `exactPackageNames` from the 7 `app_presets/*.kt` files and mirrors their prefix/suffix rules. Matching packages are removed from the visible whitelist. Detector preset packages are additionally added to scope explicitly (see runtime behavior above).

Output: `hma_oss_import.json` (direct import), `appstore_whitelist_preset.json`, `appstore_packages.json`, `packages_cn.json`, `excluded_preset_packages.json`.

CI: `.github/workflows/appstore-crawler.yml` runs daily at 03:00 UTC, publishes to `appstore-presets-latest` release. There is **no CI for the Android build itself**.

## No Tests / Lint / Typecheck

This repo has no test suite, linter, or typecheck command. Don't go looking for one.

## Conventions

- Kotlin, JVM toolchain 21, ProGuard/R8 for release
- View Binding enabled in `:app`
- Translations via Crowdin; source: `app/src/main/res/values/strings.xml`
- Don't commit `local.properties`, `tools/crawler/node_modules/`, or `tools/crawler/output/`
