# AGENTS.md - HMA-OSS

## Project Overview

HMA-OSS is an Android Zygisk module that hides apps or rejects app list requests to prevent root detection. It's a fork of "Hide My App List" with an OSS build system.

## Modules

- `app` - Manager APK (UI for configuring hide rules)
- `common` - Shared code (config models, presets, utilities)
- `zygote` - Zygisk module (hooks system_server to hide apps)

## Build Commands

```bash
# Required before any build
./gradlew prebuild

# Build manager APK
./gradlew :app:assembleDebug

# Build Zygisk module (requires app to be built first)
./gradlew :zygote:assembleDebug
```

## Build Prerequisites

- JDK 21
- Android SDK with targetSdk 36, minSdk 29
- `local.properties` must exist (even if empty for debug builds)

## Build Order

The `zygote` module embeds the `app` APK as an asset. Always build `:app` before `:zygote`.

## Version Scheme

- Version code: git commit count + `0x6f7373` (ASCII "oss")
- Version name: derived from git branch and commit hash
- Set `officialBuild=true` in `local.properties` for release builds

## Signing

Debug builds use default debug keystore. For release builds, configure in `local.properties`:
- `fileDir` - path to keystore
- `storePassword`, `keyAlias`, `keyPassword`

## Translations

Managed via Crowdin. Source strings: `app/src/main/res/values/strings.xml`.

## Code Style

- Kotlin with JVM toolchain 21
- ProGuard/R8 enabled for release builds
- View Binding enabled in app module
