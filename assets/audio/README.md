# Âm thanh thật cho game

Bỏ file âm thanh vào **thư mục này** với đúng tên bên dưới (định dạng .ogg, .mp3 hoặc .wav đều được — nếu khác đuôi thì sửa `file` trong `data/config/sounds.json`).
File nào thiếu, game tự dùng âm thanh tổng hợp thay thế, không lỗi.

| Tên file | Dùng cho | Gợi ý file tải | Nguồn | Giấy phép |
|---|---|---|---|---|
| `engine_loop.ogg` | engine | loop_0.wav (đổi tên/chuyển sang engine_loop.ogg hoặc sửa 'file' thành engine_loop.wav) | https://opengameart.org/content/racing-car-engine-sound-loops | CC0 |
| `rain_loop.ogg` | rain | giải nén Rain OGG.zip, lấy 1 file | https://opengameart.org/content/rain-loopable | CC0 |
| `city_loop.ogg` | city | Urban city sounds and light car traffic | https://mixkit.co/free-sound-effects/car/ | Mixkit SFX License |
| `horn.ogg` | horn | Small car horn | https://mixkit.co/free-sound-effects/car/ | Mixkit SFX License |
| `crash.ogg` | crash | Toy car crash (hoặc bất kỳ tiếng va chạm) | https://mixkit.co/free-sound-effects/car/ | Mixkit SFX License |
| `engine_start.ogg` | start | generic_car_startengine_1.wav | https://opengameart.org/node/93658 | CC0 |
| `offer.ogg` | offer | tiếng ting báo cuốc mới (tuỳ chọn) | — | — |
| `cash.ogg` | cash | tiếng tiền về (tuỳ chọn) | — | — |
| `siren.ogg` | siren | còi hú CSGT (tuỳ chọn) | — | — |

Mẹo: engine nên là đoạn lặp liền mạch 1–4 giây; game tự tăng cao độ theo tốc độ. File nên dưới 1 MB để tải nhanh trên điện thoại.
