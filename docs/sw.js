const CACHE_NAME = 'moon-bullet-pages-a3e0f1e65eda';
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./asset-mobile-manifest.js",
  "./assets/backgrounds/bg_stage_base.png",
  "./assets_mobile/backgrounds/bg_stage_base.webp",
  "./assets/backgrounds/bg_stage1.png",
  "./assets_mobile/backgrounds/bg_stage1.webp",
  "./assets/characters/player_witch_avatar.png",
  "./assets_mobile/characters/player_witch_avatar.webp",
  "./assets/characters/player_yanuxiya_b_avatar.png",
  "./assets_mobile/characters/player_yanuxiya_b_avatar.webp",
  "./assets/characters/player_anna_avatar.png",
  "./assets_mobile/characters/player_anna_avatar.webp",
  "./assets/characters/player_reaver_avatar.png",
  "./assets_mobile/characters/player_reaver_avatar.webp",
  "./assets/player/mother_life/ship/avatar.png",
  "./assets_mobile/player/mother_life/ship/avatar.webp",
  "./assets/ui/ui_skill_beam_icon.png",
  "./assets_mobile/ui/ui_skill_beam_icon.webp",
  "./assets/ui/ui_skill_bomb_icon.png",
  "./assets_mobile/ui/ui_skill_bomb_icon.webp"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isAsset = url.pathname.includes('/assets/') || url.pathname.includes('/assets_mobile/');
  if (!isAsset) return;
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => hit))
  );
});
