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

> 每天自动更新的干净设备模拟方案：从各大应用商店抓取合法应用包名，
> 生成可直接导入 HMA-OSS 的白名单配置。导入后，目标应用只能看到
> 商店可下载的合法应用，看不到 Root 相关应用。

[![App Store Crawler](https://img.shields.io/github/actions/workflow/status/b0ssxie/HMA-OSS/appstore-crawler.yml?label=appstore-crawler&logo=github)](https://github.com/b0ssxie/HMA-OSS/actions/workflows/appstore-crawler.yml)

### 快速开始

| 步骤 | 操作 |
|------|------|
| 1 | 从 Releases（`appstore-presets-latest`）下载 `hma_oss_import.json` |
| 2 | HMA-OSS 首页 →「还原配置」→ 选择该文件 |
| 3 | 选择「**覆盖**」→ 完成 |

> **注意：** 必须选「覆盖」。选「追加」时设备上已有的旧配置优先保留，
> 新文件的修复和新增预应用不会生效。

导入后自动生效：约 6800 个大陆常用应用已预应用白名单模板，
新安装的应用走默认配置同样受保护；系统/桌面组件已排除在外，不影响正常使用。

### 当前规模

| 指标 | 数量 |
|------|------|
| 白名单应用总数 | ~20000 |
| 预应用 scope 应用 | ~6800 |
| 内置国产应用 | 900+ |
| 更新频率 | 每天（UTC 3:00 自动） |

### 数据源状态

| 数据源 | CI 是否可用 | 说明 |
|--------|-------------|------|
| Google Play（美/日/德/中） | 是 | 各分类 Top 免费应用 |
| F-Droid | 是 | 全部开源应用 |
| 小米应用商店 | 是 | 各分类热门应用（含腾讯系游戏） |
| 豌豆荚 | 否（CI 被屏蔽） | 屏蔽机房 IP，大陆本地运行可用 |
| 应用宝 | 否（已废） | 官网改版为 SPA + 反爬，无包名可抓 |
| 内置名单 | 是 | 900+ 国产应用（微信/支付宝/银行/游戏等） |

### 本地运行

```bash
cd tools/crawler
npm install
npm run all
```

输出文件在 `tools/crawler/output/` 目录。

| 命令 | 说明 |
|------|------|
| `npm run crawl` | 爬取 Google Play + F-Droid + 豌豆荚 + 小米商店 |
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

**方法一：直接导入（最简单，推荐）**

见上方「快速开始」，三步完成。模板「App Store Whitelist」随文件自动导入，
无需手动逐个勾选。

**方法二：adb 推送**

```bash
node push-preset.js --scope "com.target.app" --all
```

**方法三：手动导入**

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
| `hma_oss_import.json` | HMA-OSS 可直接导入的配置文件（含白名单模板 + 预应用 scope） |
| `appstore_whitelist_preset.json` | 完整预设（含元数据和分类列表） |
| `appstore_packages.json` | 所有包名的扁平数组 |
| `packages_cn.json` | 大陆可下载应用包名（预应用 scope 的来源） |
| `excluded_preset_packages.json` | 因命中内置预设（检测器/root/可疑）被移出白名单的包 |
| `packages_*.json` | 按分类的包名列表 |

### 自定义

编辑 `crawl.js` 修改：
- `COUNTRIES` - 添加/删除爬取的国家
- `TOP_N_PER_CATEGORY` - 调整每个分类抓取的应用数量
- `TARGETED_PACKAGES` - 添加特定应用的包名

编辑 `generate-preset.js` 修改：
- `COMMON_PACKAGES` - Android 系统必备包名
- 分类关键词匹配逻辑

### 常见问题

**还原时选「覆盖」还是「追加」？**
必须选「覆盖」。「追加」模式下设备旧配置优先保留，新文件的修复和新增预应用不会生效。

**导入后桌面/手势异常？**
旧版本曾误把系统应用加入预应用，已修复。请重新下载最新文件并用「覆盖」导入，桌面即恢复。

**某个国产应用没被预应用？**
把它的包名（HMA 应用详情页可见）提 issue 或直接加到 `crawl.js` 的 `TARGETED_PACKAGES` 后提 PR。

**豌豆荚数据为什么没有？**
豌豆荚屏蔽了 GitHub 机房 IP，CI 抓不到。在大陆网络的机器上跑一遍 `npm run all` 即可抓到并入。

**检测器/root 应用会不会被白名单暴露？**
不会。生成时会自动解析本仓库 7 个内置预设源码的 `exactPackageNames`（检测器/root/可疑/ROM/Shizuku/Xposed），
叠加对应的前后缀规则，把命中的包从白名单可见集里剔除（清单见 `excluded_preset_packages.json`）。
上游预设更新后无需改爬虫代码，重新跑即自动同步。

**检测器装上后能看到所有应用？**
要把检测器本身也管住：HMA 的 `defaultConfig` 只对新装应用自动生效，
`shouldHide` 对不在 scope 里的调用者直接放行，所以存量检测器必须有显式 scope 条目。
本配置已把检测器预设包显式加入 scope 并套用白名单模板（动态规则如 `me.garfieldhan.*` 无法静态枚举的除外）。
同样记得用「覆盖」导入，否则旧条目会保留。

## 相关链接

- https://github.com/frknkrc44/HMA-OSS/wiki
- [翻译贡献](https://crowdin.com/project/frknkrc44-hma-oss)
- [更新日志](https://github.com/frknkrc44/HMA-OSS/commits)
