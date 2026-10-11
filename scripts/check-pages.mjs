// 生成ページ・index.html・sitemap.xml の中のサイト内リンクと画像のパスが、実在するファイルを指しているか確かめる。
// 切れたリンクがあれば一覧を出して終了コード 1 で終わる（GitHub Actions ではコミット前に止まる）。
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://rocketrrrrrr.github.io/rocket/";
const DIRS = ["upgrades", "legends", "weapons", "tier", "patch", "shindan"];

const files = ["index.html"];
const walk = d => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".html")) files.push(p); } };
DIRS.forEach(d => fs.existsSync(path.join(ROOT, d)) && walk(d));

const exists = rel => {
  let p = path.join(ROOT, decodeURIComponent(rel));
  if (rel === "" || rel.endsWith("/")) p = path.join(p, "index.html");
  return fs.existsSync(p) && fs.statSync(p).isFile();
};
const idsOf = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

const broken = [];
let checked = 0;
for (const f of files) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const dir = path.posix.dirname(f.split(path.sep).join("/"));
  const ownIds = idsOf(html);
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    let u = m[1].replace(/&amp;/g, "&");
    if (/^(https?:)?\/\//.test(u) && !u.startsWith(SITE)) continue;     // 外部リンクは対象外
    if (/^(mailto:|data:|javascript:)/.test(u)) continue;
    if (f === "index.html" && /\$\{/.test(u)) continue;                  // index.html の JS テンプレート内は対象外
    checked++;
    let target, frag = "";
    if (u.startsWith(SITE)) target = u.slice(SITE.length);
    else {
      [u, frag = ""] = u.split("#");
      if (u === "") { if (frag && f !== "index.html" && !ownIds.has(frag)) broken.push(`${f}: #${frag}（ページ内に id がない）`); continue; }
      target = path.posix.normalize(path.posix.join(dir === "." ? "" : dir, u));
      if (u.endsWith("/") && !target.endsWith("/")) target += "/";
      if (target === "./" || target === ".") target = "";
    }
    target = target.split("#")[0];
    if (target.startsWith("../")) { broken.push(`${f}: ${m[1]}（サイトの外を指している）`); continue; }
    if (!exists(target)) { broken.push(`${f}: ${m[1]}`); continue; }
    if (frag && !/^(rank|events|patch|legends|weapons|quiz|history)$/.test(frag)) {
      const tf = target === "" || target.endsWith("/") ? path.join(target, "index.html") : target;
      if (tf.endsWith(".html") && !idsOf(fs.readFileSync(path.join(ROOT, tf), "utf8")).has(frag)) broken.push(`${f}: ${m[1]}（移動先に id がない）`);
    }
  }
}
// sitemap.xml の URL
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) { checked++; const t = m[1].startsWith(SITE) ? m[1].slice(SITE.length) : null; if (t === null || !exists(t)) broken.push(`sitemap.xml: ${m[1]}`); }

console.log(`checked ${checked} links/images in ${files.length} HTML files + sitemap.xml`);
if (broken.length) { console.error(`broken (${broken.length}):\n` + broken.join("\n")); process.exit(1); }
console.log("no broken links");
