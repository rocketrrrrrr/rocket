# CLAUDE.md

## APEX NOW について

- Apex Legends の非公式ファンサイト。公開 URL：https://rocketrrrrrr.github.io/rocket/
- GitHub Pages で main ブランチから公開している。main に入った変更がサイトに反映される

## 役割分担

- パッチ、TOP10、ランク帯別メタ、予定のデータ（data.json）は、毎週水曜の定期スケジュールで更新している。data.json はこちらが手でアップロードする
- この Code のセッションでは、主にサイトそのもの（見た目、ページ、機能、不具合）を直す。急ぎのときだけ、data.json もここで更新することがある
- 作業が終わったら、main にマージしてサイトに反映するところまでやる。マージできなかったときは、その理由と、私がやるべき操作を教える

## 守ること

- 本名やメールアドレスを、サイト・コミット・ファイルのどこにも出さない
- 予定、イベント、大会の情報は公式に発表されたものだけ載せる。噂、リーク、予想は載せない
- 数値や日付を推測で書かない。確認できないものは「未発表」「未確認」と書く
- 日本語で書く。レジェンド名、武器名は公式の日本語名を使う
- 「効く」という言葉は使わない（「有効」「機能する」などに言い換える）
- data.json の構造（id、history、img など既存のフィールド）を壊さない
- index.html の `<meta name="google-site-verification" ...>` タグは Google Search Console の確認用なので、削除・変更しない
- `upgrades/`、`legends/` などの静的ページと `sitemap.xml` は data.json から自動生成しているので、直接編集しない。直すときは生成スクリプト（`scripts/`）を直す

## カレンダーファイル（cal/）

- 予定タブの「カレンダーに追加」は `cal/<予定の id>.ics` を開く。iPhone でカレンダーの追加画面を出すため、ブラウザ内で作らずファイルとして置いている
- `cal/` は data.json が main に入ると GitHub Actions（`.github/workflows/build-ics.yml`）が `scripts/build-ics.mjs` で自動生成する。手で編集しない（下の「検索エンジン向けの静的ページ」と同じワークフローで、1回のコミットにまとめている）
- 同じ予定の日付などを直すときは id を変えない（カレンダー側で同じ予定として扱われる）

## レジェンドの能力（data.json の legends[].abilities）

- レジェンドタブの「能力」欄は、各レジェンドの `abilities` を表示する。ないレジェンドは「能力の情報は未確認です」と出る
- 能力名は公式の日本語名、説明は初心者向けに1〜2行。EA 公式の日本語ページなどで確認できたものだけ入れる
- 形式（既存のフィールドはそのまま、`abilities` を足すだけ）

```json
"abilities": {
  "passive":  { "name": "公式の能力名", "desc": "何ができるか" },
  "tactical": { "name": "公式の能力名", "desc": "何ができるか" },
  "ultimate": { "name": "公式の能力名", "desc": "何ができるか" },
  "source": "確認した公式ページの URL",
  "checked": "確認した日（YYYY-MM-DD）"
}
```

## 武器の評価と破損アタッチメント（data.json）

- 武器タブの「評価」欄は各武器の `insight` を表示する。ティアリストの記事などにある、その武器が強い・弱い理由を日本語で要約したもの。ない武器には何も出ない
- 武器タブ上部の「破損アタッチメントの効果」は、トップレベルの `attachments` を表示する。効果は公式パッチノートの内容だけを書く
- 形式（既存のフィールドはそのまま、足すだけ）

```json
"insight": {
  "why": "強い・弱い理由（出典の評価の要約）",
  "fit": ["相性の良い破損アタッチメントの id"],
  "source": "出典の URL",
  "checked": "確認した日（YYYY-MM-DD）"
}
```

```json
"attachments": [
  { "id": "overflow-mag", "name": "公式の日本語名", "plus": ["良い効果"], "minus": ["悪い効果"], "slot": "", "source": "公式パッチノートの URL" }
]
```

## レジェンドのアップグレード（data.json の legends[].upgrades）

- レジェンドタブの各カードに「アップグレード」欄を出す。タブ上の「アップグレード早見表」ボタン（冒頭の黄色いボタンからも開く）で、アップグレードだけの一覧に切り替わる
- 名前と効果は EA 公式の日本語パッチノートを優先する。公式で確認できない部分だけ、コミュニティ Wiki（apexlegends.wiki.gg）の説明を日本語に訳して入れ、source に Wiki の URL を書く
- 公式の日本語名が見つからないものは英語名のまま `nameUnconfirmed: true` を付ける（サイトに「日本語名未確認」と出る）
- `ability` は、そのアップグレードが強化する能力（passive / tactical / ultimate / other）。能力のアイコンを出すのに使う
- 形式（既存のフィールドはそのまま、`upgrades` を足すだけ）

```json
"upgrades": {
  "lv2": [ { "name": "公式の日本語名", "effect": "効果1文", "ability": "tactical", "source": "URL" }, { ... } ],
  "lv3": [ { ... }, { ... } ],
  "checked": "確認した日（YYYY-MM-DD）"
}
```

- 能力のアイコンは `img/abilities/<レジェンドの id>-<passive|tactical|ultimate>.svg`（Wiki の SVG）。`abilities.<種類>.icon` にパスを書く。ランパートのパッシブはアイコン未取得

## 強さTOP10 の出典表示（data.json の site.meta.sources）

- TOP10 の下の「出典：」は `site.meta.sources`（`[{ "name": "出典名（データの日付）", "url": "URL" }]`）があればそれを表示する。ない場合は従来の `source` と `sourceUrls` を使う
- TOP10 の決め方は週次ルーチンの手順に書いてある（ティアリスト2件＋プレデター帯ピック率を合算し、矢印は前週の順位との比較）

## 検索エンジン向けの静的ページ（自動生成）

- `upgrades/`、`legends/<id>/`、`weapons/`、`tier/`、`patch/`、`shindan/` の各 `index.html` と `sitemap.xml` は、`scripts/build-pages.mjs` が data.json から生成する。手で編集しない（直すときはスクリプトか data.json を直す）
- index.html の `<!-- pages:start -->` 〜 `<!-- pages:end -->` の間（ページ下部のリンク一覧）も同じスクリプトが書き換える。この印は消さない
- 見た目は `assets/pages.css`。トップページ（index.html）のタブ式の画面は、これとは別に今までどおり data.json から JavaScript で描く
- data.json が main に入ると、GitHub Actions（`.github/workflows/build-ics.yml`）が「カレンダー生成 → ページ生成 → `scripts/check-pages.mjs` でリンクと画像のパスを確認 → 1回のコミット」を行う。リンク切れがあればコミットせずに止まる
- 手元で確かめるときは `node scripts/build-pages.mjs && node scripts/check-pages.mjs`
- 生成ページの値は data.json にあるものだけを使う。null の項目は表示しない。`nameUnconfirmed` は「（名称未確認）」、効果が空のものは「未確認」と出る
