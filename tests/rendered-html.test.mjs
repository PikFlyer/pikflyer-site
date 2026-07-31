import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const rootIndex = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const publicIndex = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

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
    "../assets/brand/xiaochibang-logo.png",
    "../assets/brand/xiaochibang-logo-180.png",
    "../downloads/pikflyer-xiaochibang-android-v1.0.8.apk",
    "../downloads/pikflyer-xiaochibang-android-v1.0.13.sha256",
    "../credits.html",
    "../public/credits.html",
    "../public/downloads/pikflyer-xiaochibang-android-v1.0.13.apk",
    "../assets/reviews/emma.jpg",
    "../assets/reviews/jack.jpg",
    "../assets/reviews/mika.jpg",
    "../assets/reviews/omar.jpg",
    "../assets/reviews/sofia.jpg",
    "../assets/reviews/yui.jpg",
    "../public/assets/reviews/emma.jpg",
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

test("page points users at the current Android release", () => {
  assert.match(rootIndex, /\/download\?file=pikflyer-xiaochibang-android-v1\.0\.13\.apk/);
  assert.match(rootIndex, /\/stats\/track/);
  assert.match(rootIndex, /https:\/\/www\.creem\.io\/payment\/prod_p43ENvAr9g7395z8mlvH/);
  assert.match(rootIndex, /版本 1\.0\.13/);
  assert.match(rootIndex, /7 天完整試用/);
  assert.match(rootIndex, /第 8 天後仍可用：10 次傳送、15 次骰子、1 次城市散步/);
  assert.match(rootIndex, /設定簡單/);
  assert.match(rootIndex, /第 8 天後仍可免費低額度使用/);
  assert.match(rootIndex, /玩家會怎麼用/);
  assert.match(rootIndex, /心如/);
  assert.match(rootIndex, /冰島/);
  assert.match(rootIndex, /data-review-carousel/);
  assert.match(rootIndex, /assets\/reviews\/emma\.jpg/);
  assert.match(rootIndex, /Jack/);
  assert.match(rootIndex, /Yui/);
  assert.match(rootIndex, /Omar/);
  assert.match(rootIndex, /Sofía/);
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
});


test("page explains Pik Flyer for international visitors", () => {
  assert.match(rootIndex, /Pik Flyer - 小翅膀/);
  assert.match(rootIndex, /Pik Flyer helps you find postcard-worthy spots/);
  assert.match(rootIndex, /友達とのスポット共有/);
  assert.match(rootIndex, /친구와 공유하기 쉽게/);
});
