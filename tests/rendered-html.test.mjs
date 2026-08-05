import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const rootIndex = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const publicIndex = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const statsStore = readFileSync(new URL("../app/statsStore.ts", import.meta.url), "utf8");
const i18nScript = readFileSync(new URL("../public/i18n.js", import.meta.url), "utf8");

const forbiddenCopy = [
  "非 Google Play",
  "官網直售",
  "Android GPS location simulation",
  "Android location simulation",
  "location-aware app",
  "location-based apps",
  "第三方",
  "官方合作",
  "自行確認",
  "服務條款",
  "帳號風險",
  "sideload",
  "Unofficial",
  "Direct APK",
  "SHA-256",
  "Tinder",
  "Pikmin",
  "下載頁該回答",
  "減少客服",
  "上一版官網",
  "可授權素材",
  "Creative Commons",
  "Wikimedia",
  "Photo:",
  "敬請期待",
  "準備中",
  "roadmap",
  "正式開放",
  "開發者與 QA",
  "產品測試",
  "More than one workflow",
  "Real photo landmarks",
  "Android first",
  "5-day free trial",
  "5 天免費試用",
  "5 天免费试用",
  "示意頭像",
];

test("public HTML is synchronized with the source HTML", () => {
  assert.equal(publicIndex, rootIndex);
});

test("sales page does not expose risk-heavy or unwanted launch copy", () => {
  for (const term of forbiddenCopy) {
    assert.equal(rootIndex.includes(term), false, `Unexpected public copy: ${term}`);
  }
});

test("brand assets and Android release download are present", () => {
  const requiredFiles = [
    "../assets/brand/pikflyer-logo-main-transparent.png",
    "../assets/brand/pikflyer-logo-wordmark-horizontal.png",
    "../assets/brand/pikflyer-logo-wordmark-light.png",
    "../assets/brand/pikflyer-app-icon-main.png",
    "../public/assets/brand/pikflyer-favicon-180.png",
    "../downloads/pikflyer-xiaochibang-android-v2.0.11.sha256",
    "../downloads/pikflyer-xiaochibang-android-v2.0.11.apk",
    "../credits.html",
    "../public/credits.html",
    "../public/downloads/pikflyer-xiaochibang-android-v2.0.11.apk",
    "../assets/landmarks/giza-pyramids.jpg",
    "../assets/landmarks/tokyo-skytree.jpg",
    "../assets/landmarks/shibuya-crossing.jpg",
    "../assets/landmarks/iceland-aurora.jpg",
    "../assets/landmarks/petra-treasury.jpg",
    "../assets/landmarks/grand-canyon-sunrise.jpg",
    "../assets/landmarks/angkor-wat.jpg",
    "../assets/landmarks/moraine-lake.jpg",
    "../public/assets/landmarks/giza-pyramids.jpg",
  ];

  for (const relativePath of requiredFiles) {
    const url = new URL(relativePath, import.meta.url);
    assert.equal(existsSync(url), true, `Missing required release asset: ${relativePath}`);
    assert.ok(statSync(url).size > 0, `Release asset is empty: ${relativePath}`);
  }
});

test("page uses the approved Pikflyer logo assets", () => {
  assert.match(rootIndex, /pikflyer-logo-wordmark-light\.png/);
  assert.match(rootIndex, /pikflyer-favicon-180\.png/);
  assert.equal(rootIndex.includes("xiaochibang-logo-180.png"), false);
});

test("page points users at the current Android release", () => {
  assert.match(rootIndex, /\/download\?file=pikflyer-xiaochibang-android-v2\.0\.11\.apk/);
  assert.match(rootIndex, /\/stats\/track/);
  assert.match(rootIndex, /https:\/\/www\.creem\.io\/payment\/prod_p43ENvAr9g7395z8mlvH/);
  assert.match(rootIndex, /版本 2\.0\.11/);
  assert.match(rootIndex, /7 天完整試用/);
  assert.match(rootIndex, /第 8 天後仍可用：10 次傳送、15 次骰子、1 次城市散步/);
  assert.match(rootIndex, /設定簡單/);
  assert.match(rootIndex, /第 8 天後仍可免費低額度使用/);
  assert.match(rootIndex, /常見使用情境/);
  assert.match(rootIndex, /情境 01/);
  assert.match(rootIndex, /冰島/);
  assert.match(rootIndex, /data-review-carousel/);
  assert.equal(rootIndex.includes("review-avatar"), false);
  assert.equal(rootIndex.includes("示意頭像"), false);
  assert.equal(rootIndex.includes("同一個 app，用不同語言快速理解"), false);
  assert.match(rootIndex, /埃及金字塔/);
  assert.match(rootIndex, /東京晴空塔/);
  assert.match(rootIndex, /冰島極光/);
  assert.match(rootIndex, /19 \/ 19/);
  assert.match(rootIndex, /setInterval\(\(\) => showSlide\(activeIndex \+ 1\), 5000\)/);
  assert.match(rootIndex, /手動批量匯入座標/);
  assert.match(rootIndex, /在家，也能<span>行<\/span>萬里路/);
  assert.match(rootIndex, /跟朋友有連結/);
  assert.match(rootIndex, /附近的香菇看膩了/);
  assert.match(rootIndex, /https:\/\/www\.instagram\.com\/pikflyer\.app\//);
  assert.match(rootIndex, /https:\/\/www\.threads\.com\/@pikflyer\.app/);
});

test("public policy copy is aligned with current trial promise", () => {
  const terms = readFileSync(new URL("../terms.html", import.meta.url), "utf8");
  const refund = readFileSync(new URL("../refund.html", import.meta.url), "utf8");
  const publicTerms = readFileSync(new URL("../public/terms.html", import.meta.url), "utf8");
  const publicRefund = readFileSync(new URL("../public/refund.html", import.meta.url), "utf8");

  for (const document of [terms, refund, publicTerms, publicRefund]) {
    assert.equal(document.includes("5-day free trial"), false);
    assert.equal(document.includes("5 天免費試用"), false);
    assert.equal(document.includes("5 天免费试用"), false);
    assert.match(document, /7/);
  }
});

test("stats report is not public when the report token is missing", () => {
  assert.match(statsStore, /STATS_REPORT_TOKEN/);
  assert.equal(statsStore.includes("if (!env.STATS_REPORT_TOKEN) return true"), false);
  assert.match(statsStore, /if \(!env\.STATS_REPORT_TOKEN\) \{/);
  assert.match(statsStore, /return false;/);
});

test("trial status does not start trials from read-only status checks", () => {
  const licenseRelay = readFileSync(new URL("../app/licenseRelay.ts", import.meta.url), "utf8");
  const statusStart = licenseRelay.indexOf("export async function trialStatus");
  const nextExport = licenseRelay.indexOf("export async function appUpdateStatus", statusStart);
  const statusBlock = licenseRelay.slice(statusStart, nextExport);
  const activeTrialStart = licenseRelay.indexOf("async function ensureActiveTrial");
  const activeTrialEnd = licenseRelay.indexOf("async function consumePoiUsageBudget", activeTrialStart);
  const activeTrialBlock = licenseRelay.slice(activeTrialStart, activeTrialEnd);

  assert.match(statusBlock, /body\.start_trial === true/);
  assert.match(statusBlock, /trial_not_started/);
  assert.equal(activeTrialBlock.includes("trial_not_started"), false);
  assert.equal(activeTrialBlock.includes("jsonResponse"), false);
});


test("page provides complete localized copy for international visitors", () => {
  assert.match(rootIndex, /Pik Flyer - 小翅膀/);
  assert.match(i18nScript, /60,000\+ curated POIs/);
  assert.match(i18nScript, /6万件以上の独自POIデータ/);
  assert.match(i18nScript, /6만 개 이상의 자체 POI 데이터/);
});

test("homepage uses one full-page language picker instead of the multilingual card section", () => {
  assert.equal(rootIndex.includes('<section id="global">'), false);
  assert.match(rootIndex, /id="language-select"/);
  assert.match(rootIndex, /<option value="zh-TW">繁體中文<\/option>/);
  assert.match(rootIndex, /<option value="en">English<\/option>/);
  assert.match(rootIndex, /<option value="ja">日本語<\/option>/);
  assert.match(rootIndex, /<option value="ko">한국어<\/option>/);
  assert.match(rootIndex, /<script src="i18n\.js\?v=\d+"/);
});

test("language system detects, persists, and applies every supported locale", () => {
  for (const locale of ["zh-TW", "en", "ja", "ko"]) {
    assert.ok(i18nScript.includes(locale), `Missing locale: ${locale}`);
  }
  assert.match(i18nScript, /navigator\.languages/);
  assert.match(i18nScript, /localStorage\.setItem\(STORAGE_KEY, language\)/);
  assert.match(i18nScript, /document\.documentElement\.lang = HTML_LANG\[safeLanguage\]/);
  assert.match(i18nScript, /url\.searchParams\.set\("lang", language\)/);
  assert.match(i18nScript, /translateTextNodes\(safeLanguage\)/);
  assert.match(i18nScript, /translateAttributes\(safeLanguage\)/);
  assert.match(i18nScript, /updateMetadata\(safeLanguage\)/);
});
