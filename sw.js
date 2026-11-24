const CACHE_NAME = 'vn2000-pro-v2.8.57';
// Dữ liệu địa giới lớn (~4 MB): cache riêng, KHÔNG xóa khi nâng phiên bản ứng dụng; đổi tên khi dữ liệu đổi.
const DATA_CACHE = 'vn2000-data-admin-2025-07-01';
// Bộ nhớ đệm gạch bản đồ thực địa: Lưu trữ bền vững phục vụ khảo sát ngoại tuyến không sóng mạng
const TILE_CACHE = 'vn2000-tiles-field-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './user-guide.html',
  './style.css',
  './app.js',
  './src/core/cad_geometry.js',
  './src/core/gis_io.js',
  './src/core/planning_map.js',
  './src/core/georef.js',
  './src/core/parcel_links.js',
  './src/ui/contrast_guard.js',
  './field-workspace.js',
  './field-workspace.css',
  './vn2000-rezone.js',
  './vn-admin-2025.js',
  './import-preview.js',
  './app-shell.js',
  './ui-unified.css',
  './ui-sylva.css',
  './ui-assistant.css',
  './ui-mapfirst.css',
  './assistant-core.js',
  './assistant-dataset.js',
  './assistant.js',
  './ui-polish.css',
  './geodesy.js',
  './leaflet.js',
  './leaflet.css',
  './vietnam_34_tinh.js',
  './dong_thap_communes.js',
  './data/vn_south_provinces.js',
  './offline_regions.js',
  './pixoptimizer.js',
  './icon.png',
  './apple-touch-icon.png',
  './favicon.png',
  './VN2k-WGS84.webp',
  './manifest.json',
  './jspdf.umd.min.js',
  './vendor/svgcanvas/svgcanvas.js',
  './xlsx.full.min.js'
];

// 1. Cài đặt Service Worker và nạp sẵn tài nguyên cốt lõi vào Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Đang nạp bộ nhớ đệm offline: ' + CACHE_NAME + '...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Bản mới không tự kích hoạt: chờ người dùng bấm "Cập nhật" (tránh tải lại giữa lúc đang đo/vẽ).
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Mạng chập chờn: chờ tối đa 3 giây rồi dùng bản đã lưu (nếu có) thay vì treo đến khi mạng hết giờ.
const NETWORK_TIMEOUT_MS = 3000;
function fetchWithTimeout(req) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
    fetch(req).then((res) => { clearTimeout(timer); resolve(res); }, (err) => { clearTimeout(timer); reject(err); });
  });
}
function cachedCopy(req) {
  // Bản cài sẵn lưu theo tên không có ?v=… → thử đúng URL trước, rồi bỏ phần ?v=.
  return caches.match(req).then((res) => res || caches.match(req, { ignoreSearch: true }));
}

// 2. Kích hoạt và dọn dẹp bộ nhớ đệm phiên bản cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE && key !== TILE_CACHE) {
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
      fetchWithTimeout(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkResponse;
      }).catch(() => {
        // Khi mất mạng hoặc mạng quá chậm, dùng tệp HTML đã lưu trong bộ nhớ đệm
        return caches.match(req, { ignoreSearch: true })
          .then((res) => res || caches.match('./index.html'))
          .then((res) => res || caches.match('./'))
          .then((res) => res || fetch(req));
      })
    );
    return;
  }

  // A2. DỮ LIỆU ĐỊA GIỚI (data/): Cache-First, tải một lần rồi dùng ngoại tuyến
  if (url.origin === location.origin && url.pathname.includes('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => cache.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  // B. TÀI NGUYÊN NỘI BỘ ỨNG DỤNG (JS, CSS, Ảnh, Manifest)
  if (url.origin === location.origin && (url.pathname.endsWith('app.js') || url.search.includes('v='))) {
    event.respondWith(
      fetchWithTimeout(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkResponse;
      }).catch(() => cachedCopy(req).then((res) => res || fetch(req)))
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
                    (url.hostname.includes('google.com') && (url.pathname.includes('/vt') || url.pathname.includes('/maps'))) ||
                    url.hostname.includes('arcgisonline.com') ||
                    url.hostname.includes('vcdn.cloud') ||
                    url.hostname.includes('fptcloud.com') ||
                    url.hostname.includes('cmccloud.com.vn') ||
                    url.hostname.includes('cmctelecom.vn') ||
                    url.hostname.includes('digitaloceanspaces.com') ||
                    url.hostname.includes('guland.vn') ||
                    url.hostname.includes('opentopomap.org') ||
                    url.hostname.includes('eox.at');

  if (isMapTile) {
    // Với tile bản đồ: Ưu tiên cache đã lưu (offline field support), nếu chưa có thì tải từ mạng và tự động lưu vào TILE_CACHE
    event.respondWith(
      caches.open(TILE_CACHE).then((tileCache) => {
        return tileCache.match(req).then((cachedResponse) => {
          // Ô đã lưu dạng "opaque" (do lớp bản đồ nạp không kèm CORS) không dùng được cho yêu cầu CORS
          // của bộ xuất ảnh/PDF (trình duyệt sẽ báo lỗi ảnh) → tải lại từ mạng và thay bản lưu.
          if (cachedResponse && !(cachedResponse.type === 'opaque' && req.mode === 'cors')) return cachedResponse;
          return fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              tileCache.put(req, resClone);
            }
            return networkResponse;
          }).catch(() => {
            return caches.match(req).then((res) => res || new Response('', { status: 408, statusText: 'Offline Tile' }));
          });
        });
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
