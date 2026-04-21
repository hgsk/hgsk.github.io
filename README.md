# hgsk.github.io

Astroで構成されたブログです。

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## AI駆動オートリンク（Local AI Edition）

- `npm run build` 前に `scripts/pre-build.ts` が実行され、記事とキーワードを解析します。
- `src/content/keywords/` の既存キーワード辞書と、記事から抽出した固有名詞（2記事以上登場）を統合します。
- 未作成キーワードは `status: "draft"` のWIPページとして自動生成されます。
- 解析結果は `src/generated/link-map.json` と `src/generated/backlink-map.json` に出力され、ビルド時に Rehype プラグインが内部リンクを注入します。
- キーワードURLは `/keywords/[percent-encoded-keyword]/` 形式です（例: `型` → `/keywords/%E5%9E%8B/`）。
