const CACHE_NAME = 'vn2000-pro-v2.8.7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './user-guide.html',
  './style.css',
  './app.js',
  './field-workspace.js',
  './field-workspace.css',
  './ui-polish.css',
  './geodesy.js',
  './leaflet.js',
  './leaflet.css',
  './vietnam_34_tinh.js',
  './dong_thap_communes.js',
  './offline_regions.js',
  './pixoptimizer.js',
  './icon.png',
  './apple-touch-icon.png',
  './favicon.png',
  './VN2k-WGS84.png',
  './manifest.json',
  './jspdf.umd.min.js',
  './xlsx.full.min.js'
];

// 1. Cài đặt Service Worker và nạp sẵn tài nguyên cốt lõi vào Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Đang nạp bộ nhớ đệm offline tài nguyên trắc địa v2.8.0...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Kích hoạt và dọn dẹp bộ nhớ đệm phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Xóa bộ nhớ đệm cũ:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Xử lý yêu cầu dữ liệu (Fetch Strategy tối ưu cho PWA Vercel)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Chỉ can thiệp các request GET thuộc giao thức HTTP/HTTPS
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  const url = new URL(req.url);

  // A. XỬ LÝ TRANG CHỦ & TÀI LIỆU HTML (Network-First: Ưu tiên mạng để nhận cập nhật mới từ Vercel)
  const isHtml = req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'));
  if (url.origin === location.origin && isHtml) {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkResponse;
      }).catch(() => {
        // Khi mất mạng, fallback về tệp HTML đã lưu trong bộ nhớ đệm
        return caches.match('./index.html').then((res) => res || caches.match('./'));
      })
    );
    return;
  }

  // B. TÀI NGUYÊN NỘI BỘ ỨNG DỤNG (JS, CSS, Ảnh, Manifest)
  if (url.origin === location.origin && (url.pathname.endsWith('app.js') || url.search.includes('v='))) {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkResponse;
      }).catch(() => caches.match(req).then((res) => res || caches.match('./app.js')))
    );
    return;
  }

  // C. CÁC TÀI NGUYÊN NỘI BỘ KHÁC (CSS, Ảnh) - Stale-While-Revalidate
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkResponse;
        }).catch(() => null);

        // Trả về cache ngay lập tức nếu có, đồng thời cập nhật cache ngầm
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // C. TÀI NGUYÊN NGOẠI VI (Google Tile, OSM Tile, Phông chữ, CDN)
  const isMapTile = url.hostname.includes('tile.') || 
                    (url.hostname.includes('google.com') && url.pathname.includes('/vt')) ||
                    url.hostname.includes('arcgisonline.com');

  if (isMapTile) {
    // Với tile bản đồ: Ưu tiên cache đã tải, nếu chưa có thì fetch trực tiếp từ mạng mà không spam ghi đĩa CacheStorage
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(req).catch(() => new Response('', { status: 408, statusText: 'Offline Tile' }));
      })
    );
    return;
  }

  // Với CDN tĩnh (Fonts, Icons, Libs): Cache có kiểm soát, chỉ cache status 200
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return new Response('', { status: 408, statusText: 'Offline Resource' });
      });
    })
  );
});
