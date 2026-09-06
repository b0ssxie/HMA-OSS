import gplay from "google-play-scraper";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.dirname(new URL(import.meta.url).pathname);
const OUTPUT_FILE = path.join(OUTPUT_DIR, "raw_packages.json");

const COUNTRIES = ["us", "jp", "de", "cn"];
const TOP_N_PER_CATEGORY = 100;
const DELAY_MS = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run `worker(item)` over `items` with a fixed concurrency pool. Results
// are returned in input order; errors propagate to the per-item slot as
// {item, error} so the caller can decide how to log/retry.
async function runConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = { item: items[i], value: await worker(items[i], i) };
      } catch (err) {
        results[i] = { item: items[i], error: err };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

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
  // ==================== 中国大陆应用 ====================
  // 社交/通讯
  "com.tencent.mm",               // 微信
  "com.tencent.mobileqq",         // QQ
  "com.tencent.qqlite",           // QQ轻聊版
  "com.tencent.tim",              // TIM
  "com.sina.weibo",               // 微博
  "com.tencent.weishi",           // 微视
  "com.tencent.mtt",              // QQ浏览器
  "com.qzone",                    // QQ空间
  "com.tencent.qqpim",            // QQ同步助手
  "com.tencent.docs",             // 腾讯文档
  "com.tencent.weread",           // 微信读书
  "com.tencent.news",             // 腾讯新闻
  "com.tencent.qqmusic",          // QQ音乐
  "com.tencent.qqgamecenter",     // 腾讯游戏中心
  // 字节跳动系
  "com.ss.android.ugc.aweme",     // 抖音
  "com.ss.android.ugc.aweme.lite",// 抖音极速版
  "com.ss.android.article.news",  // 今日头条
  "com.ss.android.article.lite",   // 今日头条极速版
  "com.ss.android.ugc.live",      // 火山小视频
  "com.ss.android.lark",          // 飞书
  "com.ss.android.ugc.aweme.lite",// 抖音极速版
  "com.ss.android.article.video", // 西瓜视频
  "com.ss.android.ugc.aweme.paid",// 抖币
  "com.ss.android.ttvecshop",     // 值点
  // 支付宝/蚂蚁系
  "com.eg.android.AlipayGphone",  // 支付宝
  "com.alipay.android.app",       // 支付宝钱包
  "com.alipay.android.phone.openmember", // 蚂蚁会员
  "com.alipay.android.app.AlipayGphone", // 支付宝
  // 淘宝/天猫/阿里系
  "com.taobao.taobao",            // 淘宝
  "com.taobao.litetao",           // 淘特
  "com.tmall.wireless",           // 天猫
  "com.alibaba.wireless",         // 阿里巴巴
  "com.alibaba.aliexpresshd",     // 全球速卖通
  "com.alimama.union.app",        // 淘宝联盟
  "com.alipay.baichuan",          // 百川
  "com.aliyun.ams.app",           // 阿里云
  "com.alibaba.ailabs.tg",        // 天猫精灵
  "com.alibaba.aliyun",           // 阿里云
  "com.alibaba.android.rimet",    // 钉钉
  "com.alibaba.android.koubei",   // 口碑
  "com.alipay.kit",               // 支付宝
  "com.alimama.union.app",        // 淘宝联盟
  "com.amap.android.ams",         // 高德地图
  "com.autonavi.minimap",         // 高德地图
  "com.alipay.android.app.smartface", // 支付宝
  "com.youku.phone",              // 优酷
  "com.ucmobile",                 // UC浏览器
  "com.UCMobile",                 // UC浏览器国际版
  "com.UCMobile.intl",            // UC浏览器国际版
  "cn.uc.android",                // UC浏览器
  "com.etao.android",             // 一淘
  "com.taobao.qianniu",           // 千牛
  "com.alibaba.ndh",              // NDH
  "com.alibaba.mnn",              // MNN
  "com.alipay.mobile.client",     // 支付宝
  "com.alibaba.cloud",            // 阿里云盘
  "com.alibaba.aliyunpan",        // 阿里云盘
  // 百度系
  "com.baidu.searchbox",          // 百度
  "com.baidu.BaiduMap",           // 百度地图
  "com.baidu.netdisk",            // 百度网盘
  "com.baidu.input",              // 百度输入法
  "com.baidu.homework",           // 作业帮
  "com.baidu.tieba",              // 百度贴吧
  "com.baidu.haokan",             // 好看视频
  "com.baidu.yuedu",              // 百度阅读
  "com.baidu.duer.superunion",    // 小度
  "com.baidu.searchcraft",        // 百度极速版
  "com.baidu.browser.apps",       // 百度浏览器
  "com.baidu.hiapp",              // 百度
  "com.baidu.youavideo",          // 百度视频
  "com.baidu.tieba",              // 百度贴吧
  "com.baidu.input_mi",           // 百度输入法小米版
  "com.baidu.minivideo",          // 百度好看视频
  "com.baidu.nbcloud",            // 百度网盘
  "com.baidu.qiyi",               // 爱奇艺
  // 网易系
  "com.netease.cloudmusic",       // 网易云音乐
  "com.netease.newsreader",       // 网易新闻
  "com.netease.mail",             // 网易邮箱
  "com.netease.mc",               // 我的世界
  "com.netease.gamecenter",       // 网易游戏中心
  "com.netease.nim.demo",         // 网易云信
  "com.netease.mobimail",         // 网易邮箱大师
  "com.netease.cloudmusic.lite",  // 网易云音乐极速版
  "com.netease.mc.tws",           // 我的世界
  "com.netease.newsreader.lite",  // 网易新闻极速版
  "com.netease.mailmaster",       // 网易邮箱大师
  "com.netease.hxym",             // 网易相册
  "com.netease.yanxuan",          // 网易严选
  "com.netease.punch",            // 网易
  "com.netease.gl",               // 网易游戏
  "com.netease.mc.aligames",      // 我的世界
  "com.netease.cloudmusic.i18n",  // 网易云音乐国际版
  "com.netease.edu",              // 网易云课堂
  "com.netease.yanxuan",          // 网易严选
  "com.netease.mobimail",         // 网易邮箱大师
  "com.netease.cloudmusic.lite",  // 网易云音乐极速版
  "com.netease.gamecenter",       // 网易游戏中心
  // 京东系
  "com.jingdong.app.mall",        // 京东
  "com.jd.jrapp",                 // 京东
  "com.jd.jdbe",                  // 京东金融
  "com.jd.iots",                  // 京东智能
  "com.jd.jdapp",                 // 京东
  "com.jd.jrapp.member",          // 京东会员
  "com.jd.jdpingou",              // 京喜
  "com.jd.iots",                  // 京东智能
  "com.jd.jrapp",                 // 京东
  "com.jd.jdm",                   // 京东
  "com.jd.jrapp.member",          // 京东会员
  "com.jd.jdpingou",              // 京喜
  "com.jd.jdmb",                  // 京东
  "com.jd.jdapp",                 // 京东
  // 拼多多
  "com.xunmeng.pinduoduo",        // 拼多多
  "com.pinduoduo.android",        // 拼多多
  "com.xunmeng.merchant",         // 拼多多商家版
  "com.xunmeng.pdd",              // 拼多多
  "com.pdd.pop",                  // 拼多多
  "com.xunmeng.pdd",              // 拼多多
  // 美团系
  "com.dianping.v1",              // 大众点评
  "com.meituan.android",          // 美团
  "com.meituan.meituanwaimai",    // 美团外卖
  "com.meituan.qcs",              // 美团
  "com.meituan.pt",               // 美团
  "com.dianping.v1",              // 大众点评
  "com.meituan.android.city",     // 美团
  "com.meituan.android.nebula",   // 美团
  "com.meituan.maoyan",           // 猫眼
  "com.meituan.business",         // 美团
  // 滴滴
  "com.sdu.didi.psnger",          // 滴滴出行
  "com.didi.passenger",           // 滴滴
  "com.sdu.didi.psnger.icenter",  // 滴滴
  "com.didi.sdu",                 // 滴滴
  "com.didi.passenger.icenter",   // 滴滴
  // 字节系其他
  "com.ss.android.ugc.aweme.lite",// 抖音极速版
  "com.ss.android.ugc.aweme.i18n",// TikTok
  "com.ss.android.ugc.aweme.tiktok",// TikTok
  "com.ss.android.ugc.photo",     // 图虫
  "com.ss.android.article.news",  // 今日头条
  "com.ss.android.article.lite",  // 今日头条极速版
  // 快手
  "com.smile.gifmaker",           // 快手
  "com.kuaishou.nebula",           // 快手极速版
  "com.kuaishou.kwai",             // 快手
  "com.smile.gifmaker.guagua",     // 快手
  "com.kuaishou.nebula",           // 快手极速版
  // 哔哩哔哩
  "tv.danmaku.bili",              // 哔哩哔哩
  "com.bilibili.studio",          // 哔哩哔哩创作中心
  "tv.danmaku.bilibili",          // 哔哩哔哩
  "com.bilibili.studio",          // 哔哩哔哩创作中心
  // 视频/音乐/阅读
  "com.qiyi.video",               // 爱奇艺
  "com.qiyi.video.lite",          // 爱奇艺极速版
  "com.qiyi.video.pad",           // 爱奇艺HD
  "com.youku.phone",              // 优酷
  "com.youku.phone.lite",         // 优酷极速版
  "com.mgtv.mobile",              // 芒果TV
  "com.hunantv.imgo.activity",    // 芒果TV
  "com.tencent.qqlive",           // 腾讯视频
  "com.tencent.qqlive.lite",      // 腾讯视频极速版
  "com.kugou.android",            // 酷狗音乐
  "com.kugou.android.lite",       // 酷狗音乐极速版
  "com.kugou.fanxing",            // 酷狗直播
  "cn.kuwo.player",               // 酷我音乐
  "cmccwm.mobilemusic",           // 咪咕音乐
  "com.duowan.kiwi",              // 多看阅读
  "com.duokan.reader",            // 多看阅读
  "com.qidian.QDReader",          // 起点读书
  "com.qq.reader",                // QQ阅读
  "com.kmxs.reader",              // 掌阅
  "com.chineseall.reader",        // 咪咕阅读
  // 浏览器
  "com.ucbrowser",                // UC浏览器
  "com.uc.browser.en",            // UC浏览器国际版
  "com.UCMobile",                 // UC浏览器
  "com.UCMobile.intl",            // UC浏览器国际版
  "com.qq.browser",               // QQ浏览器
  "com.tencent.mtt",              // QQ浏览器
  "com.baidu.browser.apps",       // 百度浏览器
  "com.explore.webview",          // 百度浏览器
  "com.haoread.android",          // 好读
  "com.mmbox",                    // 2345浏览器
  "com.wandoujia.phoenix2",       // 豌豆荚
  "com.coolapk.market",           // 酷安
  "com.pp.assistant",             // PP助手
  // 输入法
  "com.sohu.inputmethod.sogou",   // 搜狗输入法
  "com.sohu.inputmethod.sogou.xiaomi", // 搜狗输入法小米版
  "com.sougou.android",           // 搜狗输入法
  "com.baidu.input",              // 百度输入法
  "com.iflytek.inputmethod",      // 讯飞输入法
  "com.cootek.smartinputv5",      // 触宝输入法
  "com.komoxo.octopusime",        // 章鱼输入法
  "com.jb.gokeyboard",            // GO键盘
  "com.touchtype.swiftkey",       // SwiftKey
  "com.google.android.inputmethod.latin", // Gboard
  // 地图/导航
  "com.autonavi.minimap",         // 高德地图
  "com.amap.android.ams",         // 高德地图
  "com.baidu.BaiduMap",           // 百度地图
  "com.tencent.map",              // 腾讯地图
  "com.mapbar.android.map",       // 图吧地图
  "com.sogou.map.android",        // 搜狗地图
  "com.navinfo.dist",             // 四维图新
  "com.ll.drclient",              // 导航犬
  "com.ublox.tools",              // 导航工具
  "com.amap.android.autonavi",    // 高德地图
  "com.baidu.naviapp",            // 百度导航
  "com.baidu.carlife",            // 百度CarLife
  "com.tencent.wecarnavi",        // 腾讯车联
  "com.autonavi.amapauto",        // 高德地图车机版
  // 银行/金融
  "com.icbc",                     // 工商银行
  "com.ccb.fun",                  // 建设银行
  "com.bankcomm",                 // 交通银行
  "com.chinamworld.main",         // 中国银行
  "com.cmbchina.ccd",             // 招商银行
  "com.cmbchina.uia",             // 招商银行
  "com.spdb.mobilebank",          // 浦发银行
  "com.citicbank.mobilebank",     // 中信银行
  "com.cmbc.ms",                  // 民生银行
  "com.hxb.mobilebank",           // 华夏银行
  "com.cgbchina.mobilebank",      // 广发银行
  "com.spdb.jowang",              // 浦发银行
  "com.cebbank.mobile",           // 光大银行
  "com.bankofchina",              // 中国银行
  "com.bocop",                    // 中国银行
  "com.hsbc.phone",               // 汇丰银行
  "com.standardchartered.sc",     // 渣打银行
  "com.cmbchina",                 // 招商银行
  "com.nci",                      // 中国人寿
  "com.pingan.bank",              // 平安银行
  "com.pingan.paclub",            // 平安金管家
  "com.pingan.life",              // 平安人寿
  "com.pingan.creditcard",        // 平安信用卡
  "com.cpic",                     // 中国太保
  "com.ccb",                      // 建设银行
  "com.abchina.mobilebank",       // 农业银行
  "com.abc",                      // 农业银行
  "com.chinawealth",              // 中银财富
  "com.cmbc",                     // 民生银行
  "com.cib",                      // 兴业银行
  "com.bankcomm",                 // 交通银行
  "com.cgbchina.bank",            // 广发银行
  "com.cmbchina.ccd",             // 招商银行
  "com.spdb",                     // 浦发银行
  "com.hxb",                      // 华夏银行
  "com.citicbank",                // 中信银行
  "com.cebbank",                  // 光大银行
  "com.boc",                      // 中国银行
  "com.hsbc",                     // 汇丰银行
  "com.sc",                       // 渣打银行
  "com.cmb",                      // 招商银行
  "com.nci",                      // 中国人寿
  "com.pingan",                   // 平安
  "com.cpic",                     // 中国太保
  "com.ccb",                      // 建设银行
  "com.abchina",                  // 农业银行
  "com.abc",                      // 农业银行
  "com.chinawealth",              // 中银财富
  "com.cmbc",                     // 民生银行
  "com.cib",                      // 兴业银行
  "com.bankcomm",                 // 交通银行
  "com.cgbchina",                 // 广发银行
  "com.cmbchina",                 // 招商银行
  "com.spdb",                     // 浦发银行
  "com.hxb",                      // 华夏银行
  "com.citicbank",                // 中信银行
  "com.cebbank",                  // 光大银行
  "com.boc",                      // 中国银行
  "com.hsbc",                     // 汇丰银行
  "com.sc",                       // 渣打银行
  "com.cmb",                      // 招商银行
  // 证券/股票
  "com.fxzq.flzq",                // 方正证券
  "com.hexin.plat.android",       // 同花顺
  "com.eastmoney.android.quotation", // 东方财富
  "com.kaixinbanjin.android",     // 开心证券
  "com.huatai.gl",                // 华泰证券
  "com.gtja.app",                 // 国泰君安
  "com.swhyscMobile",             // 申万宏源
  "com.htfund",                   // 华夏基金
  "com.xyh.android",              // 雪球
  "com.eastmoney.android.quotation", // 东方财富
  "com.fxzq",                     // 方正证券
  // 支付/钱包
  "com.tenpay.android",           // 财付通
  "com.tenpay.wx",                // 微信支付
  "com.unionpay",                 // 银联
  "com.unionpay.tsms",            // 银联安全
  "com.unionpay.mobile",          // 银联钱包
  "com.chinapnr",                 // 汇付天下
  "com.lakala",                   // 拉卡拉
  "com.yeepay",                   // 易宝支付
  "com.99bill",                   // 快钱
  "com.ipaynow",                  // 现在支付
  "com.umpay",                    // 联动优势
  "com.chinapay",                 // 银联商务
  "com.allinpay",                 // 通联支付
  "com.bill99",                   // 快钱
  "com.tenpay",                   // 财付通
  "com.unionpay",                 // 银联
  "com.unionpay.mobile",          // 银联钱包
  "com.unionpay.tsms",            // 银联安全
  "com.chinapnr",                 // 汇付天下
  "com.lakala",                   // 拉卡拉
  "com.yeepay",                   // 易宝支付
  "com.99bill",                   // 快钱
  "com.ipaynow",                  // 现在支付
  "com.umpay",                    // 联动优势
  "com.chinapay",                 // 银联商务
  "com.allinpay",                 // 通联支付
  "com.bill99",                   // 快钱
  "com.tenpay",                   // 财付通
  "com.alipay.android.app",       // 支付宝
  "com.eg.android.AlipayGphone",  // 支付宝
  "com.alipay.android.phone.openmember", // 蚂蚁会员
  "com.alipay.kit",               // 支付宝
  "com.alipay.mobile.client",     // 支付宝
  "com.alipay.android.app.smartface", // 支付宝
  "com.alipay.baichuan",          // 百川
  "com.alipay.android.app.AlipayGphone", // 支付宝
  // 外卖/生鲜
  "com.sankuai.meituan.takeout",  // 美团外卖
  "com.meituan.meituanwaimai",    // 美团外卖
  "com.ele.me",                   // 饿了么
  "com.ele.me.lite",              // 饿了么极速版
  "com.luojilab.app",             // 得到
  "com.ddxq.market",              // 叮咚买菜
  "com.missfresh.application",    // 每日优鲜
  "com.dili7.mall",               // 谊品生鲜
  "com.xingsheng",                // 兴盛优选
  "com.commchina.club",           // 社区团购
  "com.pupumall.customer",        // 朴朴超市
  "com.hualala",                  // 哗啦啦
  "com.jdbcxb",                   // 京东到家
  "com.dangdang",                 // 当当
  "com.dangdang.buy",             // 当当
  "com.bookuu",                   // 博库
  "com.yhd",                      // 1号店
  "com.suninventory",             // 苏宁
  "com.suning.mobile",            // 苏宁易购
  "com.suning.search",            // 苏宁
  "com.gome.eshop",               // 国美
  "com.womai",                    // 我买网
  "com.zhongan",                  // 众安保险
  "com.zhongan.health",           // 众安健康
  "com.pingan.health",            // 平安健康
  "com.jdhealth",                 // 京东健康
  "com.alibaba.health",           // 阿里健康
  "com.we Doctor",                // 微医
  "com.120ask",                   // 快速问医生
  "com.chunyu",                   // 春雨医生
  "com.dxy",                      // 丁香园
  "com.haodf",                    // 好大夫在线
  "com.guahao",                   // 挂号网
  "com.jkys",                     // 健康160
  "com.baidu.health",             // 百度健康
  // 教育/学习
  "com.zhangyue.reader",          // 掌阅
  "com.youdao.dict",              // 有道词典
  "com.youdao.note",              // 有道云笔记
  "com.netease.yanxuan",          // 网易严选
  "com.kaoyan",                   // 考研帮
  "com.babybus",                  // 宝宝巴士
  "com.tal.tan",                  // 学而思
  "com.zuoyebang",                // 作业帮
  "com.fenbi.android",            // 粉笔
  "com.huatu",                    // 华图
  "com.offcn",                    // 中公教育
  "com.koolearn",                 // 新东方
  "com.zhihu",                    // 知乎
  "com.zhihu.android",            // 知乎
  "com.guokr",                    // 果壳
  "com.douban",                   // 豆瓣
  "com.ruguoapp.momo",            // 陌陌
  "com.immomo",                   // 陌陌
  "com.p1.mobile.putong",         // 探探
  "com.tantanapp",                // 探探
  "com.soulapp",                  // Soul
  "com.yidui",                    // 伊对
  "com.yiyaoyao",                 // 咿呀
  "com.blued",                    // Blued
  "com.ulife.android",            // Uki
  "com.pipi",                     // 皮皮
  "com.yiya",                     // 伊呀
  "com.aloha",                    // Aloha
  "com.woa",                      // 积目
  "com.yueyu",                    // 月月
  "com.liyan",                    // 立业
  "com.jiayuan",                  // 世纪佳缘
  "com.baihe",                    // 百合网
  "com.zhenai",                   // 珍爱网
  "com.youyuan",                  // 友缘
  "com.tanlove",                  // 探探
  "com.yidui",                    // 伊对
  // 旅游/出行
  "ctrip.android.view",           // 携程
  "ctrip.android",                // 携程
  "com.Qunar",                    // 去哪儿
  "com.flightmanager.view",       // 航班管家
  "com.tongcheng.android",        // 同程旅行
  "com.lvmama.android",           // 驴妈妈
  "com.mfw.roadbook",             // 马蜂窝
  "com.haoyezi.android",          // 好叶子
  "com.elong.app",                // 艺龙
  "com.travelsky",                // 航旅纵横
  "com.csair",                    // 南方航空
  "com.airchina",                 // 国航
  "com.ceair",                    // 东方航空
  "com.huaxia",                   // 华夏航空
  "com.hainan.airlines",          // 海南航空
  "com.shenzhenair",              // 深圳航空
  "com.shandongair",              // 山东航空
  "com.xiamenair",                // 厦门航空
  "com.springairlines",           // 春秋航空
  "com.westair",                  // 西部航空
  "com.chengduair",               // 成都航空
  "com.guangxiair",               // 北部湾航空
  "com.kmair",                    // 昆明航空
  "com.urt",                      // 乌鲁木齐航空
  "com.fuzhouair",                // 福州航空
  "com.lijiangair",               // 丽江航空
  "com.gzair",                    // 贵阳航空
  "com.hebeiair",                 // 河北航空
  "com.jiangxiair",               // 江西航空
  "com.anan",                     // 安阳航空
  "com.wenzhouair",               // 温州航空
  "com.luxiang",                  // 陇南航空
  "com.tianshan",                 // 天山航空
  "com.caac",                     // 中国民航
  "com.caa",                      // 中国航信
  "com.ctrip.android",            // 携程
  "com.Qunar",                    // 去哪儿
  // 政务/生活
  "com.gtgj.view",                // 高铁管家
  "com.MobileTicket",             // 铁路12306
  "com.railway.app",              // 铁路12306
  "com.ctsi",                     // 中国交通
  "com.gov.12345",                // 12345
  "cn.gov.customs",               // 海关
  "com.alipay.android.app.smartface", // 支付宝
  "com.eg.android.AlipayGphone",  // 支付宝
  "com.tencent.mm",               // 微信
  "com.tencent.mobileqq",         // QQ
  // 运营商
  "com.greenpoint.android.mc10086.activity", // 中国移动
  "com.chinamobile.mcloud",        // 中国移动
  "com.greenpoint.wisdom",         // 中国移动
  "com.ct.client",                 // 中国电信
  "com.chinatelecom.bestpay",      // 电信翼支付
  "com.chinatelecom.bestpay.android", // 电信翼支付
  "com.unicom.wopay",              // 联通沃支付
  "com.unicom.wostore",           // 联通沃商店
  "com.unicom.softsim",           // 联通
  "com.unicom.android",           // 联通手机营业厅
  "com.chinaunicom",              // 联通
  "com.chinamobile",              // 移动
  "com.chinatelecom",             // 电信
  "com.cmcc",                      // 移动
  "com.cmccwm.mobilemusic",        // 咪咕音乐
  "com.cmccwm.mobilevideo",        // 咪咕视频
  "com.cmccwm.mobilenovel",        // 咪咕阅读
  "com.cmccwm.mobilegame",         // 咪咕游戏
  "com.cmccwm.mobilelive",         // 咪咕直播
  "com.cmccwm.mobilecomic",        // 咪咕漫画
  "com.cmccwm.mobiletv",           // 咪咕视频
  "com.cmccwm.mobilecartoon",      // 咪咕动漫
  "com.cmccwm.mobilekids",         // 咪咕少儿
  "com.cmccwm.mobileedu",          // 咪咕学堂
  "com.cmccwm.mobilehealth",       // 咪咕健康
  "com.cmccwm.mobilefinance",      // 咪咕金融
  "com.cmccwm.mobiletravel",       // 咪咕旅游
  "com.cmccwm.mobilesport",        // 咪咕运动
  "com.cmccwm.mobilemusic.lite",   // 咪咕音乐极速版
  "com.cmccwm.mobilevideo.lite",   // 咪咕视频极速版
  "com.cmccwm.mobilenovel.lite",   // 咪咕阅读极速版
  "com.cmccwm.mobilegame.lite",    // 咪咕游戏极速版
  "com.cmccwm.mobilelive.lite",    // 咪咕直播极速版
  "com.cmccwm.mobilecomic.lite",   // 咪咕漫画极速版
  "com.cmccwm.mobiletv.lite",      // 咪咕视频极速版
  "com.cmccwm.mobilecartoon.lite", // 咪咕动漫极速版
  "com.cmccwm.mobilekids.lite",    // 咪咕少儿极速版
  "com.cmccwm.mobileedu.lite",     // 咪咕学堂极速版
  "com.cmccwm.mobilehealth.lite",  // 咪咕健康极速版
  "com.cmccwm.mobilefinance.lite", // 咪咕金融极速版
  "com.cmccwm.mobiletravel.lite",  // 咪咕旅游极速版
  "com.cmccwm.mobilesport.lite",   // 咪咕运动极速版
  // 小米系
  "com.miui.securitycenter",       // 小米安全中心
  "com.miui.gallery",              // 小米相册
  "com.miui.calculator",           // 小米计算器
  "com.miui.notes",                // 小米便签
  "com.miui.weather2",             // 小米天气
  "com.miui.videoplayer",          // 小米视频
  "com.miui.player",               // 小米音乐
  "com.miui.cleanmaster",          // 小米清理大师
  "com.miui.packageinstaller",     // 小米安装器
  "com.miui.huanji",               // 小米换机
  "com.miui.cloudservice",         // 小米云服务
  "com.miui.backup",               // 小米备份
  "com.miui.miuibbs",              // 小米社区
  "com.miui.miwallpaper",          // 小米壁纸
  "com.miui.voiceassist",          // 小米语音助手
  "com.miui.miservice",            // 小米服务
  "com.miui.msa",                  // 小米广告服务
  "com.miui.analytics",            // 小米统计
  "com.miui.daemon",               // 小米守护进程
  "com.miui.browser",              // 小米浏览器
  "com.miui.fm",                   // 小米收音机
  "com.miui.compass",              // 小米指南针
  "com.miui.newmidrive",           // 小米云盘
  "com.miui.miwifi",               // 小米WiFi
  "com.miui.misound",              // 小米音效
  "com.miui.mimusic",              // 小米音乐
  "com.miui.mivideo",              // 小米视频
  "com.miui.migallery",            // 小米相册
  "com.miui.micalendar",           // 小米日历
  "com.miui.miclock",              // 小米时钟
  "com.miui.mirecorder",           // 小米录音机
  "com.miui.miscreenrecorder",     // 小米屏幕录制
  "com.miui.miscan",               // 小米扫描
  "com.miui.micard",               // 小米卡片
  "com.miui.mismart",              // 小米智能
  "com.miui.mihome",               // 小米桌面
  "com.miui.milive",               // 小米直播
  "com.miui.mimusic.lite",         // 小米音乐极速版
  "com.miui.mivideo.lite",         // 小米视频极速版
  "com.miui.migallery.lite",       // 小米相册极速版
  "com.miui.micalendar.lite",      // 小米日历极速版
  "com.miui.miclock.lite",         // 小米时钟极速版
  "com.miui.mirecorder.lite",      // 小米录音机极速版
  "com.miui.miscreenrecorder.lite", // 小米屏幕录制极速版
  "com.miui.miscan.lite",          // 小米扫描极速版
  "com.miui.micard.lite",          // 小米卡片极速版
  "com.miui.mismart.lite",         // 小米智能极速版
  "com.miui.mihome.lite",          // 小米桌面极速版
  "com.miui.milive.lite",          // 小米直播极速版
  "com.xiaomi.gamecenter",         // 小米游戏中心
  "com.xiaomi.shop",               // 小米商城
  "com.xiaomi.market",             // 小米应用商店
  "com.xiaomi.midrop",             // 小米快传
  "com.xiaomi.miplay",             // 小米投屏
  "com.xiaomi.micloud.sdk",        // 小米云SDK
  "com.xiaomi.miapi",              // 小米API
  "com.xiaomi.pass",               // 小米通行证
  "com.xiaomi.mico",               // 小米
  "com.xiaomi.mimovie",            // 小米电影
  "com.xiaomi.mitv",               // 小米电视
  "com.xiaomi.miwatch",            // 小米手表
  "com.xiaomi.miband",             // 小米手环
  "com.xiaomi.miui",               // 小米UI
  "com.xiaomi.smarthome",          // 米家
  "com.xiaomi.hm.health",          // 小米健康
  "com.xiaomi.wifipassword",       // 小米WiFi密码
  "com.xiaomi.mi_connect_service", // 小米互联服务
  "com.xiaomi.mi_cool",            // 小米
  "com.xiaomi.miui.daemon",        // 小米守护进程
  "com.xiaomi.miui.analytics",     // 小米统计
  "com.xiaomi.miui.browser",       // 小米浏览器
  "com.xiaomi.miui.fm",            // 小米收音机
  "com.xiaomi.miui.compass",       // 小米指南针
  "com.xiaomi.miui.newmidrive",    // 小米云盘
  "com.xiaomi.miui.miwifi",        // 小米WiFi
  "com.xiaomi.miui.misound",       // 小米音效
  "com.xiaomi.miui.mimusic",       // 小米音乐
  "com.xiaomi.miui.mivideo",       // 小米视频
  "com.xiaomi.miui.migallery",     // 小米相册
  "com.xiaomi.miui.micalendar",    // 小米日历
  "com.xiaomi.miui.miclock",       // 小米时钟
  "com.xiaomi.miui.mirecorder",    // 小米录音机
  "com.xiaomi.miui.miscreenrecorder", // 小米屏幕录制
  "com.xiaomi.miui.miscan",        // 小米扫描
  "com.xiaomi.miui.micard",        // 小米卡片
  "com.xiaomi.miui.mismart",       // 小米智能
  "com.xiaomi.miui.mihome",        // 小米桌面
  "com.xiaomi.miui.milive",        // 小米直播
  "com.xiaomi.miui.mimusic.lite",  // 小米音乐极速版
  "com.xiaomi.miui.mivideo.lite",  // 小米视频极速版
  "com.xiaomi.miui.migallery.lite", // 小米相册极速版
  "com.xiaomi.miui.micalendar.lite", // 小米日历极速版
  "com.xiaomi.miui.miclock.lite",   // 小米时钟极速版
  "com.xiaomi.miui.mirecorder.lite", // 小米录音机极速版
  "com.xiaomi.miui.miscreenrecorder.lite", // 小米屏幕录制极速版
  "com.xiaomi.miui.miscan.lite",    // 小米扫描极速版
  "com.xiaomi.miui.micard.lite",    // 小米卡片极速版
  "com.xiaomi.miui.mismart.lite",   // 小米智能极速版
  "com.xiaomi.miui.mihome.lite",    // 小米桌面极速版
  "com.xiaomi.miui.milive.lite",    // 小米直播极速版
  "com.xiaomi.gamecenter",          // 小米游戏中心
  "com.xiaomi.shop",                // 小米商城
  "com.xiaomi.market",              // 小米应用商店
  "com.xiaomi.midrop",              // 小米快传
  "com.xiaomi.miplay",             // 小米投屏
  "com.xiaomi.micloud.sdk",         // 小米云SDK
  "com.xiaomi.miapi",               // 小米API
  "com.xiaomi.pass",                // 小米通行证
  "com.xiaomi.mico",                // 小米
  "com.xiaomi.mimovie",             // 小米电影
  "com.xiaomi.mitv",                // 小米电视
  "com.xiaomi.miwatch",             // 小米手表
  "com.xiaomi.miband",              // 小米手环
  "com.xiaomi.miui",                // 小米UI
  "com.xiaomi.smarthome",           // 米家
  "com.xiaomi.hm.health",           // 小米健康
  "com.xiaomi.wifipassword",        // 小米WiFi密码
  "com.xiaomi.mi_connect_service",  // 小米互联服务
  "com.xiaomi.mi_cool",             // 小米
  "com.xiaomi.miui.daemon",         // 小米守护进程
  "com.xiaomi.miui.analytics",      // 小米统计
  "com.xiaomi.miui.browser",        // 小米浏览器
  "com.xiaomi.miui.fm",             // 小米收音机
  "com.xiaomi.miui.compass",        // 小米指南针
  "com.xiaomi.miui.newmidrive",     // 小米云盘
  "com.xiaomi.miui.miwifi",         // 小米WiFi
  "com.xiaomi.miui.misound",        // 小米音效
  "com.xiaomi.miui.mimusic",        // 小米音乐
  "com.xiaomi.miui.mivideo",        // 小米视频
  "com.xiaomi.miui.migallery",      // 小米相册
  "com.xiaomi.miui.micalendar",     // 小米日历
  "com.xiaomi.miui.miclock",        // 小米时钟
  "com.xiaomi.miui.mirecorder",     // 小米录音机
  "com.xiaomi.miui.miscreenrecorder", // 小米屏幕录制
  "com.xiaomi.miui.miscan",         // 小米扫描
  "com.xiaomi.miui.micard",         // 小米卡片
  "com.xiaomi.miui.mismart",        // 小米智能
  "com.xiaomi.miui.mihome",         // 小米桌面
  "com.xiaomi.miui.milive",         // 小米直播
  "com.xiaomi.gamecenter",          // 小米游戏中心
  "com.xiaomi.shop",                // 小米商城
  "com.xiaomi.market",              // 小米应用商店
  "com.xiaomi.midrop",              // 小米快传
  "com.xiaomi.miplay",             // 小米投屏
  "com.xiaomi.micloud.sdk",         // 小米云SDK
  "com.xiaomi.miapi",               // 小米API
  "com.xiaomi.pass",                // 小米通行证
  "com.xiaomi.mico",                // 小米
  "com.xiaomi.mimovie",             // 小米电影
  "com.xiaomi.mitv",                // 小米电视
  "com.xiaomi.miwatch",             // 小米手表
  "com.xiaomi.miband",              // 小米手环
  "com.xiaomi.miui",                // 小米UI
  "com.xiaomi.smarthome",           // 米家
  "com.xiaomi.hm.health",           // 小米健康
  "com.xiaomi.wifipassword",        // 小米WiFi密码
  "com.xiaomi.mi_connect_service",  // 小米互联服务
  "com.xiaomi.mi_cool",             // 小米
  // 热门游戏 (专有包名, 应用商店爬不到)
  "com.tencent.tmgp.sgame",         // 王者荣耀
  "com.tencent.tmgp.pubgmhd",       // 和平精英
  "com.tencent.tmgp.pubg",          // PUBG Mobile
  "com.tencent.tmgp.cod",           // 使命召唤手游
  "com.tencent.tmgp.cf",            // 穿越火线手游
  "com.tencent.tmgp.speedmobile",   // QQ飞车手游
  "com.tencent.tmgp.jx3",           // 剑侠情缘
  "com.tencent.tmgp.dnf",           // 地下城与勇士手游
  "com.tencent.tmgp.naruto",        // 火影忍者手游
  "com.miHoYo.Yuanshen",            // 原神
  "com.mihoyo.hkrpg",               // 崩坏星穹铁道
  "com.mihoyo.bh3",                 // 崩坏3
  "com.mihoyo.zzz",                 // 绝区零
  "com.netease.mc",                 // 我的世界 (已有, 去重无害)
  "com.netease.id5",                // 第五人格
  "com.netease.yys",                // 阴阳师
  "com.netease.mrzh",               // 明日之后
  "com.netease.qnm",                // 倩女幽魂手游
  "com.netease.tx2",                // 天谕
  "com.netease.hyxd",               // 荒野行动
  "com.hypergryph.arknights",       // 明日方舟
  "com.leiting.lostlight",          // 萤火突击
  "com.tencent.lolm",               // 英雄联盟手游
  "com.tencent.tmgp.gnyxz",         // 光与夜之恋
  "com.papegames.lysk",             // 恋与深空
  // 社区/内容 (专有包名补充)
  "com.douban.frodo",               // 豆瓣
  "com.ximalaya.ting.android",      // 喜马拉雅
  "com.ximalaya.ting.lite",         // 喜马拉雅极速版
  "com.ifeng.news",                 // 凤凰新闻
  "com.sohu.newsapp",               // 搜狐新闻
  "com.sohu.newsclient",            // 搜狐新闻客户端
  "com.tencent.news",               // 腾讯新闻 (已有, 去重无害)
  // 办公/效率
  "com.wps.moffice",                // WPS Office
  "com.wps.moffice.eng",            // WPS Office英文版
  "com.tencent.wework",             // 企业微信
  "com.alibaba.android.rimet",      // 钉钉 (已有, 去重无害)
  "com.ss.android.lark",            // 飞书 (已有, 去重无害)
  "com.tencent.docs",               // 腾讯文档 (已有, 去重无害)
  "com.tencent.weread",             // 微信读书 (已有, 去重无害)
  "com.youdao.note",                // 有道云笔记 (已有, 去重无害)
  // 安全/工具
  "com.qihoo360.mobilesafe",        // 360手机卫士
  "com.qihoo.appstore",             // 360手机助手
  "com.tencent.qqpimsecure",        // 腾讯手机管家
  "com.cleanmaster.mguard",         // 猎豹清理大师
  "com.lbe.security",               // LBE安全大师
  "com.ijinshan.kbatterydoctor",    // 金山电池医生
  // 电商补充
  "com.achievo.vipshop",            // 唯品会
  "com.netease.kaola",              // 网易考拉/考拉海购
  "com.mogujie",                    // 蘑菇街
  "com.meilishuo",                  // 美丽说
  "com.jumei",                      // 聚美优品
  "com.vmall.client",               // 华为商城
  "com.huawei.himovie",             // 华为视频
  "com.huawei.music",               // 华为音乐
  "com.huawei.reader",              // 华为阅读
  // 出行/生活补充
  "com.sdu.didi.psnger",            // 滴滴出行 (已有, 去重无害)
  "com.didapinche",                 // 嘀嗒出行
  "com.hellobike",                  // 哈啰出行
  "com.qingju",                     // 青桔单车
  "com.meituan.motorbike",          // 美团单车
  "com.ofo",                        // ofo小黄车
  "com.mobike",                     // 摩拜单车
  "com.flightmanager.view",         // 航班管家 (已有, 去重无害)
  "com.variflight",                 // 飞常准
  "com.trip",                       // Trip.com
  "com.tongcheng.android",          // 同程旅行 (已有, 去重无害)
  "com.lvmama.android",             // 驴妈妈 (已有, 去重无害)
  "com.mfw.roadbook",               // 马蜂窝 (已有, 去重无害)
  // 金融补充
  "com.lufax.android",              // 陆金所
  "com.jd.jrbank",                  // 京东金融
  "com.jd.jrapp",                   // 京东金融 (已有, 去重无害)
  "com.tianhong.fund",              // 天弘基金
  "com.chinaamc",                   // 华夏基金
  "com.efund",                      // 易方达
  "com.gffunds",                    // 广发基金
  "com.jsfund",                     // 嘉实基金
  "com.syf",                        // 蚂蚁财富
  "com.tencent.licai",              // 腾讯理财通
  // 用户反馈补充 (已核实包名)
  "com.tencent.tmgp.dfm",           // 三角洲行动
  "com.netease.sky",                // 光遇 (国服)
  "com.crgt.ilife",                 // 国铁吉讯 (原掌上高铁)
  "com.tmri.app.main",              // 交管12123
];

async function crawlGooglePlay() {
  console.log("[Google Play] Starting crawl...");
  const allPackages = new Set();
  const cnPackages = new Set();
  const categories = Object.values(gplay.category);

  // Build all (country, category) tasks upfront; run with a fixed
  // concurrency pool. ~240 tasks at 500ms / 4 = ~30s vs ~2 min serial.
  const tasks = [];
  for (const country of COUNTRIES) {
    for (const category of categories) {
      tasks.push({ country, category });
    }
  }
  const GP_CONCURRENCY = 4;
  console.log(
    `[Google Play] ${tasks.length} tasks (${COUNTRIES.length} countries x ${categories.length} categories), concurrency=${GP_CONCURRENCY}`
  );

  // Track per-country results so the final per-country summary stays.
  const perCountryTotals = Object.fromEntries(COUNTRIES.map((c) => [c, 0]));

  const fetchOne = async ({ country, category }) => {
    const apps = await gplay.list({
      category,
      collection: gplay.collection.TOP_FREE,
      num: TOP_N_PER_CATEGORY,
      country,
      lang: "en",
    });
    // Politeness delay lives in the worker (between tasks) so it gates
    // *fetch* rate, not result-logging rate. The pool's throughput is
    // 4 requests in parallel; this delay keeps total RPS bounded at
    // 4 / DELAY_MS = ~8 RPS, matching the original serial behavior.
    await sleep(DELAY_MS);
    return { country, category, apps };
  };

  const results = await runConcurrent(tasks, GP_CONCURRENCY, fetchOne);

  for (const { item, value, error } of results) {
    if (error) {
      // "Could not ..." = category unavailable in this country, skip silently.
      // Anything else: log once.
      if (!(error.message && error.message.includes("Could not"))) {
        console.error(`  [${item.country}] ${item.category}: ERROR - ${error.message}`);
      }
      continue;
    }
    const { country, category, apps } = value;
    for (const app of apps) {
      allPackages.add(app.appId);
      if (country === "cn") {
        cnPackages.add(app.appId);
      }
    }
    }
    perCountryTotals[country] += apps.length;
    console.log(
      `  [${country}] ${category}: +${apps.length} apps (total: ${allPackages.size})`
    );
  }

  for (const country of COUNTRIES) {
    console.log(
      `[Google Play] ${country} done: +${perCountryTotals[country]} apps`
    );
  }

  return {
    allPackages: [...allPackages],
    cnPackages: [...cnPackages],
  };
}

async function crawlWandoujia() {
  console.log("[Wandoujia] Starting crawl...");
  const packages = new Set();
  const RESOURCE_TYPES = [0, 1]; // 0 = 应用榜, 1 = 游戏榜
  const MAX_PAGES = 60;
  // Fail fast when the network blocks wandoujia.com (e.g. datacenter IPs):
  // a few consecutive errors aborts the whole source instead of grinding
  // through all pages. Local runs from mainland China networks are unaffected.
  const MAX_CONSECUTIVE_ERRORS = 3;
  let consecutiveErrors = 0;
  let aborted = false;

  const recordError = (where) => {
    consecutiveErrors++;
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.log(
        `[Wandoujia] ${consecutiveErrors} consecutive errors (${where}), aborting source (likely blocked from this network)`
      );
      aborted = true;
    }
  };

  for (const resourceType of RESOURCE_TYPES) {
    if (aborted) break;
    for (let page = 1; page <= MAX_PAGES; page++) {
      if (aborted) break;
      try {
        const url = `https://www.wandoujia.com/wdjweb/api/top/more?resourceType=${resourceType}&page=${page}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            Referer: "https://www.wandoujia.com/top/app",
          },
        });
        if (!res.ok) {
          console.log(
            `  [wdj] type=${resourceType} page=${page}: HTTP ${res.status}, stop`
          );
          recordError(`HTTP ${res.status}`);
          break;
        }
        const json = await res.json();
        const content = (json && json.data && json.data.content) || "";
        const matches = content.match(/data-pn="([^"]+)"/g) || [];
        if (matches.length === 0) {
          console.log(
            `  [wdj] type=${resourceType} page=${page}: empty, stop`
          );
          consecutiveErrors = 0;
          break;
        }
        consecutiveErrors = 0;
        let added = 0;
        for (const m of matches) {
          const pn = m.slice(9, -1);
          if (pn && !packages.has(pn)) {
            packages.add(pn);
            added++;
          }
        }
        console.log(
          `  [wdj] type=${resourceType} page=${page}: +${added} (total: ${packages.size})`
        );
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(
          `  [wdj] type=${resourceType} page=${page}: ERROR - ${err.message}`
        );
        recordError(err.message);
        if (!aborted) await sleep(DELAY_MS * 2);
      }
    }
  }

  console.log(`[Wandoujia] Found ${packages.size} packages`);
  return [...packages];
}

async function crawlXiaomi() {
  console.log("[Xiaomi] Starting crawl...");
  const packages = new Set();
  const MAX_CATEGORY_ID = 40;
  const PAGES_PER_CATEGORY = 4; // top pages per category = most popular
  const PAGE_SIZE = 30;
  const MAX_CONSECUTIVE_ERRORS = 3;
  let consecutiveErrors = 0;
  let aborted = false;

  const fetchJson = async (url) => {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Referer: "https://app.mi.com/",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const apiUrl = (page, categoryId) =>
    `https://app.mi.com/categotyAllListApi?page=${page}&categoryId=${categoryId}&pageSize=${PAGE_SIZE}`;

  // Probe category IDs 1..40, crawl top pages of the valid ones
  for (
    let categoryId = 1;
    categoryId <= MAX_CATEGORY_ID && !aborted;
    categoryId++
  ) {
    let first;
    try {
      first = await fetchJson(apiUrl(0, categoryId));
    } catch (err) {
      // HTTP 4xx / empty = invalid category (skip silently);
      // network errors / 5xx may mean blocking -> count toward abort
      if (/HTTP 4\d\d/.test(err.message)) {
        await sleep(DELAY_MS);
        continue;
      }
      console.error(`  [mi] probe category=${categoryId}: ${err.message}`);
      if (++consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.log(
          `[Xiaomi] ${consecutiveErrors} consecutive errors, aborting source (likely blocked from this network)`
        );
        aborted = true;
      }
      await sleep(DELAY_MS);
      continue;
    }
    const firstList = (first && first.data) || [];
    if (firstList.length === 0) {
      await sleep(DELAY_MS);
      continue; // invalid/empty category
    }
    consecutiveErrors = 0;
    for (let page = 0; page < PAGES_PER_CATEGORY && !aborted; page++) {
      try {
        const json = page === 0 ? first : await fetchJson(apiUrl(page, categoryId));
        const apps = (json && json.data) || [];
        if (apps.length === 0) break;
        consecutiveErrors = 0;
        let added = 0;
        for (const app of apps) {
          if (app && app.packageName && !packages.has(app.packageName)) {
            packages.add(app.packageName);
            added++;
          }
        }
        console.log(
          `  [mi] category=${categoryId} page=${page}: +${added} (total: ${packages.size})`
        );
        if (json.hasNext === false) break;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(
          `  [mi] category=${categoryId} page=${page}: ERROR - ${err.message}`
        );
        if (++consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.log(
            `[Xiaomi] ${consecutiveErrors} consecutive errors, aborting source`
          );
          aborted = true;
        } else {
          await sleep(DELAY_MS * 2);
        }
      }
    }
  }

  console.log(`[Xiaomi] Found ${packages.size} packages`);
  return [...packages];
}

// ---------------------------------------------------------------------------
// Coolapk (v6 API, v3 X-App-Token)
//
// Key material (phase2) is pinned in coolapk_auth.json, extracted once from
// lib/arm64-v8a/libauth.so of the official APK - the CI never downloads the
// ~110MB APK. If the API starts rejecting tokens, Coolapk likely rotated its
// keys: re-extract phase2 from a new APK (see tools/crawler/README.md).
// $2y$ and $2a$ bcrypt outputs are byte-identical; bcryptjs cannot emit $2y$,
// so we hash with $2a$ and restore the $2y$ marker before base64 encoding.
// ---------------------------------------------------------------------------
const COOLAPK_B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function loadCoolapkAuth() {
  return JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, "coolapk_auth.json"), "utf-8")
  );
}

function coolapkToken(auth, ts) {
  const phase2 = Buffer.from(auth.phase2, "base64");
  const vc = auth.versionCode;
  const idx = ((ts + vc) % 100) * 4 + 0x80;
  if (idx + 0x80 > phase2.length) {
    throw new Error(`coolapk idx out of range: ${idx}`);
  }
  const chunk = phase2.subarray(idx, idx + 0x80);
  const segment = Buffer.from(chunk.toString("latin1"), "base64");
  const md5dev = crypto
    .createHash("md5")
    .update(auth.device, "utf8")
    .digest("hex");
  const plain = Buffer.concat([
    Buffer.from(auth.package, "ascii"),
    Buffer.from("&"),
    segment,
    Buffer.from("&"),
    Buffer.from(md5dev, "ascii"),
    Buffer.from("&"),
    Buffer.from(String(ts), "ascii"),
    Buffer.from("&"),
    Buffer.from(String(vc), "ascii"),
  ]);
  const pw = crypto.createHash("md5").update(plain.toString("base64")).digest("hex");
  const md5plain = crypto.createHash("md5").update(plain).digest("hex");
  const saltSrc = Buffer.from(ts.toString(16) + "/" + md5plain, "ascii")
    .toString("base64")
    .replace(/=+$/, "");
  let s22 = saltSrc.slice(0, 22);
  const li = COOLAPK_B64.indexOf(s22[21]);
  s22 = s22.slice(0, 21) + COOLAPK_B64[(li - 5 + 64) % 64];
  const hashed = bcrypt.hashSync(pw, "$2a$10$" + s22);
  return (
    "v3" +
    Buffer.from("$2y$" + hashed.slice(4), "ascii")
      .toString("base64")
      .replace(/=+$/, "")
  );
}

function coolapkHeaders(auth, token) {
  return {
    "User-Agent": auth.userAgent,
    "X-Requested-With": "XMLHttpRequest",
    "X-Sdk-Int": "35",
    "X-Sdk-Locale": "zh-CN",
    "X-App-Id": "com.coolapk.market",
    "X-App-Token": token,
    "X-App-Version": auth.appVersion,
    "X-App-Code": String(auth.versionCode),
    "X-Api-Version": "16",
    "X-App-Device": auth.device,
    "X-Dark-Mode": "0",
    "X-App-Channel": "coolapk",
    "X-App-Mode": "universal",
    "X-App-Supported": String(auth.versionCode),
  };
}

// Package names appear as "packageName" fields and coolmarket:///apk/ URLs.
function extractCoolapkPackages(text, packages) {
  let added = 0;
  const patterns = [
    /"packageName"\s*:\s*"([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)"/g,
    /coolmarket:\/\/apk\/([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)/g,
    /coolapk\.com\/apk\/([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (!packages.has(m[1])) {
        packages.add(m[1]);
        added++;
      }
    }
  }
  return added;
}

async function crawlCoolapk() {
  console.log("[Coolapk] Starting crawl...");
  const packages = new Set();

  let auth;
  try {
    auth = loadCoolapkAuth();
  } catch (err) {
    console.log(`[Coolapk] cannot load coolapk_auth.json (${err.message}), skip source`);
    return [];
  }

  // pyca/bcrypt rejects some salts from the app algorithm; try a small
  // forward timestamp window like the reference implementation.
  const startTs = Math.floor(Date.now() / 1000);
  let token = null;
  let saltErr = null;
  for (let off = 0; off <= 10; off++) {
    try {
      token = coolapkToken(auth, startTs + off);
      saltErr = null;
      break;
    } catch (err) {
      saltErr = err;
    }
  }
  if (!token) {
    console.log(`[Coolapk] token generation failed (${saltErr?.message}), skip source`);
    return [];
  }
  const headers = coolapkHeaders(auth, token);

  const fetchText = async (url) => {
    const res = await fetch(url, { headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
    }
    // NOTE: list endpoints return {data:[...]} with NO top-level status
    // field - only treat an explicit non-1 status as an error.
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`non-JSON response: ${text.slice(0, 120)}`);
    }
    if (json.status !== undefined && json.status !== 1) {
      throw new Error(`api status=${json.status}: ${text.slice(0, 160)}`);
    }
    if (json.data === undefined) {
      throw new Error(`no data field: ${text.slice(0, 160)}`);
    }
    return text;
  };

  const MAX_CONSECUTIVE_ERRORS = 3;
  let consecutiveErrors = 0;
  let aborted = false;
  let tokenRejected = false;
  const recordError = (where, err) => {
    const msg = err.message || String(err);
    if (/HTTP 40[13]|api status=0|token/i.test(msg) && !tokenRejected) {
      tokenRejected = true;
      console.log(
        `[Coolapk] TOKEN REJECTED (${where}: ${msg}). ` +
          `Coolapk likely rotated keys - re-extract phase2 from a new APK (see tools/crawler/README.md). Aborting source.`
      );
      aborted = true;
      return;
    }
    console.error(`  [coolapk] ${where}: ERROR - ${msg}`);
    if (++consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.log(`[Coolapk] ${consecutiveErrors} consecutive errors, aborting source`);
      aborted = true;
    }
  };

  // App search over common keywords (bulk apk entities). NOTE: ranking feeds
  // carry no package info (verified: zero apk-ish keys), so search is the
  // only productive endpoint.
  if (!aborted) {
    const SEARCH_PATHS = ["/v6/search/apk", "/v6/search?type=apk"];
    const SEARCH_PARAMS = ["keyword", "q", "query", "kw", "keyWord", "word", "searchValue"];
    let searchPath = null;
    let searchParam = null;
    for (const p of SEARCH_PATHS) {
      if (aborted || searchPath) break;
      for (const qp of SEARCH_PARAMS) {
        if (aborted || searchPath) break;
        try {
          const sep = p.includes("?") ? "&" : "?";
          const text = await fetchText(
            `https://api.coolapk.com${p}${sep}${qp}=${encodeURIComponent("微信")}&page=1`
          );
          consecutiveErrors = 0;
          searchPath = p;
          searchParam = qp;
          const added = extractCoolapkPackages(text, packages);
          console.log(`  [coolapk] search path OK: ${p} param=${qp} (+${added})`);
          break;
        } catch (err) {
          if (tokenRejected || aborted) break;
          console.log(`  [coolapk] search probe ${p} param=${qp} failed (${err.message.slice(0, 100)})`);
        }
      }
    }
    if (searchPath && !aborted) {
      const KEYWORDS = [
        ... "abcdefghijklmnopqrstuvwxyz".split(""),
        "微信", "支付宝", "淘宝", "抖音", "美团", "拼多多", "京东",
        "银行", "输入法", "浏览器", "音乐", "视频", "地图", "相机", "笔记",
      ];
      const sep = searchPath.includes("?") ? "&" : "?";
      for (const kw of KEYWORDS) {
        if (aborted) break;
        for (let page = 1; page <= 2 && !aborted; page++) {
          try {
            const text = await fetchText(
              `https://api.coolapk.com${searchPath}${sep}${searchParam}=${encodeURIComponent(kw)}&page=${page}`
            );
            consecutiveErrors = 0;
            const added = extractCoolapkPackages(text, packages);
            if (added > 0 || page === 1) {
              console.log(
                `  [coolapk] search kw=${kw} page=${page}: +${added} (total: ${packages.size})`
              );
            }
            await sleep(DELAY_MS);
          } catch (err) {
            recordError(`search kw=${kw} page=${page}`, err);
            if (!aborted) await sleep(DELAY_MS * 2);
            break;
          }
        }
      }
    }
  }

  console.log(`[Coolapk] Found ${packages.size} packages`);
  return [...packages];
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

  const [gp, fdroidPackages, wandoujiaPackages, xiaomiPackages, coolapkPackages] =
    await Promise.all([
      crawlGooglePlay(),
      crawlFDroid(),
      crawlWandoujia(),
      crawlXiaomi(),
      crawlCoolapk(),
    ]);
  const googlePlayPackages = gp.allPackages;
  const cnPackages = gp.cnPackages;

  // Merge all sources
  const allPackages = new Set([
    ...TARGETED_PACKAGES,
    ...googlePlayPackages,
    ...fdroidPackages,
    ...wandoujiaPackages,
    ...xiaomiPackages,
    ...coolapkPackages,
  ]);

  // Mainland China downloadable set used for pre-applying the whitelist:
  // curated Chinese apps + Wandoujia/Xiaomi (CN stores) + F-Droid (accessible in CN).
  // defaultConfig already applies the whitelist to ALL installed apps, so
  // global Google Play apps are still covered without bloating the scope.
  const cnSet = new Set([
    ...TARGETED_PACKAGES,
    ...wandoujiaPackages,
    ...xiaomiPackages,
    ...coolapkPackages,
    ...fdroidPackages,
  ]);

  // Filter out obviously non-store packages
  const filterValid = (pkg) => {
    if (!pkg || pkg.length === 0) return false;
    if (/[^a-zA-Z0-9._]/.test(pkg)) return false;
    if (pkg.split(".").length < 2) return false;
    return true;
  };

  const filtered = [...allPackages].filter(filterValid).sort();
  const cnFiltered = [...cnSet].filter(filterValid).sort();

  const result = {
    metadata: {
      crawledAt: new Date().toISOString(),
      googlePlayCount: googlePlayPackages.length,
      fdroidCount: fdroidPackages.length,
      wandoujiaCount: wandoujiaPackages.length,
      xiaomiCount: xiaomiPackages.length,
      coolapkCount: coolapkPackages.length,
      cnGooglePlayCount: cnPackages.length,
      targetedCount: TARGETED_PACKAGES.length,
      totalUnique: filtered.length,
      durationMs: Date.now() - startTime,
    },
    packages: filtered,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));

  // Separate file: mainland China downloadable packages (used for pre-applying template)
  const cnResult = {
    metadata: {
      crawledAt: new Date().toISOString(),
      targetedCount: TARGETED_PACKAGES.length,
      wandoujiaCount: wandoujiaPackages.length,
      xiaomiCount: xiaomiPackages.length,
      coolapkCount: coolapkPackages.length,
      cnGooglePlayCount: cnPackages.length,
      fdroidCount: fdroidPackages.length,
      totalUnique: cnFiltered.length,
    },
    packages: cnFiltered,
  };
  const CN_OUTPUT = path.join(OUTPUT_DIR, "packages_cn.json");
  fs.writeFileSync(CN_OUTPUT, JSON.stringify(cnResult, null, 2));

  console.log(`\nDone! Saved ${filtered.length} packages to ${OUTPUT_FILE}`);
  console.log(`  Google Play: ${googlePlayPackages.length}`);
  console.log(`  F-Droid: ${fdroidPackages.length}`);
  console.log(`  Wandoujia: ${wandoujiaPackages.length}`);
  console.log(`  Xiaomi: ${xiaomiPackages.length}`);
  console.log(`  Coolapk: ${coolapkPackages.length}`);
  console.log(`  Targeted: ${TARGETED_PACKAGES.length}`);
  console.log(`  Total unique: ${filtered.length}`);
  console.log(`  CN downloadable set: ${cnFiltered.length} -> ${CN_OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
