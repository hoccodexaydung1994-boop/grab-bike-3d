# Grab Bike 3D – Quận 7 (Phú Mỹ Hưng)

Game 3D chạy trên web (Three.js): tài xế xe ôm công nghệ lái Vespa quanh khu phố, đón khách và chở tới nơi.

## Các file
- `index.html` – toàn bộ code game (HTML + CSS + JavaScript)
- `models/vespa.glb` – mô hình xe Vespa đã giảm lưới cho web (~38 nghìn tam giác, texture nằm trong file)

## Chạy
- GitHub Pages: Settings → Pages → Branch `main`, thư mục `/ (root)` → mở `https://<tài-khoản>.github.io/<tên-repo>/`
- Trên máy: chạy một web server trong thư mục này, ví dụ `python -m http.server 8000`, rồi mở http://localhost:8000
  (bấm đúp mở thẳng index.html sẽ không tải được mô hình vì trình duyệt chặn file://)

## Điều khiển
W/↑ ga · S/↓ phanh · A D/← → lái · Space phanh tay · H còi · G tới điểm đón/trả · P điện thoại · C đổi góc máy · V xem xe 360° · M tắt tiếng · R về nhà

## Ghi công
Bản đồ: © OpenStreetMap contributors (ODbL). Mô hình xe: "Electric scooter" – artgeorg (CGTrader, miễn phí). Thư viện: three.js r160 (tải từ cdn.jsdelivr.net).
