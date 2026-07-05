/**
 * スタンドアロン公開アプリ（Issue #38）用のオフライン起動サービスワーカー。
 *
 * `buildStandaloneHTML`/`buildEncryptedStandaloneHTML`（client/export/publish.ts）
 * が書き出した HTML からのみ登録される。編集用の index.html は登録しないため、
 * 協調編集セッションのキャッシュ挙動には影響しない。
 *
 * stale-while-revalidate: キャッシュがあれば即座に返しつつ、裏でネットワークから
 * 再取得してキャッシュを更新する。初回アクセス後はオフラインでも起動できる。
 */
const CACHE_NAME = "qero-published-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
