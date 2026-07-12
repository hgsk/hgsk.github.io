/**
 * Qero のオフライン起動用サービスワーカー。
 *
 * 2 つの登録元がある:
 *  - スタンドアロン公開アプリ（Issue #38）: `buildStandaloneHTML` /
 *    `buildEncryptedStandaloneHTML`（client/export/publish.ts）が書き出した
 *    HTML から登録される。
 *  - 編集アプリ本体（Issue #070）: `static/index.html` を経由して起動する
 *    `client/main.ts` の `bootApp` 経路（実行モード専用の公開ビューでは登録し
 *    ない）から登録される。
 * どちらも同じこのファイルを使う。編集用ドキュメントの CRDT/P2P には一切触れ
 * ないため、キャッシュ挙動が協調編集セッションへ影響することはない。
 *
 * - install: アプリシェル（./、index.html、style.css、app.js、
 *   manifest.webmanifest）をプリキャッシュする。1 ファイルの取得に失敗しても
 *   （公開アプリ側に index.html 等が存在しない等）install 全体は失敗させない。
 * - fetch: stale-while-revalidate — キャッシュがあれば即座に返しつつ、裏で
 *   ネットワークから再取得してキャッシュを更新する。初回アクセス後はオフライン
 *   でも起動できる。
 * - activate: キャッシュ名にバージョンを含め、現行バージョンと異なる名前の
 *   旧キャッシュを削除する。
 *
 * CACHE_VERSION / プリキャッシュ対象リストは `client/core/swconfig.ts`
 * （`buildCacheName` / `buildShellAssets`、`tests/swconfig_test.ts` で検証）の
 * 内容と手動で同期させること — このファイルは非モジュールの素の JS で
 * バンドル対象外のため import できない。
 */
const CACHE_VERSION = "v2";
const CACHE_NAME = `qero-shell-${CACHE_VERSION}`;
const SHELL_ASSETS = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => {})))
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
