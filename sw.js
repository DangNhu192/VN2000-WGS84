const CACHE_NAME = 'vn2000-pro-v2.3.9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './geodesy.js',
  './leaflet.js',
  './leaflet.css',
  './vietnam_34_tinh.js',
  './dong_thap_communes.js',
  './offline_regions.js',
  './icon.png',
  './apple-touch-icon.png',
  './favicon.png',
  './VN2k-WGS84.png',
  './manifest.json'
];

// 1. Cài đặt Service Worker và nạp sẵn tài nguyên cốt lõi vào Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Đang nạp bộ nhớ đệm offline tài nguyên trắc địa v2.2.3...');
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

  // Chỉ can thiệp các request GET
  if (req.method !== 'GET') return;

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

  // B. TÀI NGUYÊN NỘI BỘ ỨNG DỤNG (JS, CSS, Ảnh, Manifest) - Chiến lược Stale-While-Revalidate
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

  // C. TÀI NGUYÊN NGOẠI VI (Google Tile, OSM Tile, Phông chữ) - Cache cả phản hồi Opaque (status: 0)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(req).then((networkResponse) => {
        // Chú ý: Các ô bản đồ Cross-Origin trả về status === 0 (loại 'opaque'). Phải cho phép cache để dùng offline!
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Trả về ảnh rỗng 408 nếu offline và ô tile này chưa từng được xem
        return new Response('', { status: 408, statusText: 'Offline Tile' });
      });
    })
  );
});
