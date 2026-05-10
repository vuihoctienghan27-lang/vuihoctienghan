# Kế Hoạch Chuyển Đổi Chế Độ Bộ Đề & Dạng Câu + Cải Thiện Carousel trên Index

Mục tiêu là đại tu cơ chế hiển thị danh sách bài tập tại trang chủ (`index.html`), cho phép người dùng linh hoạt bật tắt giữa *"Bộ đề hoàn chỉnh"* và *"Các phân loại dạng câu"*, hỗ trợ riêng biệt cho TOPIK I và TOPIK II. Đồng thời, thiết lập cơ chế cuộn ngang (Carousel) vòng tròn vô tận có phân trang.

## User Review Required

> [!IMPORTANT]
> - Về mặt giao diện, việc hỗ trợ chức năng cuộn ngang không đáy (infinite loop scroll) yêu cầu can thiệp Javascript để liên tục luân chuyển (clone/hoán vị) các trang với nhau. Tôi sẽ tạo 1 logic cuộn bằng JS mượt mà kèm thanh dots chỉ số trang hiện tại.
> - Kích thước lưới (Grid) trên di động sẽ chia thành các trang con (Pages), mỗi trang chứa tối đa 6 mục (như bạn yêu cầu). Tổng số dạng TOPIK I là 16 (cho 3 trang theo tỷ lệ 6+6+4).
> - Bạn vui lòng xác nhận xem tôi có thể dùng cấu trúc mảng Javascript trong `index.html` để quản lí và render lại hoàn toàn mã HTML của các lá bài hay không (thay vì viết chay HTML như hiện tại).

## 1. Dữ liệu mảng (Data Models)
Thay vì code chay HTML, ta sẽ định nghĩa mảng dữ liệu trong JS:

*   **`EXAM_DATA`**: Áp dụng chung cho T1 & T2, với các mã số đề: `35, 36, 37, 41, 47, 52, 60, 64, 83, 91, 96, 102` (12 đề -> 2 trang)
*   **`TYPE_DATA_T1`**: Gồm 16 định dạng câu (31~70), chia làm 3 trang (6+6+4).
*   **`TYPE_DATA_T2`**: Gồm 18 định dạng câu (1~50), chia làm 3 trang (6+6+6).

## 2. Giao diện Desktop & Các Card sáng hơn (Lighter Cards)

#### [MODIFY] `public/index.html`
*   Làm sáng màu nền của luồng thẻ `.exam-card` (có thể sử dụng màu nền RGB sáng kết hợp làm mờ và hiệu ứng viền nổi nhẹ nhàng, rực rỡ hơn).
*   Chèn một công tắc (Toggle Switch) lên cùng dòng tiêu đề section "📚 Chọn bộ đề". Khi gạt công tắc này sang "Dạng câu":
    *   Tiêu đề Hero đổi từ *Luyện thi theo bộ đề* sang *Luyện thi theo dạng câu*.
    *   Tiêu đề Section đổi từ *📚 Chọn bộ đề* sang *📚 Chọn dạng câu*.
    *   Cấu trúc luồng chạy JS render lại lưới thẻ (Cards) tùy vào Level hiện tại (T1 hay T2).

## 3. Hoạt ảnh Carousel ngang trên Mobile (Infinite Loop)

*   **HTML Structure**:
    ```html
    <div class="carousel-viewport">
        <div class="carousel-track" id="examTrack">
            <div class="carousel-page"> ... 6 cards ... </div>
            <div class="carousel-page"> ... 6 cards ... </div>
            <!-- ... -->
        </div>
    </div>
    <div class="carousel-dots" id="carouselDots"></div>
    ```
*   **CSS Mobile (`max-width: 768px`)**:
    *   Chia mỗi `carousel-page` vừa khích với màn hình thiết bị (`width: 100%`).
    *   Sử dụng Touch Event Listener trong JavaScript để tính toán vị trí Swiping, khi đã cuộn chạm đến cuối thì âm thầm dịch chuyển thẻ đầu ra sau/hoặc lật vòng lại để tạo hiệu ứng tiếp diễn vô tận (Infinite loop).

## 4. Automation Scripts

*   Thực hiện các khối render trong thẻ `<script>` ở cuối `index.html`.
*   Tương thích đồng bộ cùng hàm `switchTopikLevel(level)` (cập nhật state cho TOPIK).

## Open Questions
- Bạn muốn các thẻ được chỉnh sáng thêm là nền trắng tinh luôn hay vẫn còn giữ hiệu ứng làm mờ kính nhẹ nhưng màu nền ngả về sắc trắng đục trong trẻo tựa như pha lê?

## Verification Plan
1.  Bật thiết bị giả lập Mobile để vuốt 2-3 bảng (mỗi bảng 6 thẻ nội dung).
2.  Kiểm tra mượt mà vòng lặp ngang khi lướt tới các thẻ cuối cùng sẽ tự đẩy về bảng đầu.
3.  Bấm qua lại giữa 2 chế độ "Bộ đề" - "Dạng câu" trên tab "TOPIK 1" và "TOPIK 2" xem đường dẫn và miêu tả tương ứng của 16/18 dạng có khớp logic cấu trúc đã xuất ở bước trước không.
