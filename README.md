<div align="center">
  <h2>HMA-OSS</h2>

  <img src="HideMyAss-OSS.svg" alt="HMA-OSS Logo" style="max-width:360px;width:60%;height:auto;">

  <p>
    <a href="https://github.com/frknkrc44/HMA-OSS" style="text-decoration:none">
      <img src="https://img.shields.io/github/stars/frknkrc44/HMA-OSS?label=Stars&logo=github">
    </a>
    <a href="https://github.com/frknkrc44/HMA-OSS/actions" style="text-decoration:none">
      <img src="https://img.shields.io/github/actions/workflow/status/frknkrc44/HMA-OSS/main.yml?branch=master&logo=github">
    </a>
    <a href="https://github.com/frknkrc44/HMA-OSS/releases/latest" style="text-decoration:none">
      <img src="https://img.shields.io/github/v/release/frknkrc44/HMA-OSS?label=Release">
    </a>
    <a href="https://github.com/frknkrc44/HMA-OSS/releases/latest" style="text-decoration:none">
      <img src="https://img.shields.io/github/downloads/frknkrc44/HMA-OSS/total">
    </a>
    <a href="https://t.me/aerathfuns" style="text-decoration:none">
      <img src="https://img.shields.io/badge/Telegram-Channel-blue.svg?logo=telegram">
    </a>
    <a href="https://choosealicense.com/licenses/gpl-3.0/" style="text-decoration:none">
      <img src="https://img.shields.io/github/license/frknkrc44/HMA-OSS?label=License">
    </a>
  </p>
</div>

---

- [English](#about-this-module)
- **中文（简体）**
- [Türkçe](README_tr.md)
- [日本語](README_ja.md)
- [Indonesia](README_id.md)

## 关于本模块

虽然检测特定应用的安装是一种不好的做法，但并非所有使用 Root 的应用都支持随机包名。在这种情况下，如果检测到与 Root 相关的应用（如 Fake Location 和 Storage Isolation），就等同于检测到设备已 Root。

此外，一些应用利用各种漏洞获取你的应用列表，将其用作指纹识别数据或其他恶意用途。

本模块作为 Zygisk 模块运行，可以隐藏应用或拒绝应用列表请求。

## 应用商店白名单爬虫

本项目包含一个自动爬虫工具，从 Google Play Store 和 F-Droid 抓取合法应用的包名，生成白名单预设。

**目的**: 将白名单应用到 HMA-OSS 后，只有应用商店中可下载的合法应用对目标应用可见，使设备看起来像一台干净的未 Root 手机。

### 快速开始

```bash
cd tools/crawler
npm install
npm run all
```

输出文件在 `tools/crawler/output/` 目录。

### 命令

| 命令 | 说明 |
|------|------|
| `npm run crawl` | 爬取 Google Play + F-Droid 商店 |
| `npm run generate` | 从爬取数据生成 HMA-OSS 预设 |
| `npm run all` | 执行上述两步 |
| `node push-preset.js` | 通过 adb 推送预设到手机 |

### 推送到设备

```bash
# 应用到指定应用
node push-preset.js --scope "com.target.app1" --scope "com.target.app2"

# 应用到所有应用（defaultConfig）
node push-preset.js --all

# 自定义模板名称
node push-preset.js --template "我的白名单" --all

# 预览模式（不实际执行）
node push-preset.js --all --dry-run
```

### 在 HMA-OSS 中使用

**方法一：adb 推送（推荐）**

```bash
node push-preset.js --scope "com.target.app" --all
```

**方法二：手动导入**

1. 下载 `appstore_packages.json`
2. 复制数组内容
3. 在 HMA-OSS 中：应用设置 -> 应用模板 -> 创建新模板
4. 模式设为**白名单**
5. 粘贴包名到应用列表
6. 将模板应用到目标应用

### GitHub Action

工作流 `.github/workflows/appstore-crawler.yml` 每天 UTC 凌晨 3 点自动运行，发布最新预设到 Releases。

下载地址: **Releases** -> `appstore-presets-latest`

### 输出文件

| 文件 | 说明 |
|------|------|
| `appstore_whitelist_preset.json` | 完整预设（含元数据和分类列表） |
| `appstore_packages.json` | 所有包名的扁平数组 |
| `packages_*.json` | 按分类的包名列表 |

### 自定义

编辑 `crawl.js` 修改：
- `COUNTRIES` - 添加/删除爬取的国家
- `TOP_N_PER_CATEGORY` - 调整每个分类抓取的应用数量
- `TARGETED_PACKAGES` - 添加特定应用的包名

编辑 `generate-preset.js` 修改：
- `COMMON_PACKAGES` - Android 系统必备包名
- 分类关键词匹配逻辑

## 相关链接

- https://github.com/frknkrc44/HMA-OSS/wiki
- [翻译贡献](https://crowdin.com/project/frknkrc44-hma-oss)
- [更新日志](https://github.com/frknkrc44/HMA-OSS/commits)
