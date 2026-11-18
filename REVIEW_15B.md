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

## Kết quả kiểm thử cảnh mẫu

- Bốn smoke suite và hai bài hồi quy quận đã qua trên bản dựng cảnh đầu tiên. Chromium WebGL 2 kiểm tra ảnh cùng tọa độ, góc nhìn và giờ 17:45 ở ba vị trí.
- Kiểm tra nhận, đón và trả khách ở Quận 1 dùng phím G của chế độ dễ để đến hai điểm nhiệm vụ. Hồ sơ kiểm thử ghi thêm một chuyến hoàn thành. Kiểm tra riêng chạy toàn bộ đoạn đường bằng bộ điều khiển xe thật của game.
- Video cảnh mẫu lấy khung hình trực tiếp từ WebGL theo bước mô phỏng cố định. Bộ kiểm thử tắt xe lưu thông để giữ đường chạy lặp lại được và giữ người đi bộ. Đây là minh họa lối lái và cảnh phố. Video không dùng để kết luận FPS thiết bị.
- Tại thời điểm kiểm thử, WebGL chạy qua SwiftShader. Chưa có số FPS từ thiết bị desktop hoặc mobile thật.

## Nhân vật có bộ xương — bản thử 15B.2

Mẫu mặc định trong chế độ Hẻm 15B dùng Superhero Male từ gói Standard miễn phí của Quaternius. Model đã thu gọn tỷ lệ thân và thay màu trang phục theo áo khoác tài xế. Bộ xương có 65 khớp. File GLB nhúng hình học, texture và các clip chuyển động, với kích thước khoảng 0,88 MB.

- Model và bộ chuyển động gốc theo giấy phép CC0. [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) · [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html)
- Bản thử dùng clip đứng, đi và chạy. Tư thế ngồi được tính theo điểm tay lái và đặt chân của xe. Lên và xuống xe dùng chuyển tiếp giữa các tư thế khớp.
- Mẫu được bật cho ngoại hình nam mặc định trong đoạn thử 15B. Các tùy chọn trang phục khác tiếp tục dùng nhân vật dự phòng hiện có.

Chromium đã tải file GLB thật và xác nhận lưới có 65 khớp. Kiểm tra thấy transform khớp thay đổi khi đứng, đi và chạy. Cả hai chuyển tiếp lên và xuống xe hiển thị đúng model, xe giữ vị trí khi người lái bước đi và vẫn chạy sau khi lên lại. Thay trang phục chuyển sang mẫu dự phòng và trả về rig khi chọn lại bộ mặc định. Ảnh và clip được quay bằng WebGL qua SwiftShader.
