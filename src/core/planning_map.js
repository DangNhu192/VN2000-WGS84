/**
 * VN2000-PWA — Guland 2030 Land-Use Planning Map Integration Engine
 * File: src/core/planning_map.js
 * Version: 2.8.41
 * 
 * Module quản lý tích hợp bản đồ quy hoạch số hóa Guland (tầm nhìn 2030)
 * Tuân thủ 100% nguyên tắc UI Isolation Principle (AGENTS.md):
 * Quản lý độc lập các đối tượng layer trên Live Map, Bản đồ Chuyển đổi độc lập, và Bản đồ Dự án.
 */

(function (global) {
    'use strict';

    // Danh mục 63 tỉnh thành Việt Nam với tọa độ trung tâm và ánh xạ URL Tile Guland 2030 chính thức
    const PROVINCES_DATA = [
        { slug: "dong-thap", name: "Đồng Tháp", ktt: 105, center: [10.45, 105.63], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/dong-thap-2030/{z}/{x}/{y}.png", fallback: "https://s3-hn-2.cloud.cmctelecom.vn/guland7/land/dong-thap/{z}/{x}/{y}.png", landUrl: "https://s3-hn-2.cloud.cmctelecom.vn/guland7/land/dong-thap/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "ho-chi-minh", name: "TP. Hồ Chí Minh", ktt: 105.75, center: [10.78, 106.7], zoom: 11, url: "https://s3-hn-2.cloud.cmctelecom.vn/guland3/qhxd/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/tp-ho-chi-minh-2030/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/hcm/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "ha-noi", name: "TP. Hà Nội", ktt: 105, center: [21.03, 105.85], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/hanoi-pk/{z}/{x}/{y}.png?v=779l", fallback: "https://r4gmiynxmeobj.vcdn.cloud/ha-noi-2030-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/ha-noi/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "da-nang", name: "TP. Đà Nẵng", ktt: 107.75, center: [16.05, 108.2], zoom: 11, url: "https://sgp1.digitaloceanspaces.com/guland/qh/da-nang-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/da-nang-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/da-nang-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "can-tho", name: "TP. Cần Thơ", ktt: 105, center: [10.03, 105.78], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/can-tho-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/can-tho/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/can-tho/{z}/{x}/{y}.png", maxNativeZoom: 16 },
        { slug: "hai-phong", name: "TP. Hải Phòng", ktt: 105.75, center: [20.84, 106.68], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/hai-phong-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/hai-phong-3/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/hai-phong-3/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "an-giang", name: "An Giang", ktt: 104.75, center: [10.52, 105.12], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/an-giang-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/an-giang/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/an-giang/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "ba-ria-vung-tau", name: "Bà Rịa – Vũng Tàu", ktt: 107.75, center: [10.55, 107.25], zoom: 11, url: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-brvt/sdd/{z}/{x}/{y}.png", fallback: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-brvt/thuadat/{z}/{x}/{y}.png", landUrl: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-brvt/thuadat/{z}/{x}/{y}.png", maxNativeZoom: 17 },
        { slug: "bac-can", name: "Bắc Cạn", ktt: 106.5, center: [22.14, 105.83], zoom: 11, url: "https://251db3a9dce2de5.cmccloud.com.vn/guland4/qh/bac-kan-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/bac-kan/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/bac-kan/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "bac-giang", name: "Bắc Giang", ktt: 107, center: [21.27, 106.2], zoom: 11, url: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-bac-ninh/qh-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/bac-giang/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/bac-giang/{z}/{x}/{y}.png", maxNativeZoom: 17 },
        { slug: "bac-lieu", name: "Bạc Liêu", ktt: 105, center: [9.29, 105.72], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/bac-lieu-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/bac-lieu/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/bac-lieu/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "bac-ninh", name: "Bắc Ninh", ktt: 105.5, center: [21.18, 106.07], zoom: 11, url: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-bac-ninh/qh-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/bac-ninh-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/bac-ninh-2/{z}/{x}/{y}.png", maxNativeZoom: 17 },
        { slug: "ben-tre", name: "Bến Tre", ktt: 105.75, center: [10.24, 106.38], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/ben-tre-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/ben-tre/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/ben-tre/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "binh-dinh", name: "Bình Định", ktt: 108.25, center: [14.16, 109.05], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/binh-dinh-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/binh-dinh/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/binh-dinh/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "binh-duong", name: "Bình Dương", ktt: 105.75, center: [11.16, 106.65], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/binh-duong-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/binh-duong/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/binh-duong/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "binh-phuoc", name: "Bình Phước", ktt: 106.25, center: [11.75, 106.9], zoom: 11, url: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-dong-nai/sdd/{z}/{x}/{y}.png", fallback: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-dong-nai/thuadat/{z}/{x}/{y}.png", landUrl: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-dong-nai/thuadat/{z}/{x}/{y}.png", maxNativeZoom: 17 },
        { slug: "binh-thuan", name: "Bình Thuận", ktt: 107.5, center: [11.1, 108.1], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/binh-thuan-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/binh-thuan-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/binh-thuan-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "ca-mau", name: "Cà Mau", ktt: 104.5, center: [9.18, 105.15], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/ca-mau-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/ca-mau/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/ca-mau/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "cao-bang", name: "Cao Bằng", ktt: 105.75, center: [22.67, 106.26], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/cao-bang-2030-dc/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/cao-bang-2030-dc/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "dak-lak", name: "Đắk Lắk", ktt: 108.5, center: [12.67, 108.04], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/dak-lak-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/daklak-2025/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/daklak-2025/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "dak-nong", name: "Đắk Nông", ktt: 108.5, center: [12, 107.69], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/dak-nong-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/daknong/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/daknong/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "dien-bien", name: "Điện Biên", ktt: 103, center: [21.38, 103.02], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/dien-bien-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/dien-bien-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "dong-nai", name: "Đồng Nai", ktt: 107.75, center: [11.05, 107.03], zoom: 11, url: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-dong-nai/sdd/{z}/{x}/{y}.png", fallback: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-dong-nai/thuadat/{z}/{x}/{y}.png", landUrl: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-dong-nai/thuadat/{z}/{x}/{y}.png", maxNativeZoom: 17 },
        { slug: "gia-lai", name: "Gia Lai", ktt: 108.5, center: [13.98, 108], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/gia-lai-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/gia-lai-2/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/gia-lai-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "ha-giang", name: "Hà Giang", ktt: 105, center: [22.82, 104.98], zoom: 11, url: "https://guland.sgp1.cdn.digitaloceanspaces.com/qh/ha-giang-2030/{z}/{x}/{y}.png", fallback: "https://guland.sgp1.cdn.digitaloceanspaces.com/qh/ha-giang-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "ha-nam", name: "Hà Nam", ktt: 105, center: [20.54, 105.91], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/ha-nam-2030-dc/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/ha-nam/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/ha-nam/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "ha-tinh", name: "Hà Tĩnh", ktt: 105.5, center: [18.34, 105.9], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/ha-tinh-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/ha-tinh-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/ha-tinh-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "hai-duong", name: "Hải Dương", ktt: 105.5, center: [20.94, 106.33], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/hai-duong-2030-dc/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/hai-duong/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/hai-duong/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "hau-giang", name: "Hậu Giang", ktt: 105, center: [9.78, 105.47], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/hau-giang-2030--dc/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/hau-giang/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/hau-giang/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "hoa-binh", name: "Hòa Bình", ktt: 106, center: [20.81, 105.34], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/hoa-binh-2030-2/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/hoa-binh/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/hoa-binh/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "hung-yen", name: "Hưng Yên", ktt: 105.5, center: [20.65, 106.05], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/hung-yen-2030/{z}/{x}/{y}.png", fallback: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-hungyen/land/{z}/{x}/{y}.png", landUrl: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-hungyen/land/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "khanh-hoa", name: "Khánh Hòa", ktt: 108.25, center: [12.25, 109.19], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/khanh-hoa-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/khanh-hoa/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/khanh-hoa/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "kien-giang", name: "Kiên Giang", ktt: 104.5, center: [10.01, 105.08], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/kien-giang-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/kien-giang/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/kien-giang/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "kon-tum", name: "Kon Tum", ktt: 107.5, center: [14.35, 108], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/kon-tum-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/kon-tum/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/kon-tum/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "lai-chau", name: "Lai Châu", ktt: 103, center: [22.4, 103.46], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/lai-chau-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/lai-chau-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "lam-dong", name: "Lâm Đồng", ktt: 107.75, center: [11.94, 108.44], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/lam-dong-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/lam-dong/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/lam-dong/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "lang-son", name: "Lạng Sơn", ktt: 107.25, center: [21.85, 106.76], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/lang-son-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/lang-son-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/lang-son-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "lao-cai", name: "Lào Cai", ktt: 104.75, center: [22.48, 103.97], zoom: 11, url: "https://guland2.sgp1.cdn.digitaloceanspaces.com/qh/lao-cai-2030/{z}/{x}/{y}.png", fallback: "https://guland2.sgp1.cdn.digitaloceanspaces.com/qh/lao-cai-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "long-an", name: "Long An", ktt: 105.75, center: [10.65, 106.35], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/long-an-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/long-an/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/long-an/{z}/{x}/{y}.png", maxNativeZoom: 19 },
        { slug: "nam-dinh", name: "Nam Định", ktt: 105.5, center: [20.43, 106.17], zoom: 11, url: "https://guland.sgp1.cdn.digitaloceanspaces.com/qh/nam-dinh-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/nam-dinh/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/nam-dinh/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "nghe-an", name: "Nghệ An", ktt: 104.75, center: [19.23, 105.15], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/nghe-an-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/nghe-an/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/nghe-an/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "ninh-binh", name: "Ninh Bình", ktt: 105, center: [20.25, 105.97], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/ninh-binh-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/ninh-binh-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "ninh-thuan", name: "Ninh Thuận", ktt: 108.25, center: [11.68, 108.99], zoom: 11, url: "https://251db3a9dce2de5.cmccloud.com.vn/guland6/qh/ninh-thuan-2030/{z}/{x}/{y}.png", fallback: "https://251db3a9dce2de5.cmccloud.com.vn/guland6/qh/ninh-thuan-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "phu-tho", name: "Phú Thọ", ktt: 104.75, center: [21.32, 105.22], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/phu-tho-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/phu-tho-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "phu-yen", name: "Phú Yên", ktt: 108.5, center: [13.09, 109.09], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/phu-yen-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/phu-yen/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/phu-yen/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "quang-binh", name: "Quảng Bình", ktt: 106, center: [17.47, 106.6], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/quang-binh-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/quang-binh/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/quang-binh/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "quang-nam", name: "Quảng Nam", ktt: 107.75, center: [15.57, 108.48], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/quang-nam-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/v2/quang-nam-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "quang-ngai", name: "Quảng Ngãi", ktt: 108, center: [15.12, 108.8], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/quang-ngai-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/quang-ngai/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/quang-ngai/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "quang-ninh", name: "Quảng Ninh", ktt: 107.75, center: [21.01, 107.29], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/quang-ninh-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/quang-ninh/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/quang-ninh/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "quang-tri", name: "Quảng Trị", ktt: 106.25, center: [16.75, 107.19], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/quang-tri-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/new_24092024/quang-tri-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "soc-trang", name: "Sóc Trăng", ktt: 105.5, center: [9.6, 105.97], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/soc-trang-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/soc-trang-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/soc-trang-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "son-la", name: "Sơn La", ktt: 104, center: [21.33, 103.91], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/son-la-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/son-la-2/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/son-la-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "tay-ninh", name: "Tây Ninh", ktt: 105.5, center: [11.31, 106.09], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/tay-ninh-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/tay-ninh/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/tay-ninh/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "thai-binh", name: "Thái Bình", ktt: 105.5, center: [20.45, 106.34], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/thai-binh-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/thai-binh-2/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/thai-binh-2/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "thai-nguyen", name: "Thái Nguyên", ktt: 105.75, center: [21.59, 105.84], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/thai-nguyen-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/thai-nguyen/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/thai-nguyen/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "thanh-hoa", name: "Thanh Hóa", ktt: 105, center: [19.81, 105.78], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/thanh-hoa-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/thanh-hoa/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/thanh-hoa/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "thua-thien-hue", name: "Thừa Thiên Huế", ktt: 107, center: [16.46, 107.59], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/thua-thien-hue-2030/{z}/{x}/{y}.png", fallback: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-hue/v2/thuadat/{z}/{x}/{y}.png", landUrl: "https://s3.hn-1.cloud.cmctelecom.vn/guland9/qh-hue/v2/thuadat/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "tien-giang", name: "Tiền Giang", ktt: 105.75, center: [10.36, 106.36], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/v2/tien-giang-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/tien-giang/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/tien-giang/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "tra-vinh", name: "Trà Vinh", ktt: 105.5, center: [9.93, 106.34], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/tra-vinh-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/tra-vinh/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/tra-vinh/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "tuyen-quang", name: "Tuyên Quang", ktt: 106, center: [21.82, 105.21], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/tuyen-quang-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/tuyen-quang-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 },
        { slug: "vinh-long", name: "Vĩnh Long", ktt: 105.5, center: [10.25, 105.97], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/vinh-long-2030/{z}/{x}/{y}.png", fallback: "https://intercdn.guland.vn/land/vinh-long/{z}/{x}/{y}.png", landUrl: "https://intercdn.guland.vn/land/vinh-long/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "vinh-phuc", name: "Vĩnh Phúc", ktt: 105, center: [21.31, 105.6], zoom: 11, url: "https://251db3a9dce2de5.cmccloud.com.vn/guland4/qh/vinh-phuc-2030/{z}/{x}/{y}.png", fallback: "https://s3-han02.fptcloud.com/guland6/land/vinh-phuc/{z}/{x}/{y}.png", landUrl: "https://s3-han02.fptcloud.com/guland6/land/vinh-phuc/{z}/{x}/{y}.png", maxNativeZoom: 18 },
        { slug: "yen-bai", name: "Yên Bái", ktt: 104.75, center: [21.72, 104.91], zoom: 11, url: "https://r4gmiynxmeobj.vcdn.cloud/yen-bai-2030/{z}/{x}/{y}.png", fallback: "https://r4gmiynxmeobj.vcdn.cloud/yen-bai-2030/{z}/{x}/{y}.png", landUrl: null, maxNativeZoom: 18 }
    ];

    // Khởi tạo state độc lập cho 3 bề mặt bản đồ theo UI Isolation Principle
    const targets = {
        liveMap: {
            id: 'liveMap',
            containerId: 'transformLiveMap',
            btnId: 'btnLiveMapTogglePlanning',
            panelId: 'liveMapPlanningCtrl',
            layer: null,
            landLayer: null,
            active: false,
            showLand: false,
            provinceSlug: 'dong-thap',
            opacity: 0.65
        },
        transformMap: {
            id: 'transformMap',
            containerId: 'leaflet-transform-map',
            btnId: 'btnTfMapPlanning',
            panelId: 'tfMapPlanningCtrl',
            layer: null,
            landLayer: null,
            active: false,
            showLand: false,
            provinceSlug: 'dong-thap',
            opacity: 0.65
        },
        projectMap: {
            id: 'projectMap',
            containerId: 'leaflet-map',
            btnId: 'btnMapProjectPlanning',
            panelId: 'mapProjectPlanningCtrl',
            layer: null,
            landLayer: null,
            active: false,
            showLand: false,
            provinceSlug: 'dong-thap',
            opacity: 0.65
        },
        cadMap: {
            id: 'cadMap',
            containerId: 'map-view-container',
            btnId: 'btnCadPlanning',
            panelId: 'cadPlanningCtrl',
            layer: null,
            landLayer: null,
            active: false,
            showLand: false,
            provinceSlug: 'dong-thap',
            opacity: 0.65
        }
    };

    const STORAGE_KEY_PROVINCE = 'vn2k_planning_province';
    const STORAGE_KEY_OPACITY = 'vn2k_planning_opacity';
    const TRANSPARENT_1PX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    function getSafeStorage() {
        try {
            if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
            if (typeof localStorage !== 'undefined') return localStorage;
        } catch (_) {}
        return null;
    }

    function loadSavedPreferences() {
        try {
            const storage = getSafeStorage();
            if (!storage) return;
            const savedProv = storage.getItem(STORAGE_KEY_PROVINCE);
            const savedOp = parseFloat(storage.getItem(STORAGE_KEY_OPACITY));
            const opVal = (!isNaN(savedOp) && savedOp >= 0.1 && savedOp <= 1.0) ? savedOp : 0.65;
            
            Object.keys(targets).forEach(k => {
                if (savedProv && PROVINCES_DATA.some(p => p.slug === savedProv)) {
                    targets[k].provinceSlug = savedProv;
                }
                targets[k].opacity = opVal;
            });
        } catch (e) {
            console.warn('[GulandPlanning] Không thể đọc localStorage:', e);
        }
    }

    function savePreferences(slug, opacity) {
        try {
            const storage = getSafeStorage();
            if (!storage) return;
            if (slug) storage.setItem(STORAGE_KEY_PROVINCE, slug);
            if (typeof opacity === 'number') storage.setItem(STORAGE_KEY_OPACITY, opacity.toString());
        } catch (e) {
            console.warn('[GulandPlanning] Không thể lưu localStorage:', e);
        }
    }

    function getProvinceBySlug(slug) {
        return PROVINCES_DATA.find(p => p.slug === slug) || PROVINCES_DATA[0];
    }

    function getProvinceByKtt(ktt) {
        const num = parseFloat(ktt);
        if (isNaN(num)) return null;
        return PROVINCES_DATA.find(p => Math.abs(p.ktt - num) < 0.05) || null;
    }

    function getOrCreatePlanningPane(map) {
        if (!map || typeof map.getPane !== 'function') return null;
        let pane = map.getPane('planningOverlayPane');
        if (!pane) {
            pane = map.createPane('planningOverlayPane');
            pane.style.zIndex = 230; // Trên nền bản đồ (200), dưới ranh giới (240), dưới PDF (250) và dưới vector (400)
            pane.style.pointerEvents = 'none'; // Không cản trở bắt điểm, chọn hình, chấm tọa độ
        }
        return 'planningOverlayPane';
    }

    function getOrCreateLandPane(map) {
        if (!map || typeof map.getPane !== 'function') return null;
        let pane = map.getPane('planningLandPane');
        if (!pane) {
            pane = map.createPane('planningLandPane');
            pane.style.zIndex = 235;
            pane.style.pointerEvents = 'none';
        }
        return 'planningLandPane';
    }

    function createLeafletLayer(provinceObj, opacity, map) {
        if (typeof L === 'undefined') return null;
        const op = (typeof opacity === 'number') ? opacity : 0.65;
        const minNative = provinceObj.minNativeZoom || 8;
        const maxNative = provinceObj.maxNativeZoom || 18;
        const paneName = map ? getOrCreatePlanningPane(map) : undefined;
        
        const opts = {
            minZoom: 1,
            minNativeZoom: minNative,
            maxZoom: 24,
            maxNativeZoom: maxNative,
            keepBuffer: 8,
            updateWhenIdle: false,
            opacity: op,
            transparent: true,
            zIndex: 230,
            className: 'leaflet-layer-guland-planning',
            errorTileUrl: TRANSPARENT_1PX
        };
        if (paneName) opts.pane = paneName;

        const layer = L.tileLayer(provinceObj.url, opts);

        // Hủy ngay request ảnh gạch bản đồ dồn ứ khi người dùng lướt hoặc zoom nhanh qua mức khác
        layer.on('tileunload', function (e) {
            if (e && e.tile && !e.tile.complete) {
                e.tile.src = '';
            }
        });

        // Tự động chuyển URL dự phòng nếu CDN trả về lỗi
        layer.on('tileerror', function (e) {
            const tile = e.tile;
            if (!tile || tile.__gulandFallbackTried) return;
            tile.__gulandFallbackTried = true;
            if (provinceObj.fallback && provinceObj.fallback !== provinceObj.url) {
                const coords = e.coords;
                if (coords && typeof L.Util.template === 'function') {
                    tile.src = L.Util.template(provinceObj.fallback, {
                        z: coords.z,
                        x: coords.x,
                        y: coords.y
                    });
                }
            }
        });

        return layer;
    }

    function createLandLayer(provinceObj, map) {
        if (typeof L === 'undefined' || !provinceObj.landUrl) return null;
        const paneName = map ? getOrCreateLandPane(map) : undefined;
        const opts = {
            minZoom: 1,
            minNativeZoom: 16,
            maxZoom: 24,
            maxNativeZoom: 18,
            keepBuffer: 8,
            updateWhenIdle: false,
            opacity: 0.85,
            transparent: true,
            zIndex: 235,
            className: 'leaflet-layer-guland-land',
            errorTileUrl: TRANSPARENT_1PX
        };
        if (paneName) opts.pane = paneName;

        const landLayer = L.tileLayer(provinceObj.landUrl, opts);
        landLayer.on('tileunload', function (e) {
            if (e && e.tile && !e.tile.complete) {
                e.tile.src = '';
            }
        });
        return landLayer;
    }

    /**
     * Dọn dẹp triệt để mọi lớp gạch Guland (Quy hoạch + Ranh thửa) khỏi bản đồ Leaflet.
     * Đảm bảo không bao giờ bị nhân đôi hoặc sót lại layer mồ côi trên bản đồ.
     */
    function removeAllGulandLayersFromMap(map) {
        if (!map || typeof map.eachLayer !== 'function') return;
        try {
            const layersToRemove = [];
            map.eachLayer(l => {
                if (!l) return;
                const cls = (l.options && l.options.className) || '';
                const url = l._url || (l.options && l.options.url) || '';
                if (cls === 'leaflet-layer-guland-planning' || 
                    cls === 'leaflet-layer-guland-land' ||
                    (typeof url === 'string' && (url.includes('vcdn.cloud') || url.includes('guland')))) {
                    layersToRemove.push(l);
                }
            });
            layersToRemove.forEach(l => {
                try { map.removeLayer(l); } catch (_) {}
            });
        } catch (e) {
            console.warn('[GulandPlanning] Lỗi dọn dẹp layer:', e);
        }
    }

    /**
     * Đồng bộ trạng thái giữa projectMap và cadMap vì cả 2 cùng dùng chung AppState.leafletMap.
     */
    function syncMainMapTargets(sourceKey) {
        const otherKey = (sourceKey === 'projectMap') ? 'cadMap' : (sourceKey === 'cadMap' ? 'projectMap' : null);
        if (!otherKey) return;
        const src = targets[sourceKey];
        const dst = targets[otherKey];
        if (!src || !dst) return;
        dst.active = src.active;
        dst.layer = src.layer;
        dst.landLayer = src.landLayer;
        dst.provinceSlug = src.provinceSlug;
        dst.opacity = src.opacity;
        dst.showLand = src.showLand;
    }

    function getMapInstance(targetKey) {
        if (targetKey === 'liveMap') {
            if (typeof appTransform !== 'undefined') {
                if (!appTransform._liveMap && typeof appTransform.initDesktopLiveMap === 'function') {
                    appTransform.initDesktopLiveMap();
                }
                return appTransform._liveMap || null;
            }
            return null;
        }
        if (targetKey === 'transformMap') {
            if (typeof appTransformMap !== 'undefined') {
                if (!appTransformMap.map && typeof appTransformMap.init === 'function') {
                    appTransformMap.init();
                }
                return appTransformMap.map || null;
            }
            return null;
        }
        if (targetKey === 'projectMap' || targetKey === 'cadMap') {
            if (typeof appMap !== 'undefined' && typeof AppState !== 'undefined') {
                if (!AppState.leafletMap && typeof appMap.initMap === 'function') {
                    appMap.initMap();
                }
                return AppState.leafletMap || null;
            }
            return null;
        }
        return null;
    }

    const GulandPlanning = {
        provinces: PROVINCES_DATA,
        targets: targets,

        init() {
            loadSavedPreferences();
            this.syncAllPanelsHtml();
        },

        getProvince(slug) {
            return getProvinceBySlug(slug);
        },

        getProvinceByKtt(ktt) {
            return getProvinceByKtt(ktt);
        },

        /**
         * Bật / Tắt lớp Quy hoạch cho một bản đồ cụ thể
         */
        toggle(targetKey, forceState) {
            const t = targets[targetKey];
            if (!t) return false;
            const map = getMapInstance(targetKey);
            if (!map) return false;

            const nextState = (typeof forceState === 'boolean') ? forceState : !t.active;
            const provObj = getProvinceBySlug(t.provinceSlug);

            // Luôn gỡ bỏ triệt để mọi layer Guland đang có trên bản đồ này để đảm bảo không bao giờ bị nhân đôi
            removeAllGulandLayersFromMap(map);
            t.layer = null;
            t.landLayer = null;

            if (nextState) {
                t.layer = createLeafletLayer(provObj, t.opacity, map);
                if (t.layer) {
                    t.layer.addTo(map);
                }

                if (t.showLand && provObj.landUrl) {
                    t.landLayer = createLandLayer(provObj, map);
                    if (t.landLayer) {
                        t.landLayer.addTo(map);
                    }
                }

                // Tự động thu phóng và chuyển về tâm tỉnh quy hoạch nếu đang zoom quá xa (< 11)
                try {
                    const currentZoom = (typeof map.getZoom === 'function') ? map.getZoom() : 12;
                    if (currentZoom < 11 && provObj.center) {
                        map.setView(provObj.center, 12);
                    }
                } catch (_) {}

                t.active = true;
            } else {
                t.active = false;
            }

            // Đồng bộ trạng thái giữa projectMap và cadMap (cùng chung AppState.leafletMap)
            syncMainMapTargets(targetKey);

            this.updateTargetUI(targetKey);
            if (targetKey === 'projectMap') this.updateTargetUI('cadMap');
            else if (targetKey === 'cadMap') this.updateTargetUI('projectMap');

            return t.active;
        },

        /**
         * Bật / Tắt lớp Ranh thửa đất (layer_2)
         */
        toggleLandParcel(targetKey, forceState) {
            const t = targets[targetKey];
            if (!t) return;
            t.showLand = (typeof forceState === 'boolean') ? forceState : !t.showLand;
            const map = getMapInstance(targetKey);
            const provObj = getProvinceBySlug(t.provinceSlug);

            if (map) {
                if (t.landLayer) {
                    try { map.removeLayer(t.landLayer); } catch (_) {}
                    t.landLayer = null;
                }
                if (t.active && t.showLand && provObj.landUrl) {
                    t.landLayer = createLandLayer(provObj, map);
                    if (t.landLayer) {
                        t.landLayer.addTo(map);
                    }
                }
            }

            syncMainMapTargets(targetKey);
            this.updateTargetUI(targetKey);
            if (targetKey === 'projectMap') this.updateTargetUI('cadMap');
            else if (targetKey === 'cadMap') this.updateTargetUI('projectMap');
        },

        /**
         * Điều chỉnh độ mờ (0.1 - 1.0)
         */
        setOpacity(targetKey, opacityVal) {
            const t = targets[targetKey];
            if (!t) return;
            const val = Math.max(0.1, Math.min(1.0, parseFloat(opacityVal) || 0.65));
            t.opacity = val;
            if (t.layer && typeof t.layer.setOpacity === 'function') {
                t.layer.setOpacity(val);
            }
            savePreferences(null, val);

            syncMainMapTargets(targetKey);
            this.updateTargetUI(targetKey);
            if (targetKey === 'projectMap') this.updateTargetUI('cadMap');
            else if (targetKey === 'cadMap') this.updateTargetUI('projectMap');
        },

        /**
         * Chuyển tỉnh hiển thị cho một bản đồ
         */
        setProvince(targetKey, slug, panToCenter) {
            const t = targets[targetKey];
            if (!t) return;
            const provObj = getProvinceBySlug(slug);
            t.provinceSlug = provObj.slug;
            savePreferences(provObj.slug, null);

            const map = getMapInstance(targetKey);
            if (map) {
                removeAllGulandLayersFromMap(map);
                t.layer = null;
                t.landLayer = null;

                if (t.active) {
                    t.layer = createLeafletLayer(provObj, t.opacity, map);
                    if (t.layer) {
                        t.layer.addTo(map);
                    }

                    if (t.showLand && provObj.landUrl) {
                        t.landLayer = createLandLayer(provObj, map);
                        if (t.landLayer) {
                            t.landLayer.addTo(map);
                        }
                    }
                }
            }

            if (panToCenter && map && provObj.center) {
                try {
                    const currentZoom = (typeof map.getZoom === 'function') ? map.getZoom() : 12;
                    const targetZoom = Math.max(currentZoom, provObj.zoom || 12);
                    if (typeof map.flyTo === 'function') {
                        map.flyTo(provObj.center, targetZoom, { duration: 1.2 });
                    } else if (typeof map.setView === 'function') {
                        map.setView(provObj.center, targetZoom);
                    }
                } catch (_) {}
            }

            syncMainMapTargets(targetKey);

            this.updateTargetUI(targetKey);
            if (targetKey === 'projectMap') this.updateTargetUI('cadMap');
            else if (targetKey === 'cadMap') this.updateTargetUI('projectMap');

            if (typeof appMapLayers !== 'undefined' && appMapLayers.renderPanel) {
                const modal = document.getElementById('modalMapLayers');
                if (modal && modal.style.display !== 'none') {
                    appMapLayers.renderPanel();
                }
            }
        },

        /**
         * Tiện ích di chuyển hoặc đổi tỉnh nhanh
         */
        panToProvince(targetKey, slug) {
            if (slug) {
                this.setProvince(targetKey, slug, true);
            } else {
                this.panToCurrentProvince(targetKey);
            }
        },

        /**
         * Chuyển tỉnh toàn cục trên mọi giao diện
         */
        setProvinceGlobal(slug, panToCenter) {
            const provObj = getProvinceBySlug(slug);
            Object.keys(targets).forEach(k => {
                targets[k].provinceSlug = provObj.slug;
            });
            savePreferences(provObj.slug, null);

            let mapToPan = null;
            if (typeof AppState !== 'undefined' && AppState.leafletMap) {
                const isMainActive = (targets.projectMap && targets.projectMap.active) || (targets.cadMap && targets.cadMap.active);
                if (isMainActive) {
                    const activeKey = (AppState.mapMode === 'cad') ? 'cadMap' : 'projectMap';
                    this.setProvince(activeKey, provObj.slug, false);
                }
                mapToPan = AppState.leafletMap;
            }
            if (typeof appTransform !== 'undefined' && appTransform._liveMap) {
                if (targets.liveMap.active) this.setProvince('liveMap', provObj.slug, false);
                if (!mapToPan) mapToPan = appTransform._liveMap;
            }
            if (typeof appTransformMap !== 'undefined' && appTransformMap.map) {
                if (targets.transformMap.active) this.setProvince('transformMap', provObj.slug, false);
                if (!mapToPan) mapToPan = appTransformMap.map;
            }

            if (panToCenter && mapToPan && provObj.center) {
                try {
                    const curZoom = (typeof mapToPan.getZoom === 'function') ? mapToPan.getZoom() : 12;
                    const targetZoom = Math.max(curZoom, provObj.zoom || 12);
                    if (typeof mapToPan.flyTo === 'function') mapToPan.flyTo(provObj.center, targetZoom, { duration: 1.2 });
                    else if (typeof mapToPan.setView === 'function') mapToPan.setView(provObj.center, targetZoom);
                } catch (_) {}
            }

            Object.keys(targets).forEach(k => this.updateTargetUI(k));
        },

        /**
         * Di chuyển bản đồ về tâm tỉnh đang chọn
         */
        panToCurrentProvince(targetKey) {
            const t = targets[targetKey];
            if (!t) return;
            const provObj = getProvinceBySlug(t.provinceSlug);
            const map = getMapInstance(targetKey);
            if (map && provObj && provObj.center) {
                try {
                    const currentZoom = (typeof map.getZoom === 'function') ? map.getZoom() : 12;
                    const targetZoom = Math.max(currentZoom, provObj.zoom || 12);
                    if (typeof map.flyTo === 'function') {
                        map.flyTo(provObj.center, targetZoom, { duration: 1.2 });
                    } else if (typeof map.setView === 'function') {
                        map.setView(provObj.center, targetZoom);
                    }
                } catch (_) {}
            }
        },

        /**
         * Tự động đề xuất tỉnh dựa theo KTT hoặc kinh độ trung tâm
         */
        autoDetectProvince(targetKey, kttOrLng) {
            const prov = getProvinceByKtt(kttOrLng);
            if (prov) {
                this.setProvince(targetKey, prov.slug, false);
            }
        },

        /**
         * Render HTML cho menu dropdown 63 tỉnh
         */
        renderProvinceOptionsHtml(selectedSlug) {
            return PROVINCES_DATA.map(p => {
                const sel = (p.slug === selectedSlug) ? 'selected' : '';
                return `<option value="${p.slug}" ${sel}>${p.name} (KTT ${p.ktt}°)</option>`;
            }).join('');
        },

        /**
         * Dựng khung điều khiển Floating Card cho một bề mặt
         */
        syncPanelHtml(k) {
            if (typeof document === 'undefined') return;
            const t = targets[k];
            if (!t) return;
            const panel = document.getElementById(t.panelId);
            if (!panel) return;
            const provObj = getProvinceBySlug(t.provinceSlug);
            const percent = Math.round((t.opacity || 0.65) * 100);
            panel.innerHTML = `
                <div class="planning-ctrl-header">
                    <div class="planning-ctrl-title">
                        <span class="planning-icon">📐</span>
                        <span class="planning-title-text">BẢN ĐỒ QUY HOẠCH 2030</span>
                    </div>
                    <div class="planning-ctrl-status ${t.active ? 'is-active' : ''}">
                        ${t.active ? '🟢 Đang hiện' : '⚪ Đang tắt'}
                    </div>
                    <button type="button" class="btn-planning-close" onclick="appPlanning.togglePanel('${k}', false)" title="Đóng bảng điều khiển">✕</button>
                </div>
                <div class="planning-ctrl-body">
                    <div class="planning-row">
                        <label class="planning-label">Tỉnh / Thành (63 tỉnh):</label>
                        <select class="planning-province-select" onchange="appPlanning.setProvince('${k}', this.value, true)" title="Chọn tỉnh thành quy hoạch" aria-label="Chọn tỉnh thành quy hoạch">
                            ${this.renderProvinceOptionsHtml(t.provinceSlug)}
                        </select>
                    </div>
                    <div class="planning-row">
                        <label class="planning-label">Độ mờ: <b class="planning-opacity-text">${percent}%</b></label>
                        <input type="range" class="planning-opacity-slider" min="10" max="100" value="${percent}" 
                               oninput="appPlanning.onSliderChange('${k}', this.value)" title="Kéo để nhìn xuyên thấu xuống ảnh vệ tinh" aria-label="Độ mờ lớp quy hoạch">
                    </div>
                    <div class="planning-row" style="margin-top: 4px; display: flex; align-items: center; justify-content: space-between;">
                        <label class="planning-label" style="margin: 0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <input type="checkbox" class="planning-land-checkbox" ${t.showLand ? 'checked' : ''} onchange="appPlanning.toggleLandParcel('${k}', this.checked)">
                            <span style="font-size: 11px;">Ranh thửa đất (Sổ đỏ)</span>
                        </label>
                        <span class="planning-note-badge" style="font-size: 10px; color: ${provObj.landUrl ? '#10b981' : '#94a3b8'};">${provObj.landUrl ? '✓ Có sẵn' : 'Đang cập nhật'}</span>
                    </div>
                    <div class="planning-actions-row">
                        <button type="button" class="btn-planning-sub ${t.active ? 'btn-active-glow' : ''}" onclick="appPlanning.toggle('${k}')">
                            ${t.active ? '⏸️ Tắt lớp phủ' : '▶️ Bật lớp phủ'}
                        </button>
                        <button type="button" class="btn-planning-sub" onclick="appPlanning.panToCurrentProvince('${k}')" title="Phóng nhanh tới tâm tỉnh">
                            🎯 Về tâm tỉnh
                        </button>
                    </div>
                    <div class="planning-note">
                        ℹ️ Dữ liệu số hóa tham khảo Quy hoạch 2030 • Nền quy hoạch nằm bên dưới, cho phép thao tác xem các điểm, tuyến, đa giác ở trên cùng.
                    </div>
                </div>
            `;
        },

        /**
         * Dựng khung điều khiển Floating Card cho từng bề mặt
         */
        syncAllPanelsHtml() {
            if (typeof document === 'undefined') return;
            Object.keys(targets).forEach(k => this.syncPanelHtml(k));
        },

        onSliderChange(targetKey, val) {
            const num = parseInt(val, 10);
            this.setOpacity(targetKey, num / 100);
        },

        togglePanel(targetKey, forceShow) {
            if (typeof document === 'undefined') return;
            const t = targets[targetKey];
            if (!t) return;
            const panel = document.getElementById(t.panelId);
            if (!panel) return;
            if (!panel.innerHTML || panel.innerHTML.trim() === '') {
                this.syncPanelHtml(targetKey);
            }
            const isShown = panel.style.display !== 'none';
            const willShow = (typeof forceShow === 'boolean') ? forceShow : !isShown;
            panel.style.display = willShow ? 'flex' : 'none';
            if (willShow) {
                this.updateTargetUI(targetKey);
            }
        },

        updateTargetUI(targetKey) {
            if (typeof document === 'undefined') return;
            const t = targets[targetKey];
            if (!t) return;
            const provObj = getProvinceBySlug(t.provinceSlug);

            // Nút bấm trên thanh công cụ
            const btn = document.getElementById(t.btnId);
            if (btn) {
                if (t.active) {
                    btn.classList.add('active');
                    btn.setAttribute('title', `📐 Đang bật Quy hoạch: ${provObj.name} (${Math.round(t.opacity * 100)}%)`);
                } else {
                    btn.classList.remove('active');
                    btn.setAttribute('title', '📐 Bản đồ Quy hoạch sử dụng đất 2030');
                }
            }

            // Đồng bộ nút và trạng thái trên cả MiniCAD và Bản đồ dự án
            const projBtn = document.getElementById('btnMapProjectPlanning');
            if (projBtn && (targetKey === 'projectMap' || targetKey === 'cadMap')) {
                projBtn.classList.toggle('active', !!t.active);
            }
            const cadBtn = document.getElementById('btnCadPlanning');
            if (cadBtn && (targetKey === 'projectMap' || targetKey === 'cadMap')) {
                cadBtn.classList.toggle('active', !!t.active);
            }
            const cadChk = document.getElementById('cadCheckShowGulandPlanning');
            if (cadChk && (targetKey === 'projectMap' || targetKey === 'cadMap')) {
                cadChk.checked = !!t.active;
            }
            const mlSw = document.getElementById('mlGulandSwitch');
            if (mlSw && (targetKey === 'projectMap' || targetKey === 'cadMap')) {
                mlSw.checked = !!t.active;
            }

            // Bảng điều khiển
            const panel = document.getElementById(t.panelId);
            if (panel) {
                if (!panel.innerHTML || panel.innerHTML.trim() === '') {
                    this.syncPanelHtml(targetKey);
                    return;
                }
                const statusEl = panel.querySelector('.planning-ctrl-status');
                if (statusEl) {
                    statusEl.className = `planning-ctrl-status ${t.active ? 'is-active' : ''}`;
                    statusEl.textContent = t.active ? '🟢 Đang hiện' : '⚪ Đang tắt';
                }
                const toggleBtn = panel.querySelector('.planning-actions-row button:first-child');
                if (toggleBtn) {
                    toggleBtn.textContent = t.active ? '⏸️ Tắt lớp phủ' : '▶️ Bật lớp phủ';
                    if (t.active) toggleBtn.classList.add('btn-active-glow');
                    else toggleBtn.classList.remove('btn-active-glow');
                }
                const selectEl = panel.querySelector('.planning-province-select');
                if (selectEl && selectEl.value !== t.provinceSlug) {
                    selectEl.value = t.provinceSlug;
                }
                const opText = panel.querySelector('.planning-opacity-text');
                if (opText) {
                    opText.textContent = `${Math.round(t.opacity * 100)}%`;
                }
                const sliderEl = panel.querySelector('.planning-opacity-slider');
                if (sliderEl) {
                    sliderEl.value = Math.round(t.opacity * 100);
                }
                const landChk = panel.querySelector('.planning-land-checkbox');
                if (landChk) {
                    landChk.checked = !!t.showLand;
                }
                const landBadge = panel.querySelector('.planning-note-badge');
                if (landBadge) {
                    landBadge.textContent = provObj.landUrl ? '✓ Có sẵn' : 'Đang cập nhật';
                    landBadge.style.color = provObj.landUrl ? '#10b981' : '#94a3b8';
                }
            }
        },

        // Helper tiện ích gọi trực tiếp từ nút giao diện
        toggleLiveMapPlanning() {
            const mapWrap = document.getElementById('boxTransformLiveMapWrap');
            if (mapWrap && mapWrap.style.display === 'none') {
                mapWrap.style.display = 'flex';
            }
            if (typeof appTransform !== 'undefined' && typeof appTransform.initDesktopLiveMap === 'function') {
                appTransform.initDesktopLiveMap();
                if (appTransform._liveMap) {
                    setTimeout(() => {
                        try { appTransform._liveMap.invalidateSize(); } catch (_) {}
                    }, 150);
                }
            }
            const willOpen = !targets.liveMap.active;
            this.toggle('liveMap', willOpen);
            this.togglePanel('liveMap', willOpen);
            if (typeof showToast === 'function') {
                const prov = getProvinceBySlug(targets.liveMap.provinceSlug);
                showToast(willOpen ? `📐 Live Map: Đã bật Quy hoạch ${prov.name}` : `Live Map: Đã tắt lớp Quy hoạch`);
            }
        },

        toggleTransformMapPlanning() {
            if (typeof appTransformMap !== 'undefined' && !appTransformMap.map && typeof appTransformMap.init === 'function') {
                appTransformMap.init();
            }
            const willOpen = !targets.transformMap.active;
            this.toggle('transformMap', willOpen);
            this.togglePanel('transformMap', willOpen);
            if (typeof showToast === 'function') {
                const prov = getProvinceBySlug(targets.transformMap.provinceSlug);
                showToast(willOpen ? `📐 Bản đồ Chuyển đổi: Đã bật Quy hoạch ${prov.name}` : `Bản đồ Chuyển đổi: Đã tắt lớp Quy hoạch`);
            }
        },

        toggleProjectMapPlanning() {
            if (typeof appMap !== 'undefined' && typeof AppState !== 'undefined' && !AppState.leafletMap && typeof appMap.initMap === 'function') {
                appMap.initMap();
            }
            const willOpen = !targets.projectMap.active;
            this.toggle('projectMap', willOpen);
            this.togglePanel('projectMap', willOpen);
            if (typeof showToast === 'function') {
                const prov = getProvinceBySlug(targets.projectMap.provinceSlug);
                showToast(willOpen ? `📐 Bản đồ Dự án: Đã bật Quy hoạch ${prov.name}` : `Bản đồ Dự án: Đã tắt lớp Quy hoạch`);
            }
        },

        toggleCadPlanning(forceState) {
            if (typeof appMap !== 'undefined' && typeof AppState !== 'undefined' && !AppState.leafletMap && typeof appMap.initMap === 'function') {
                appMap.initMap();
            }
            const willOpen = (typeof forceState === 'boolean') ? forceState : !targets.cadMap.active;
            this.toggle('cadMap', willOpen);
            this.togglePanel('cadMap', willOpen);
            const chk = document.getElementById('cadCheckShowGulandPlanning');
            if (chk) chk.checked = willOpen;
            const btn = document.getElementById('btnCadPlanning');
            if (btn) btn.classList.toggle('active', willOpen);
            if (typeof showToast === 'function') {
                const prov = getProvinceBySlug(targets.cadMap.provinceSlug);
                showToast(willOpen ? `📐 MiniCAD: Đã bật Quy hoạch ${prov.name} làm nền` : `MiniCAD: Đã tắt lớp Quy hoạch`);
            }
        }
    };

    global.GulandPlanning = GulandPlanning;
    global.appPlanning = GulandPlanning;

    // Tự động khởi tạo ngay khi tài liệu sẵn sàng
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => GulandPlanning.init());
        } else {
            GulandPlanning.init();
        }
    } else if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
        try { GulandPlanning.init(); } catch (_) {}
    }

})(typeof window !== 'undefined' ? window : this);
