/* 梵音殿 · Obenno — service worker
   策略：
   1) 页面（导航请求）走「网络优先 + 缓存兜底」，线上更新立即可见，离线仍可打开；
   2) 静态资源走「缓存优先 + 后台静默更新」，不重复下载、换版自动刷新；
   3) 安装时只预缓存极小的外壳，不再预下载 index.html / 字体 / 大图（首访少下约 4.5 MB）。
*/
const CACHE = 'fxy-v26';
const SHELL = [
  './404.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/apple-touch-icon.png'
];
const NAV_TIMEOUT = 4000;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL);
  }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isNavigation(req) {
  if (req.mode === 'navigate') return true;
  var u = new URL(req.url);
  return u.pathname === '/' || /\/index\.html$/.test(u.pathname);
}

function put(req, res) {
  if (!res || res.status !== 200 || (res.type !== 'basic' && res.type !== 'default')) return;
  var copy = res.clone();
  caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/cdn-cgi/') === 0) return;

  if (isNavigation(req)) {
    e.respondWith((function () {
      var cached = caches.match(req, { ignoreSearch: true });
      var network = fetch(req).then(function (res) { put(req, res); return res; });
      return Promise.race([
        network,
        cached.then(function (hit) {
          if (!hit) return network;
          return new Promise(function (resolve) {
            setTimeout(function () { resolve(hit); }, NAV_TIMEOUT);
          });
        })
      ]).catch(function () {
        return cached.then(function (hit) {
          return hit || caches.match('./404.html').then(function (p) {
            return p || new Response('离线，且本页尚未缓存。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
          });
        });
      });
    })());
    return;
  }

  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var network = fetch(req).then(function (res) { put(req, res); return res; });
    if (hit) {
      network.catch(function () {});
      return hit;
    }
    return network.catch(function () {
      return new Response('', { status: 504 });
    });
  }));
});
