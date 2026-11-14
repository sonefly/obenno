const CACHE = 'fxy-v20';
const FILES = [
  './',
  './index.html',
  './404.html',
  './assets/hall_gold_1280.webp',
  './assets/buddha_seated.webp',
  './assets/censer.webp',
  './assets/table.webp',
  './assets/fruit.webp',
  './assets/lotus_lamp.webp',
  './assets/box.webp',
  './assets/gate_door.webp',
  './assets/qr_alipay.webp',
  './assets/qr_wechat.webp',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/notoserifsc-subset.woff2'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).catch(function(){}));
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function(hit){
      if (hit) return hit;
      return fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      }).catch(function(){ return caches.match('./index.html'); });
    })
  );
});


