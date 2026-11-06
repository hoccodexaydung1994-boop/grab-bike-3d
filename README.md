# Grab Bike 3D – Quận 7 (Phú Mỹ Hưng)

Game 3D chạy trên web (Three.js): tài xế xe ôm công nghệ lái Vespa quanh khu phố, đón khách và chở tới nơi.

## Các file
- `index.html` – toàn bộ code game (HTML + CSS + JavaScript)
- `models/vespa.glb` – mô hình xe Vespa đã giảm lưới cho web (~38 nghìn tam giác, texture nằm trong file)

## Chạy
- GitHub Pages: Settings → Pages → Branch `main`, thư mục `/ (root)` → mở `https://<tài-khoản>.github.io/<tên-repo>/`
- Trên máy: chạy một web server trong thư mục này, ví dụ `python -m http.server 8000`, rồi mở http://localhost:8000
  (bấm đúp mở thẳng index.html sẽ không tải được mô hình vì trình duyệt chặn file://)

## Tính năng
- Bản đồ Phú Mỹ Hưng (Q7) thật, đèn giao thông, CSGT (dừng nộp phạt / bỏ chạy → giam xe, khóa app hết ngày)
- GrabBike & GrabFood (quán thật trên bản đồ), tìm đường theo đường thật
- Chỉ số: Sức khỏe, Thể lực, Đói, Khát, Stress, Xăng, Độ bền xe; tiền mặt / ví / tiết kiệm
- Hội thoại & lựa chọn (English Mode), sự kiện ngẫu nhiên, nhiệm vụ ngày, thành tích, báo cáo cuối ca, về nhà
- Đơn ghép 2 quán – 2 khách (chọn tuyến tối ưu, thưởng combo)
- Cây kỹ năng 3 nhánh, mở khóa theo cấp, nâng cấp xe, hạng tài xế, tỉ lệ nhận/hủy cuốc
- Luật giao thông: chốt CSGT, camera phạt nguội, ngược chiều, vỉa hè, quá tốc độ, mức truy nã 0–5, điểm GPLX 12
- Màn hình Hồ sơ / Kỹ năng / Xe / Tài chính / Cài đặt (phím Tab)
- Chơi online cùng bạn bè: tạo phòng / nhập mã phòng (PeerJS, cần internet; một số mạng công ty/4G có thể chặn kết nối P2P)
- Hồ sơ lưu trong trình duyệt (localStorage)

## Điều khiển
Enter nhận cuốc · N bỏ qua · E hành động · Q nhiệm vụ · 1/2/3 chọn hội thoại · W/↑ ga · S/↓ phanh · A D/← → lái · Space phanh tay · H còi · G tới điểm đón/trả · P điện thoại · C đổi góc máy · V xem xe 360° · M tắt tiếng · R về nhà

## Ghi công
Bản đồ: © OpenStreetMap contributors (ODbL). Mô hình xe: "Electric scooter" – artgeorg (CGTrader, miễn phí). Thư viện: three.js r160 (tải từ cdn.jsdelivr.net).

## Firebase (chơi online qua máy chủ riêng)
1. Firebase Console → dự án của bạn → **Build → Authentication → Sign-in method → bật Anonymous**.
2. **Authentication → Settings → Authorized domains → Add domain**: `<tên-tài-khoản>.github.io`.
3. **Build → Realtime Database → Create database** (chọn vùng Singapore `asia-southeast1`).
4. Tab **Rules**: dán nội dung `firebase-rules.json` → Publish.
5. **Project settings → Your apps → Web app (</>)** → copy `firebaseConfig` (phải có `databaseURL`).
6. Mở `index.html`, tìm dòng `const FIREBASE_CONFIG = null;` và thay `null` bằng object cấu hình,
   ví dụ `const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", databaseURL: "https://....firebasedatabase.app", projectId: "...", appId: "..." };`
   (hoặc dán cấu hình trong game: menu → 🌐 → ⚙️ Cấu hình Firebase — cách này chỉ lưu trên trình duyệt đó).
