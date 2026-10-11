// data.json から、検索エンジン向けの静的ページ（中身を HTML に書き込んだもの）と sitemap.xml を生成する。
// 生成先：upgrades/ legends/<id>/ weapons/ tier/ patch/ shindan/ と sitemap.xml。
// あわせて index.html の <!-- pages:start --> 〜 <!-- pages:end --> の間（生成ページへのリンク一覧）を書き換える。
// GitHub Actions（.github/workflows/build-ics.yml）が data.json の更新時に実行する。外部ライブラリは使わない。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://rocketrrrrrr.github.io/rocket/";
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const meta = D.site?.meta || {};
const state = D.site?.state || {};
const legends = D.legends || [];
const weapons = D.weapons || [];
const patches = (D.patches || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
const attachments = D.attachments || [];

const CLS = { assault: ["アサルト", "--c-assault"], skirm: ["スカーミッシャー", "--c-skirm"], recon: ["リコン", "--c-recon"], support: ["サポート", "--c-support"], ctrl: ["コントローラー", "--c-ctrl"] };
const ROLE = { assault: "前に出て撃ち合う", skirm: "機動力で動き回る", recon: "敵の位置を探る", support: "味方を回復・援護する", ctrl: "エリアを守る" };
const DIR = { buff: "強化", nerf: "弱体化", change: "調整", rework: "リワーク" };
const TR = { up: "▲ 上昇", down: "▼ 下降", same: "― 維持", new: "NEW" };
const AB = [["passive", "パッシブ"], ["tactical", "戦術"], ["ultimate", "アルティメット"]];
const UNOFFICIAL_JA = "当サイトは Electronic Arts / Respawn Entertainment とは関係のない非公式ファンサイトです。Apex Legends の名称・画像などの権利は各権利者に帰属します。";
const UNOFFICIAL_EN = "This website is not endorsed by or affiliated with EA or its licensors.";

// ---------- helpers ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const has = v => v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "null";
const safeUrl = u => { try { const x = new URL(String(u)); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
const ymd = s => has(s) ? String(s).slice(0, 10) : "";
const fmtDate = s => has(s) ? ymd(s).replace(/-/g, "/") : "";
const lastChecked = has(state.lastChecked) ? state.lastChecked : "";
const updatedLabel = lastChecked ? `${fmtDate(lastChecked)}${String(lastChecked).length > 10 ? " " + String(lastChecked).slice(11, 16) : ""}` : "";
const byId = (arr, id) => arr.find(x => x.id === id);
const legendName = id => byId(legends, id)?.ja || id;
const weaponName = id => { const w = byId(weapons, id); return w ? (w.ja || w.name) : id; };
const safeId = id => String(id || "").replace(/[^a-z0-9-]/gi, "");
const fileExists = rel => fs.existsSync(path.join(ROOT, rel));
const ext = (href, text) => safeUrl(href) ? `<a href="${esc(safeUrl(href))}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>` : "";
const srcLink = (href, label = "出典") => safeUrl(href) ? `<span class="src">${ext(href, label)}</span>` : "";
const upgSrcLabel = u => /wiki\.gg/.test(u || "") ? "出典（Wiki）" : "出典（公式）";
const clsChip = c => CLS[c] ? `<span class="chip"><i style="background:var(${CLS[c][1]})"></i>${CLS[c][0]}</span>` : "";
const pill = d => DIR[d] ? `<span class="pill ${esc(d)}">${DIR[d]}</span>` : "";

// ページごとの相対パス（例：legends/seer/ → "../../"）
const relRoot = p => "../".repeat(p.split("/").filter(Boolean).length);
const portrait = (L, rel, cls = "") => (L && /^img\/[a-z0-9-]+\.webp$/.test(L.img || "") && fileExists(L.img))
  ? `<img class="pt${cls ? " " + cls : ""}" src="${rel}${esc(L.img)}" alt="${esc(L.ja)}" width="96" height="96" loading="lazy">` : "";
const abIcon = (a, rel) => (a && /^img\/abilities\/[a-z0-9-]+\.svg$/.test(a.icon || "") && fileExists(a.icon))
  ? `<img class="ab-ic" src="${rel}${esc(a.icon)}" alt="" width="18" height="18" loading="lazy">` : "";

// ---------- page shell ----------
const NAV = [
  ["", "トップ"], ["tier/", "強さTOP10"], ["upgrades/", "アップグレード早見表"],
  ["weapons/", "武器"], ["patch/", "パッチ"], ["shindan/", "適性診断"]
];
const written = [];
function page({ p, title, desc, crumbs, h1, lead, body, current }) {
  const rel = relRoot(p);
  const url = SITE + p;
  const crumbList = [["", "APEX NOW"], ...crumbs];
  const ld = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: crumbList.map(([href, name], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href }))
  };
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="APEX NOW">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${rel}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rel}apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap">
<link rel="stylesheet" href="${rel}assets/pages.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>
<body>
<div class="wrap">
<header class="top">
  <a class="brand" href="${rel || "./"}">APEX NOW<small>今のApexは、これだけ見ればいい。</small></a>
  <nav class="gnav" aria-label="サイト内">${NAV.map(([h, n]) => `<a href="${rel}${h}"${h === current ? ' aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
</header>
<nav class="crumbs" aria-label="パンくずリスト"><ol>${crumbList.map(([href, name], i) => i === crumbList.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${rel}${href}">${esc(name)}</a></li>`).join("")}</ol></nav>
<main>
<h1>${esc(h1)}</h1>
${lead ? `<p class="lead">${lead}</p>` : ""}
${updatedLabel ? `<p class="meta">最終更新：<span class="mono">${esc(updatedLabel)}</span>（データの最終チェック日時）</p>` : ""}
${body}
</main>
<footer class="foot">
  <nav aria-label="ページ一覧">${NAV.map(([h, n]) => `<a href="${rel}${h}">${n}</a>`).join("")}</nav>
  <p>数値は公式パッチノートを優先し、強さランキングは外部のティアリストとピック率をもとにまとめています。各項目の「出典」から一次情報を確認できます。</p>
  <p>${UNOFFICIAL_JA}</p>
  <p lang="en">${UNOFFICIAL_EN}</p>
</footer>
</div>
</body>
</html>
`;
  const out = path.join(ROOT, p, "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  written.push(p);
}

// ---------- shared blocks ----------
function upgOpt(u, L, rel) {
  const a = u.ability && L.abilities ? L.abilities[u.ability] : null;
  const name = has(u.name) ? esc(u.name) : "未確認";
  return `<div class="opt"><span class="on">${abIcon(a, rel)}${name}${u.nameUnconfirmed ? `<span class="tag">（名称未確認）</span>` : ""}</span>
    <p>${has(u.effect) ? esc(u.effect) : "未確認"}</p>${srcLink(u.source, upgSrcLabel(u.source))}</div>`;
}
function upgBlock(L, rel) {
  const U = L.upgrades;
  if (!U || (!(U.lv2 || []).length && !(U.lv3 || []).length)) return `<p class="mute">アップグレードの情報は未確認です。</p>`;
  const lv = (n, arr) => (arr || []).length ? `<div class="lvl"><span class="lv">Lv${n}</span><div class="opts">${arr.map(u => upgOpt(u, L, rel)).join("")}</div></div>` : "";
  return `${lv(2, U.lv2)}${lv(3, U.lv3)}${has(U.checked) ? `<p class="src" style="margin:8px 0 0">確認日：${esc(fmtDate(U.checked))}</p>` : ""}`;
}
function histEntry(h) {
  return `<div class="hist"><div><span class="mono mute">${esc(fmtDate(h.date))}</span> ${pill(h.dir)} ${srcLink(h.url)}</div>
    <ul>${(h.lines || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
}
const sourcesLine = list => { const a = list.map(([n, u]) => ext(u, n)).filter(Boolean); return a.length ? `<p class="src">出典：${a.join("・")}</p>` : ""; };

// ---------- 1. upgrades/ ----------
{
  const p = "upgrades/", rel = relRoot(p);
  const cards = legends.map(L => `<section class="card" id="${esc(safeId(L.id))}">
    <div class="lg-head">${portrait(L, rel)}<div><a class="nm" href="${rel}legends/${esc(safeId(L.id))}/">${esc(L.ja)}</a><div class="sub">${clsChip(L.cls)}</div></div></div>
    ${upgBlock(L, rel)}
  </section>`).join("\n");
  page({
    p, current: p,
    title: "Apex 全レジェンドのアップグレード一覧・早見表｜APEX NOW",
    desc: `Apex Legends の全${legends.length}レジェンドについて、試合中にレベル2・レベル3で2つから1つを選ぶアップグレードを、能力アイコン付きで一覧にした早見表です。`,
    crumbs: [[p, "アップグレード早見表"]],
    h1: "Apex 全レジェンドのアップグレード早見表",
    lead: `試合中にレベル2・3で2つから1つを選ぶアップグレードを、全${legends.length}レジェンド分まとめています。名前と効果は EA 公式の日本語パッチノートを優先し、公式で確認できない部分はコミュニティ Wiki（apexlegends.wiki.gg）の説明を訳して載せています。「（名称未確認）」は公式の日本語名が見つからなかったものです。`,
    body: `<nav class="toc" aria-label="レジェンド">${legends.map(L => `<a href="#${esc(safeId(L.id))}">${esc(L.ja)}</a>`).join("")}</nav>
<div class="grid">${cards}</div>
${sourcesLine([["EA 公式ニュース（日本語）", "https://www.ea.com/ja/games/apex-legends/apex-legends/news"], ["Apex Legends Wiki", "https://apexlegends.wiki.gg/"]])}`
  });
}

// ---------- 2. legends/<id>/ ----------
legends.forEach((L, i) => {
  const id = safeId(L.id); if (!id) return;
  const p = `legends/${id}/`, rel = relRoot(p);
  const A = L.abilities || {};
  const abRows = AB.filter(([k]) => A[k] && has(A[k].name)).map(([k, label]) => `<div class="ab"><span class="on">${abIcon(A[k], rel)}<span class="k">${label}</span>${esc(A[k].name)}</span><p>${has(A[k].desc) ? esc(A[k].desc) : "未確認"}</p></div>`).join("");
  const rank = (meta.ranking || []).find(r => r.id === L.id);
  const hist = L.history || [];
  const descParts = AB.filter(([k]) => A[k] && has(A[k].name)).map(([k, label]) => `${label}「${A[k].name}」`);
  const prev = legends[(i - 1 + legends.length) % legends.length], next = legends[(i + 1) % legends.length];
  page({
    p, current: "upgrades/",
    title: `${L.ja}のアップグレードと能力まとめ｜Apex｜APEX NOW`,
    desc: `Apex Legends の${L.ja}${CLS[L.cls] ? `（${CLS[L.cls][0]}）` : ""}の能力${descParts.length ? `（${descParts.join("、")}）` : ""}と、レベル2・3のアップグレード、強化・弱体化の履歴をまとめています。`,
    crumbs: [["upgrades/", "アップグレード早見表"], [p, L.ja]],
    h1: `${L.ja}のアップグレードと能力まとめ`,
    lead: "",
    body: `<div class="card"><div class="lg-head">${portrait(L, rel, "lg")}<div>
  <div class="nm">${esc(L.ja)}${has(L.en) ? ` <span class="sub">${esc(L.en)}</span>` : ""}</div>
  <div class="sub">${clsChip(L.cls)}${ROLE[L.cls] ? ` ${ROLE[L.cls]}` : ""}</div>
  <div class="sub" style="margin-top:4px">${has(L.tier) ? `ティア <span class="tier ${esc(L.tier)}">${esc(L.tier)}</span>` : ""}${rank ? ` ／ <a href="${rel}tier/">強さTOP10</a> ${esc(rank.rank)}位` : ""}${has(L.latestDate) ? ` ／ 最終調整 ${esc(fmtDate(L.latestDate))}` : ""}</div>
</div></div></div>

<h2>能力（パッシブ・戦術・アルティメット）</h2>
<div class="card">${abRows || `<p class="mute">能力の情報は未確認です。</p>`}
${(has(A.checked) || safeUrl(A.source)) ? `<p class="src" style="margin:8px 0 0">${has(A.checked) ? `確認日：${esc(fmtDate(A.checked))}　` : ""}${ext(A.source, "出典（EA 公式）")}</p>` : ""}</div>

<h2>アップグレード（レベル2・3）</h2>
<div class="card">${upgBlock(L, rel)}</div>

<h2>強化・弱体化の履歴</h2>
<div class="card">${hist.length ? hist.map(histEntry).join("") : `<p class="mute">今シーズンの調整はありません。</p>`}</div>

<p style="margin-top:20px"><a href="${rel}legends/${esc(safeId(prev.id))}/">‹ ${esc(prev.ja)}</a>　｜　<a href="${rel}upgrades/">全レジェンドの早見表</a>　｜　<a href="${rel}legends/${esc(safeId(next.id))}/">${esc(next.ja)} ›</a></p>
<p><a href="${rel}#legends">トップページのレジェンドタブで見る</a></p>
<nav class="toc" aria-label="ほかのレジェンド">${legends.filter(x => x.id !== L.id).map(x => `<a href="${rel}legends/${esc(safeId(x.id))}/">${esc(x.ja)}</a>`).join("")}</nav>`
  });
});

// ---------- 3. weapons/ ----------
{
  const p = "weapons/", rel = relRoot(p);
  const TIER_ORDER = ["S+", "S", "A+", "A", "B+", "B", "C"];
  const sorted = weapons.slice().sort((a, b) => {
    const ia = TIER_ORDER.indexOf(a.tier), ib = TIER_ORDER.indexOf(b.tier);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a.ja || a.name).localeCompare(String(b.ja || b.name), "ja");
  });
  const attName = id => byId(attachments, id)?.name || id;
  const tierRows = (meta.weaponTop || []).filter(t => (t.names || []).length).map(t => `<tr><td><span class="tier ${esc(t.tier)}">${esc(t.tier)}</span></td><td>${t.names.map(n => `<a href="#w-${esc(safeId(n))}">${esc(weaponName(n))}</a>`).join("、")}</td></tr>`).join("");
  const attCards = attachments.map(a => {
    const fits = weapons.filter(w => (w.insight?.fit || []).includes(a.id)).map(w => w.ja || w.name);
    return `<div class="card"><h3>${esc(a.name)}</h3>
      <ul style="margin:6px 0 0;padding-left:1.2em;font-size:14px">${(a.plus || []).map(x => `<li style="color:var(--buff)">＋ ${esc(x)}</li>`).join("")}${(a.minus || []).map(x => `<li style="color:var(--nerf)">－ ${esc(x)}</li>`).join("")}</ul>
      ${has(a.slot) ? `<p class="sub">装着できる武器：${esc(a.slot)}</p>` : ""}
      ${fits.length ? `<p class="sub">相性の良い武器（出典の評価）：${fits.map(esc).join("、")}</p>` : ""}
      ${srcLink(a.source, "出典（公式パッチノート）")}</div>`;
  }).join("");
  const cards = sorted.map(w => {
    const n = w.insight;
    const [h, ...rest] = w.history || [];
    return `<section class="card" id="w-${esc(safeId(w.id))}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><h3>${esc(w.ja || w.name)}</h3><div class="sub">${esc(w.category || "")}${w.pool === "care" ? " ・ ケアパッケージ" : ""}${has(w.latestDate) ? ` ・ 最終調整 ${esc(fmtDate(w.latestDate))}` : ""}</div></div>${has(w.tier) ? `<span class="tier ${esc(w.tier)}">${esc(w.tier)}</span>` : ""}</div>
      ${n && has(n.why) ? `<div style="margin-top:8px"><p style="margin:0;font-size:14px">${esc(n.why)}</p>${(n.fit || []).length ? `<p class="sub" style="margin:4px 0 0">相性の良い破損アタッチメント：${n.fit.map(f => esc(attName(f))).join("、")}</p>` : ""}<p class="src" style="margin:2px 0 0">${has(n.checked) ? `確認日：${esc(fmtDate(n.checked))}　` : ""}${ext(n.source, "出典")}</p></div>` : ""}
      ${h ? `<div style="margin-top:8px">${histEntry(h)}</div>` : `<p class="mute" style="font-size:13px;margin:8px 0 0">今シーズンの調整はありません。</p>`}
      ${rest.length ? `<details><summary>過去の変更 ${rest.length}件</summary>${rest.map(histEntry).join("")}</details>` : ""}
    </section>`;
  }).join("\n");
  page({
    p, current: p,
    title: "Apex 武器ティアと変更履歴・破損アタッチメントまとめ｜APEX NOW",
    desc: `Apex Legends の武器${weapons.length}種のティア、強い理由、今シーズンの強化・弱体化の履歴と、破損アタッチメント${attachments.length}種の効果をまとめています。`,
    crumbs: [[p, "武器"]],
    h1: "Apex 武器ティアと変更履歴",
    lead: "武器ごとのティア、強い理由と相性の良い破損アタッチメント、今シーズンの変更履歴です。ティアと評価はティアリストの記事をもとにした要約、変更点は公式パッチノートを優先しています。",
    body: `${tierRows ? `<h2>武器ティア（上位）</h2><div class="card"><table><tbody>${tierRows}</tbody></table>${sourcesLine((meta.sourceUrls || []).filter(u => /weapon/.test(u)).map(u => [meta.source || "ティアリスト", u]))}</div>` : ""}
${attachments.length ? `<h2>破損アタッチメント（${attachments.length}種）の効果</h2><p class="lead">1つの武器に1つだけ付けられる、強化と弱体化がセットになったアタッチメントです。</p><div class="grid sm">${attCards}</div>` : ""}
<h2>武器ごとの評価と変更履歴</h2>
<div class="grid">${cards}</div>
<p style="margin-top:16px"><a href="${rel}#weapons">トップページの武器タブで見る</a></p>`
  });
}

// ---------- 4. tier/ ----------
{
  const p = "tier/", rel = relRoot(p);
  const legLink = id => { const L = byId(legends, id); return L ? `<a href="${rel}legends/${esc(safeId(id))}/">${esc(L.ja)}</a>` : esc(id); };
  const rankRows = (meta.ranking || []).map(r => {
    const L = byId(legends, r.id) || { ja: r.id };
    return `<div class="card rank"><div class="no">${esc(r.rank)}</div>${portrait(L, rel) || "<span></span>"}<div><div>${legLink(r.id)} ${clsChip(L.cls)}</div>${has(r.reason) ? `<p>${esc(r.reason)}</p>` : ""}</div>
      <div class="side">${has(r.tier) ? `<span class="tier ${esc(r.tier)}">${esc(r.tier)}</span>` : ""}${TR[r.trend] ? `<span class="mute">${TR[r.trend]}</span>` : ""}</div></div>`;
  }).join("");
  const rankSrc = Array.isArray(meta.sources) && meta.sources.length ? meta.sources.map(s => [s.name, s.url]) : (meta.sourceUrls || []).map((u, i, a) => [`${meta.source || "ティアリスト"}${a.length > 1 ? ` ${i + 1}` : ""}`, u]);
  const tiers = (meta.tiers || []).filter(t => (t.picks || []).length).map(t => `<section class="card"><h3>${esc(t.label)}帯</h3>
    <p class="sub" style="margin:2px 0 6px">${esc(t.scope || "")}${has(t.updated) ? `（${esc(fmtDate(t.updated))} 時点）` : ""}</p>
    <table><thead><tr><th>順位</th><th>レジェンド</th><th style="text-align:right">ピック率</th></tr></thead><tbody>${t.picks.map((pk, i) => `<tr><td class="num" style="text-align:left">${i + 1}</td><td>${legLink(pk.id)}</td><td class="num">${esc(pk.rate)}%</td></tr>`).join("")}</tbody></table>
    ${sourcesLine((t.sources || []).map(s => [s.name, s.url]))}</section>`).join("");
  const comps = (meta.comps || []).map((c, i) => `<div class="card"><div class="sub">#${i + 1}${has(c.tag) ? `　${esc(c.tag)}` : ""}</div><div style="font-weight:700">${(c.legends || []).map(legLink).join(" ＋ ")}</div>${has(c.stat) ? `<p class="sub" style="margin:2px 0 0">${esc(c.stat)}</p>` : ""}${has(c.note) ? `<p style="margin:2px 0 0;font-size:14px">${esc(c.note)}</p>` : ""}</div>`).join("");
  page({
    p, current: p,
    title: "Apex 今強いレジェンド TOP10・ランク帯別ピック率｜APEX NOW",
    desc: "Apex Legends の今強いレジェンド TOP10 と、プレデター・マスター・ダイヤ・プラチナ・ゴールドのランク帯別ピック率、プレデター帯でよく使われる3人構成をまとめています。",
    crumbs: [[p, "強さTOP10"]],
    h1: "今強いレジェンド TOP10",
    lead: `${has(meta.updated) ? `${esc(fmtDate(meta.updated))} 時点。` : ""}${esc(meta.rankingBasis || "")}`,
    body: `<div class="rows">${rankRows}</div>
${sourcesLine(rankSrc)}
${(meta.notes || []).length ? `<h2>今のメタ</h2><div class="card"><ul style="margin:0;padding-left:1.2em">${meta.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
${tiers ? `<h2>ランク帯別のピック率</h2><p class="lead">強さの評価ではなく、そのランク帯で実際に選ばれている割合です。</p><div class="grid sm">${tiers}</div>` : ""}
${comps ? `<h2>プレデター帯でよく使われる構成</h2>${has(meta.compsScope) ? `<p class="lead">${esc(meta.compsScope)}${has(meta.compsUpdated) ? `（${esc(fmtDate(meta.compsUpdated))} 時点）` : ""}</p>` : ""}<div class="grid sm">${comps}</div>${sourcesLine((meta.compsSources || []).map(s => [s.name, s.url]))}` : ""}
<p style="margin-top:16px"><a href="${rel}#rank">トップページの強さTOP10で見る</a>　｜　<a href="${rel}upgrades/">アップグレード早見表</a></p>`
  });
}

// ---------- 5. patch/ ----------
{
  const p = "patch/", rel = relRoot(p);
  const affected = pid => {
    const ls = legends.filter(x => (x.history || []).some(h => h.patchId === pid)).map(x => [x, x.history.find(h => h.patchId === pid)]);
    const ws = weapons.filter(x => (x.history || []).some(h => h.patchId === pid)).map(x => [x, x.history.find(h => h.patchId === pid)]);
    return { ls, ws };
  };
  const cards = patches.map((pt, i) => {
    const { ls, ws } = affected(pt.id);
    return `<section class="card" id="p-${esc(safeId(pt.id))}">
      <div><span class="mono mute">${esc(fmtDate(pt.date))}</span>${i === 0 ? ` <span class="pill buff">最新</span>` : ""}</div>
      <h3 style="margin:2px 0 4px">${esc(pt.title)}</h3>
      ${has(pt.summary) ? `<p style="margin:0 0 6px;font-size:14px">${esc(pt.summary)}</p>` : ""}
      ${(pt.highlights || []).length ? `<ul style="margin:0 0 6px;padding-left:1.2em;font-size:14px">${pt.highlights.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${ls.length ? `<p class="sub" style="margin:4px 0 0">レジェンド：${ls.map(([x, h]) => `<a href="${rel}legends/${esc(safeId(x.id))}/">${esc(x.ja)}</a>${DIR[h.dir] ? `（${DIR[h.dir]}）` : ""}`).join("、")}</p>` : ""}
      ${ws.length ? `<p class="sub" style="margin:4px 0 0">武器：${ws.map(([x, h]) => `<a href="${rel}weapons/#w-${esc(safeId(x.id))}">${esc(x.ja || x.name)}</a>${DIR[h.dir] ? `（${DIR[h.dir]}）` : ""}`).join("、")}</p>` : ""}
      ${srcLink(pt.url)}
    </section>`;
  }).join("\n");
  const latest = patches[0];
  page({
    p, current: p,
    title: "Apex 最新パッチノートまとめ・過去のパッチ｜APEX NOW",
    desc: `Apex Legends の最新パッチ${latest ? `（${fmtDate(latest.date)}「${latest.title}」）` : ""}と過去のパッチの要点、強化・弱体化されたレジェンドと武器をまとめています。`,
    crumbs: [[p, "パッチ"]],
    h1: "Apex 最新パッチと過去のパッチ",
    lead: "パッチごとの要点と、強化・弱体化されたレジェンドと武器の一覧です。数値は公式パッチノートを優先しています。",
    body: `<div class="stack">${cards}</div>
<p style="margin-top:16px"><a href="${rel}#patch">トップページのパッチタブで見る</a></p>`
  });
}

// ---------- 6. shindan/ ----------
{
  const p = "shindan/", rel = relRoot(p);
  page({
    p, current: p,
    title: "Apex レジェンド適性診断｜MBTIと8つの質問であなたに合うレジェンドがわかる｜APEX NOW",
    desc: `MBTI と8つの質問に答えると、Apex Legends の全${legends.length}レジェンドの中から、あなたのプレイスタイルに合うレジェンドを診断します。結果は画像や X でシェアできます。`,
    crumbs: [[p, "適性診断"]],
    h1: "Apex レジェンド適性診断",
    lead: "MBTI と8つの質問から、あなたのプレイスタイルに合うレジェンドを診断します。",
    body: `<div class="card">
<h3>診断のしかた</h3>
<ol style="margin:6px 0 0;padding-left:1.4em;font-size:14px">
<li>MBTI（16タイプ）を選びます。わからない場合はスキップできます。</li>
<li>撃ち合いの好みや立ち回りについて、8つの質問に答えます。</li>
<li>全${legends.length}レジェンドの中から、あなたに合うレジェンドと、サブ候補、組みたい味方が表示されます。</li>
<li>結果は画像やテキストで、X などにシェアできます。</li>
</ol>
<p style="margin:12px 0 0"><a class="cta" href="${rel}#quiz">診断をはじめる ▶</a></p>
</div>
<h2>診断のあとに</h2>
<p>診断で出たレジェンドの能力とアップグレードは、<a href="${rel}upgrades/">アップグレード早見表</a>やレジェンドごとのページで確認できます。今の環境で強いレジェンドは<a href="${rel}tier/">強さTOP10</a>を見てください。</p>
<nav class="toc" aria-label="レジェンド">${legends.map(L => `<a href="${rel}legends/${esc(safeId(L.id))}/">${esc(L.ja)}</a>`).join("")}</nav>`
  });
}

// ---------- index.html：生成ページへのリンク一覧 ----------
{
  const f = path.join(ROOT, "index.html");
  let html = fs.readFileSync(f, "utf8");
  const start = "<!-- pages:start -->", end = "<!-- pages:end -->";
  const i = html.indexOf(start), j = html.indexOf(end);
  if (i < 0 || j < i) throw new Error("index.html に <!-- pages:start --> / <!-- pages:end --> がありません");
  const block = `${start}
    <nav class="sitelinks" aria-label="ページ一覧">
      <p><a href="tier/">強さTOP10</a><a href="upgrades/">全レジェンドのアップグレード早見表</a><a href="weapons/">武器ティアと変更履歴</a><a href="patch/">パッチまとめ</a><a href="shindan/">レジェンド適性診断</a></p>
      <p>${legends.map(L => `<a href="legends/${esc(safeId(L.id))}/">${esc(L.ja)}</a>`).join("")}</p>
    </nav>
    ${end}`;
  html = html.slice(0, i) + block + html.slice(j + end.length);
  fs.writeFileSync(f, html);
}

// ---------- sitemap.xml ----------
{
  const lastmod = ymd(lastChecked) || new Date().toISOString().slice(0, 10);
  const urls = ["", ...written];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
}

console.log(`pages: ${written.length} (+ index.html links, sitemap.xml ${written.length + 1} URLs)`);
