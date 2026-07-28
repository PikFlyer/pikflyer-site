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
    "../downloads/pikflyer-xiaochibang-android-v1.0.7.apk",
    "../downloads/pikflyer-xiaochibang-android-v1.0.7.sha256",
    "../credits.html",
    "../public/credits.html",
    "../public/downloads/pikflyer-xiaochibang-android-v1.0.7.apk",
  ];

  for (const relativePath of requiredFiles) {
    const url = new URL(relativePath, import.meta.url);
    assert.equal(existsSync(url), true, `Missing required release asset: ${relativePath}`);
    assert.ok(statSync(url).size > 0, `Release asset is empty: ${relativePath}`);
  }
});

test("page points users at the current Android release", () => {
  assert.match(rootIndex, /downloads\/pikflyer-xiaochibang-android-v1\.0\.7\.apk/);
  assert.match(rootIndex, /版本 1\.0\.7/);
  assert.match(rootIndex, /手動批量匯入座標/);
});


test("page explains Pik Flyer for international visitors", () => {
  assert.match(rootIndex, /Pik Flyer - 小翅膀/);
  assert.match(rootIndex, /Pik Flyer helps you roll landmark spots/);
  assert.match(rootIndex, /ランドマーク抽選/);
  assert.match(rootIndex, /랜드마크 랜덤 선택/);
});
