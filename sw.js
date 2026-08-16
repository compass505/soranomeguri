/**
 * コードは合計100KB程度で常に新しくしたいが、絵は25MBあり内容が変わらない。
 * コードを network-first、絵を cache-first に分けて、「常に新しく、かつ
 * オフラインでも開ける」を両立させる。
 */
const CACHE = 'soranomeguri-v2';
/** コードは常に新しい方を取りに行く。絵は重くて変わらないのでキャッシュ優先。 */
const CODE = /\.(html|css|js|json|webmanifest)$/;
const PRECACHE = [
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/arrival.js',
  'js/bg-metrics.json',
  'js/clouds.js',
  'js/game.js',
  'js/garden.js',
  'js/inertia.js',
  'js/layout.js',
  'js/sky.js',
  'js/sprite-metrics.json',
  'js/sprites.js',
  'js/state.js',
  'js/weather.js',
  'assets/sprites/yui-cloudy.webp',
  'assets/sprites/yui-diamonddust.webp',
  'assets/sprites/yui-fog.webp',
  'assets/sprites/yui-hail.webp',
  'assets/sprites/yui-rainbow.webp',
  'assets/sprites/yui-rainy.webp',
  'assets/sprites/yui-snow.webp',
  'assets/sprites/yui-sunny.webp',
  'assets/sprites/yui-thunder.webp',
  'assets/sprites/yui-wind.webp',
  'assets/clouds/clouds.json',
  'assets/clouds/cirrus_a.webp',
  'assets/clouds/cumulonimbus_a.webp',
  'assets/clouds/cumulus_a.webp',
  'assets/clouds/cumulus_b.webp',
  'assets/clouds/cumulus_c.webp',
  'assets/clouds/fractus_a.webp',
  'assets/clouds/stratocumulus_a.webp',
  'assets/clouds/stratus_a.webp',
  'assets/bg/bg_ground_green_c.png',
  'assets/bg/bg_ground_snow_c.png',
  'assets/bg/bg_hills_c.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      )),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !['http:', 'https:'].includes(url.protocol)) return;

  // ★「/」（拡張子なしのトップページ）は CODE の正規表現に引っかからず、
  //   下のキャッシュ優先の枝に落ちていた。一度キャッシュされると、
  //   コードを直しても index.html だけ古いまま配られ続ける
  //   （URLを叩いて開く・PWAのホーム画面アイコンから開く、どちらもこの形で来る）。
  //   ナビゲーション（ページそのものの読み込み）は拡張子に関わらず必ずコード扱いにする。
  if (CODE.test(url.pathname) || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) throw new Error(`network response was not ok: ${response.status}`);
          const copy = response.clone();
          return caches.open(CACHE)
            .then((c) => c.put(event.request, copy))
            .then(() => response);
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
