# Grab Bike 3D – Quận 7 (Phú Mỹ Hưng) · v3.0

Game 3D chạy trên web (Three.js): làm tài xế GrabBike / GrabFood chạy Vespa quanh Phú Mỹ Hưng trên bản đồ OpenStreetMap thật.

## Cấu trúc thư mục

```
grab-bike-3d/
├── index.html              Khung giao diện (HTML) – không chứa code game
├── css/style.css           Toàn bộ giao diện (menu, HUD, hội thoại, bảng quản lý)
├── src/
│   ├── main.js             Điểm khởi động: nạp three.js → dữ liệu → các file game theo manifest
│   ├── manifest.json       Phiên bản + THỨ TỰ nạp file + danh sách file cấu hình
│   ├── boot.js             Chạy cuối cùng: BOOT hooks, bắt đầu vòng lặp
│   ├── core/               renderer, vật liệu, âm thanh, điều khiển, vòng lặp
│   ├── models/             Vespa (GLB), người, điện thoại trên xe
│   ├── world/              bản đồ, xe cộ, đêm, giờ cao điểm, cầu, người đi bộ, điểm nóng, phòng trọ 3D, âm thanh môi trường
│   ├── game/               đơn hàng, luật giao thông, CSGT, đơn ghép, té xe, khách, khu giao hàng, Story Mode, nhiệm vụ phụ
│   ├── life/               chỉ số sinh tồn, ăn uống vỉa hè, ngủ bụi, pin điện thoại, học tiếng Anh
│   ├── player/             tạo nhân vật & trang phục, garage đổi xe
│   ├── ui/                 HUD, bản đồ nhỏ, bảng quản lý (Tab), cần lái cảm ứng, tối ưu điện thoại
│   ├── net/online.js       Chơi online (Firebase / PeerJS), bảng xếp hạng
│   ├── net/friends.js      Bạn bè: thấy đúng xe & độ cao của bạn, danh sách bạn, tìm bạn trên bản đồ
│   └── data/savedata.js    Quản lý dữ liệu: ô lưu, sao lưu, xuất/nhập file, lưu đám mây Google
├── data/
│   ├── map/q7.json         Bản đồ Quận 7 (đường, nhà, cây, đèn, quán) chuyển từ OSM
│   └── config/             DỮ LIỆU GAME – sửa ở đây, không cần đụng code
│       ├── shop.json       thực đơn quán, hàng rong, đơn hiếm, loại khách
│       ├── law.json        lỗi vi phạm, mức phạt, trừ điểm GPLX
│       ├── progression.json kỹ năng, mở khóa theo cấp, nâng cấp xe, màu sơn, thành tích
│       ├── outfits.json    màu da, áo khoác, mũ bảo hiểm, phụ kiện (giá, cấp yêu cầu)
│       ├── bikes.json      các mẫu xe trong garage (giá, tốc độ, hao xăng…)
│       ├── story.json      lời thoại & phần thưởng 6 chương Story Mode
│       ├── sidequests.json nhiệm vụ phụ (người nhờ, các bước, thưởng)
│       ├── english.json    bài học tiếng Anh + câu hỏi
│       ├── chatter.json    câu tán gẫu, mẹo của tài xế ở quán cóc
│       └── sounds.json     danh sách file âm thanh, âm lượng
├── models/                 Mô hình xe: sh.glb (Honda SH 160i, xe mặc định), vespa.glb
├── assets/audio/           Âm thanh thật (xem assets/audio/README.md: tên file + link tải)
├── tests/                  Kiểm tra tự động bằng Node (không cần trình duyệt)
├── firebase-rules.json     Luật bảo mật Realtime Database (dán vào Firebase)
└── vercel.json             Cấu hình cache cho Vercel
```

### Thêm một file code mới
1. Tạo file trong `src/...` (các file dùng chung phạm vi toàn cục, như cùng một chương trình).
2. Thêm đường dẫn vào `src/manifest.json` → `files` đúng chỗ (sau các file nó cần dùng).
3. Tăng `version` trong manifest để trình duyệt tải bản mới.

### Thêm/sửa dữ liệu
Sửa file JSON trong `data/config/`, ví dụ thêm món vào `shop.json`, thêm xe vào `bikes.json`, thêm nhiệm vụ vào `sidequests.json`. File cấu hình mới thì thêm tên vào `config` trong manifest, code đọc bằng `CFG.<tên-file>`.

## Chạy
- **Vercel** (đang dùng): đẩy cả thư mục lên GitHub, Vercel tự triển khai.
- **Trên máy**: phải chạy qua web server (mở thẳng `index.html` sẽ báo lỗi vì trình duyệt chặn đọc file):
  `npx serve .` hoặc `python -m http.server 8000` → mở http://localhost:8000
- **Kiểm tra lỗi**: `node tests/smoke-core.mjs .` · `node tests/smoke-features.mjs .` · `node tests/smoke-world.mjs .` · `node tests/smoke-net.mjs .`

## Đồ hoạ
Hai mức, đổi trong Cài đặt (☰ → ⚙️ → Mức đồ hoạ): **Cao** (mặc định trên máy tính: bầu trời và mặt trời theo giờ, phản chiếu, bloom, bóng đổ 4K, nhà có ban công/mái hiên/bồn nước, cây và đèn đường chi tiết) và **Thấp** (điện thoại, máy yếu). Code: `src/world/hd.js` và các đoạn `GFX_HIGH` trong `world/map.js`, `world/night.js`, `player/character.js`.

## Âm thanh
Tải file theo bảng trong `assets/audio/README.md`, bỏ vào `assets/audio/` rồi đẩy lên GitHub. Thiếu file nào, game dùng âm thanh tổng hợp cho phần đó.

## Dữ liệu người chơi
Bấm **💾 Dữ liệu** ở menu hoặc tab 💾 trong bảng Tab:
- 3 ô lưu, sao lưu tự động mỗi ngày mới (giữ 5 bản gần nhất), khôi phục 1 chạm
- Xuất / nhập file `.json` để chuyển sang máy khác
- **Đăng nhập Google** → lưu hồ sơ lên đám mây (Firebase) và chơi tiếp ở thiết bị khác

## Firebase
1. Authentication → Sign-in method: bật **Anonymous** và **Google**.
2. Authentication → Settings → Authorized domains: thêm `grab-bike-3d.vercel.app`.
3. Realtime Database → Rules: dán `firebase-rules.json` (có thêm nhánh `users` cho lưu đám mây) → Publish.
4. Cấu hình Firebase nằm ở đầu `src/net/online.js` (`FIREBASE_CONFIG`).

## Điều khiển
W/↑ ga · S/↓ phanh · A D/← → lái · Space phanh tay · Enter nhận cuốc · N bỏ qua · E hành động · Q nhiệm vụ · Tab bảng quản lý · 1/2/3 chọn hội thoại · H còi · G tới điểm đón/trả · C đổi góc máy · M tắt tiếng

## Ghi công
Bản đồ © OpenStreetMap contributors (ODbL) · Mô hình xe "Electric scooter" – artgeorg (CGTrader, miễn phí) · three.js r160.
