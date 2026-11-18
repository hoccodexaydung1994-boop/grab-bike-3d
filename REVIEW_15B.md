# Hẻm 15B — bản mẫu đồ họa

Mốc đối chiếu là v3.1.1 tại commit `71ab273`. Nhánh `feature/hem-15b-art` dựng một đoạn mẫu khoảng 110 m theo mạng đường OpenStreetMap từ Lê Thánh Tôn vào Hẻm 15B. Cảnh phố có thiết kế cách điệu và bảng hiệu hư cấu.

## Chạy bản mẫu

Chạy `python -m http.server 8000` từ thư mục dự án.

- Bản đồ thường để đối chiếu dùng `http://localhost:8000/?district=q1`.
- Bản mẫu dùng `http://localhost:8000/?district=q1&art=15b`.

Bản mẫu chỉ bật khi có cả hai tham số. Các URL thông thường tiếp tục dùng cảnh và HUD v3.1.1. Thử nghiệm HUD v3.1.2 ở workspace cũ được giữ riêng.

## Cách đối chiếu hình ảnh

Ba góc máy được đặt dọc đường hẻm tại cửa hẻm, đoạn giữa và cuối đoạn mẫu. Bộ ảnh trước–sau dùng cùng vị trí xe, hướng nhìn, cấu hình đồ họa và giờ trong game. Ảnh riêng có HUD dùng để kiểm tra chỉ dẫn khi đang chạy.

Mạng đường, dữ liệu bản đồ, luật va chạm, hồ sơ, Firebase và cấu hình phát hành nằm ngoài thay đổi. Chất lượng hình ảnh cần người dùng duyệt trước khi mở rộng. Việc phát hành production cần phê duyệt riêng.

## Cảnh và nhân vật

Năm mặt tiền dùng bảng hiệu vẽ bằng Canvas, cửa kính, mái hiên và đèn lồng tự dựng. Đoạn giữa có sân lát đá, chậu cây và nắp thoát nước. Các chi tiết dùng chung hình học và vật liệu khi có thể. Mọi biển hiệu và chi tiết trang phục mới do dự án dựng. Mạng đường vẫn dùng dữ liệu OpenStreetMap đã có trong dự án.

Mẫu người lái có áo gọn vai, tay áo thuôn, vật liệu vải nhám và mũ bán mờ có kính che. Các mô hình áp dụng khi ngồi xe lẫn đi bộ. Các khớp, điểm đặt tay và lựa chọn trang phục vẫn theo bộ điều khiển cũ.
