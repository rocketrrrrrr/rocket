// data.json の events から、予定ごとのカレンダーファイル cal/<id>.ics を生成する。
// GitHub Actions（.github/workflows/build-ics.yml）が data.json の更新時に実行する。
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(root, "cal");
const data = JSON.parse(fs.readFileSync(path.join(root, "data.json"), "utf8"));
const events = Array.isArray(data.events) ? data.events : [];

const SITE = "https://rocketrrrrrr.github.io/rocket/";
const safeId = id => String(id || "").replace(/[^a-z0-9-]/gi, "");
const safeUrl = u => { try { const x = new URL(String(u)); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
const ymd = (s, add = 0) => { const d = new Date(String(s).slice(0, 10) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + add); return d.toISOString().slice(0, 10).replace(/-/g, ""); };
const tx = s => String(s || "").replace(/\\/g, "\\\\").replace(/[;,]/g, m => "\\" + m).replace(/\r?\n/g, "\\n");
const fold = line => { let out = "", cur = "", n = 0; for (const ch of line) { const b = Buffer.byteLength(ch); if (n + b > 73) { out += cur + "\r\n "; cur = ""; n = 1; } cur += ch; n += b; } return out + cur; };
const desc = e => [e.time, e.note, safeUrl(e.url) ? "出典：" + safeUrl(e.url) : "", `APEX NOW（${SITE}）より`].filter(Boolean).join("\n");

function ics(e, stamp) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//APEX NOW//JA", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${safeId(e.id)}@rocketrrrrrr.github.io`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(e.start)}`, `DTEND;VALUE=DATE:${ymd(e.end || e.start, 1)}`,
    `SUMMARY:${tx(e.title)}`, e.place ? `LOCATION:${tx(e.place)}` : "", `DESCRIPTION:${tx(desc(e))}`,
    safeUrl(e.url) ? `URL:${safeUrl(e.url)}` : "", "END:VEVENT", "END:VCALENDAR"]
    .filter(Boolean).map(fold).join("\r\n") + "\r\n";
}

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
const noStamp = s => s.replace(/^DTSTAMP:.*$/m, "");
const keep = new Set();
for (const e of events) {
  const id = safeId(e.id);
  if (!id || !/^\d{4}-\d{2}-\d{2}/.test(String(e.start || ""))) { console.warn(`skip: ${e.id}`); continue; }
  const file = path.join(outDir, `${id}.ics`);
  const next = ics(e, stamp);
  const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  // 内容が同じなら DTSTAMP だけの差分でファイルを書き換えない
  if (prev === null || noStamp(prev) !== noStamp(next)) fs.writeFileSync(file, next);
  keep.add(`${id}.ics`);
}
for (const f of fs.readdirSync(outDir)) if (f.endsWith(".ics") && !keep.has(f)) fs.unlinkSync(path.join(outDir, f));
console.log(`cal/: ${keep.size} files`);
