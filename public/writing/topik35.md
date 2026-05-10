
# TOPIK Ⅱ 쓰기 (제35회)

***

## 📌 CÂU 51 & 52 (ĐIỀN VÀO CHỖ TRỐNG - CÓ CHẤM ĐIỂM)

**[NOTE CHO AI LẬP TRÌNH UI/UX - CÂU 51 & 52]**
> * **Giao diện đề bài:** Đặt trong một khung viền (border) để làm nổi bật. Có 2 ô `<textarea>` dành cho ㉠ và ㉡.
> * **Luồng xử lý (Workflow):**
>   1. User nhập đáp án -> Ấn nút **"Nộp bài & Chấm điểm"**.
>   2. Hệ thống chạy thuật toán chấm điểm (gợi ý: kiểm tra Keyword và Đuôi câu ngữ pháp). In ra thông báo điểm số cho từng ô (Ví dụ: *Bạn đạt 5/5 điểm* hoặc *Bạn thiếu từ khóa X*).
>   3. Sau khi hiện kết quả chấm điểm, MỚI HIỂN THỊ nút **"Xem giải thích chi tiết"**.
>   4. Ấn nút "Xem giải thích chi tiết" -> Mở rộng (Expand) khối `div` chứa bản dịch và phân tích.

### 📝 [NỘI DUNG HIỂN THỊ - CÂU 51]

**무료로 드립니다**
저는 유학생인데 공부를 마치고 다음 주에 고향으로 돌아갑니다. 그래서 지금 **( ㉠ )**. 책상, 의자, 컴퓨터, 경영학 전공 책 등이 있습니다.
이번 주 금요일까지 방을 비워 줘야 합니다. **( ㉡ )**. 제 전화 번호는 010-1234-5678입니다.

**[DỮ LIỆU ĐỂ LẬP TRÌNH CHẤM ĐIỂM & GIẢI THÍCH CÂU 51]**
* **▶ Vị trí ㉠ (5 điểm):**
  * *Keyword bắt buộc:* `정리하다` (dọn dẹp) hoặc `주다 / 드리다` (cho/tặng) + `물건` (đồ đạc).
  * *Ngữ pháp bắt buộc:* `-(으)려고 하다` hoặc `-고 있다`.
  * *Đáp án mẫu (NIIED):* 그동안 사용했던 제 물건들을 정리하려고 합니다.
* **▶ Vị trí ㉡ (5 điểm):**
  * *Keyword bắt buộc:* `연락하다` (liên lạc) + `금요일` (thứ Sáu).
  * *Ngữ pháp bắt buộc:* `-기 바랍니다` hoặc `-(으)면 좋겠습니다`.
  * *Đáp án mẫu (NIIED):* 그러니까 물건이 필요하신 분들은 금요일 전까지 연락해 주시기 바랍니다.

---

### 📝 [NỘI DUNG HIỂN THỊ - CÂU 52]

퍼즐은 여러 개의 조각을 모두 제 위치에 놓아야 하나의 그림이 완성된다. 그런데 만일 **( ㉠ )**. 사회와 개인의 관계도 마찬가지이다. 사회를 구성하는 모든 개인도 있어야 할 자리에 있어야 한다. 그래야 **( ㉡ )**.

**[DỮ LIỆU ĐỂ LẬP TRÌNH CHẤM ĐIỂM & GIẢI THÍCH CÂU 52]**
* **▶ Vị trí ㉠ (5 điểm):**
  * *Keyword bắt buộc:* `제 위치 / 제 자리` (đúng vị trí) + `놓이다 / 없다` (được đặt / không có) + `완성되지 않는다 / 못한다` (không được hoàn thành).
  * *Đáp án mẫu (NIIED):* 퍼즐 조각이 제 자리에 놓이지 않으면 그림은 완성되지 않는다.
* **▶ Vị trí ㉡ (5 điểm):**
  * *Keyword bắt buộc:* `사회` (xã hội) + `돌아가다 / 유지되다 / 완성되다` (vận hành / duy trì / hoàn thành).
  * *Đáp án mẫu (NIIED):* 비로소 사회가 하나로 돌아가기 때문이다.

***

## 📌 CÂU 53 (BIỂU ĐỒ - GIAO DIỆN SÁCH TƯƠNG TÁC)

**[NOTE CHO AI LẬP TRÌNH UI/UX - CÂU 53]**
> * **Giao diện Biểu đồ:** Dùng CSS vẽ 2 Donut Chart theo dữ liệu (30대: 공연장 40%, 병원 28%, 공원 22%, 기타 10% | 60대: 병원 50%, 공연장 23%, 공원 22%, 기타 5%).
> * **Giao diện Sách tương tác (The Book UI):**
>   * Thiết kế 1 box giống cuốn sách mở ra. 
>   * **Trang trái:** Hiển thị câu tiếng Việt.
>   * **Trang phải:** Hiển thị câu tiếng Hàn tương ứng (Chế độ Học) HOẶC Ô Textarea nhập liệu (Chế độ Kiểm tra).
>   * **Thanh điều hướng dưới đáy:** Nút `< Lùi>`, Nút `Tiến >`, và Nút `Đổi chế độ (Học / Kiểm tra)`.
> * **Luồng tính năng "Kiểm tra":**
>   1. User ấn "Kiểm tra" -> Chữ tiếng Hàn ở trang phải biến mất, thay bằng `<textarea>`.
>   2. User nhập đáp án -> Ấn "Chấm điểm".
>   3. JS chạy thuật toán Diff (So sánh chuỗi). Textarea biến mất. Hiện lại đáp án của User nhưng được bôi màu: **Chữ đúng bôi Xanh lá**, **Chữ sai/thiếu bôi Đỏ gạch ngang**.
>   4. Hiển thị Đáp án Mẫu chuẩn ngay bên dưới để đối chiếu.

**[DỮ LIỆU ARRAY ĐỂ ĐỔ VÀO GIAO DIỆN SÁCH CÂU 53]**
* **Câu 1:** * *VI:* Đã tiến hành khảo sát về 'Cơ sở vật chất công cộng được cho là cần thiết' đối với đối tượng là 500 nam nữ trưởng thành ở độ tuổi 30 và 60.
  * *KO:* 30대와 60대 성인 남녀를 대상으로 필요하다고 생각하는 공공시설에 대한 설문조사를 실시하였다.
* **Câu 2:**
  * *VI:* Kết quả điều tra cho thấy, ở độ tuổi 30 thì nhà hát - trung tâm văn hóa xuất hiện cao nhất với 40%, và bám sát ngay sau đó là bệnh viện - nhà thuốc với 28%.
  * *KO:* 조사 결과 30대의 경우 공연장 문화센터가 40%로 가장 높게 나타났으며 병원 약국이 28%로 그 뒤를 이었다.
* **Câu 3:**
  * *VI:* Trái lại, ở độ tuổi 60 thì bệnh viện - nhà thuốc lại xuất hiện cao nhất chiếm mức một nửa tổng thể là 50%, và nhà hát - trung tâm văn hóa được điều tra ở mức 23%.
  * *KO:* 반면에 60대는 병원 약국이 전체의 절반 수준인 50%로 가장 높게 나타났으며 공연장 문화센터가 23%로 조사되었다.
* **Câu 4:**
  * *VI:* Quan điểm về tính cần thiết của cơ sở công viên xuất hiện đồng nhất ở cả độ tuổi 30 và 60 với 22%.
  * *KO:* 공원 시설의 필요성에 대한 견해는 30대와 60대가 22%로 동일하게 나타났다.
* **Câu 5:**
  * *VI:* Thông qua kết quả khảo sát trên, ta có thể biết được sự thật rằng nhu cầu đối với các cơ sở công cộng có quan hệ trực tiếp với độ tuổi của bản thân là tương đối lớn.
  * *KO:* 이상의 설문 조사 결과를 통해 자신의 나이와 직접적으로 관계가 있는 공공시설에 대한 요구가 상대적으로 크다는 사실을 알 수 있다.

***

## 📌 CÂU 54 (NGHỊ LUẬN - 3 TABS CHI TIẾT)

**[NOTE CHO AI LẬP TRÌNH UI/UX - CÂU 54]**
> * **Giao diện:** Hiển thị đề bài trong một Box. Bên dưới tạo 3 Tab: **[Mở bài (서론)]**, **[Thân bài (본론)]**, **[Kết bài (결론)]**. Dùng JS để chuyển đổi nội dung giữa các tab.
> * **Nội dung Tab:** Mỗi tab phải trình bày rõ ràng 3 phần: (1) Đề bài yêu cầu gì?, (2) Cách tư duy lập luận chi tiết, (3) Bảng đối chiếu đoạn văn mẫu Hàn-Việt.

**[NỘI DUNG HIỂN THỊ ĐỀ BÀI CÂU 54]**
사람들은 다양한 경제 수준의 삶을 살고 있으며 그러한 삶에 대해 느끼는 각자의 만족도도 다양하다. 그러나 경제적 여유와 행복 만족도가 꼭 비례한다고는 할 수 없다. 경제적 여유가 행복에 미치는 영향에 대해 아래의 내용을 중심으로 자신의 생각을 쓰십시오.
* 사람들이 생각하는 행복한 삶이란 무엇인가? 
* 경제적 조건과 행복 만족도의 관계는 어떠한가?
* 행복 만족도를 높이기 위해 어떠한 노력이 필요한가?

---

### 🔘 DỮ LIỆU TAB 1: MỞ BÀI (서론)

**1. Trọng tâm câu hỏi:** 사람들이 생각하는 행복한 삶이란 무엇인가? (Một cuộc sống hạnh phúc theo suy nghĩ của con người là gì?)

**2. Hướng dẫn tư duy & Cách viết:**
* **Bước 1 (Nêu hiện trạng):** Hãy bắt đầu bằng cách nêu lên một định kiến phổ biến của xã hội: "Đại đa số mọi người đều cho rằng có nhiều tiền thì sẽ hạnh phúc". (일반적으로... 생각한다).
* **Bước 2 (Phản bác):** Lập tức dùng liên từ tương phản (그러나 / 하지만) để lật lại vấn đề: "Nhưng sự thật không hoàn toàn như vậy".
* **Bước 3 (Đưa dẫn chứng & Chốt luận điểm):** Lấy ví dụ về những chủ tịch tập đoàn hay người giàu có chưa chắc đã hạnh phúc để chứng minh. Từ đó chốt lại câu chủ đề của bài: **Sự dư dả kinh tế không tự động sinh ra sự ổn định và thỏa mãn về tinh thần.**

**3. Bài mẫu tham khảo (Hàn - Việt):**
* **KO:** 일반적으로 사람들은 경제적으로 여유가 있으면 다른 사람들보다 더 행복할 것이라고 생각한다. 그러나 반드시 그러한 것은 아니다. 굴지의 기업 총수라고 해서 특별히 더 행복해 보이지 않는 것만 보더라도 그 사실을 잘 알 수 있다. 경제적 여유가 정신적 안정과 만족을 가져오는 것은 아니다.
* **VI:** Thông thường, mọi người hay nghĩ rằng nếu có sự dư dả về kinh tế thì họ sẽ sống hạnh phúc hơn người khác. Thế nhưng sự thật không hẳn lúc nào cũng như vậy. Chỉ cần nhìn vào thực tế rằng những vị chủ tịch tập đoàn hàng đầu thế giới trông cũng chẳng có vẻ gì là đặc biệt hạnh phúc hơn người thường, là ta đã nhận ra được rõ sự thật đó. Sự dư dả về mặt kinh tế không mang lại sự ổn định và thỏa mãn về mặt tinh thần.

---

### 🔘 DỮ LIỆU TAB 2: THÂN BÀI (본론)

**1. Trọng tâm câu hỏi:** 경제적 조건과 행복 만족도의 관계는 어떠한가? (Mối quan hệ giữa điều kiện kinh tế và mức độ thỏa mãn hạnh phúc là như thế nào?)

**2. Hướng dẫn tư duy & Cách viết:**
* **Bước 1 (Công nhận vai trò của tiền):** Không được phủ nhận hoàn toàn tiền bạc. Hãy thừa nhận rằng tiền là điều kiện BẮT BUỘC để duy trì các nhu cầu thiết yếu (의식주 - ăn, mặc, ở). Ở giai đoạn này, tiền và hạnh phúc tỷ lệ thuận với nhau (비례 관계).
* **Bước 2 (Chuyển ý nâng cao):** Nêu giả định khi con người ĐÃ THOÁT KHỎI nỗi lo cơm áo gạo tiền cơ bản. Lúc này, vấn đề nằm ở chỗ ta xử lý phần tiền "thặng dư" (잉여) đó như thế nào.
* **Bước 3 (Chốt bản chất của hạnh phúc):** Dùng phép đối chiếu: Một nghệ sĩ đói bụng khó mà hạnh phúc, nhưng một kẻ trọc phú chỉ có cái bụng no cũng chẳng vui vẻ gì. Qua đó chốt lại: **Mối quan hệ giữa tiền và hạnh phúc không phải là đường thẳng. Hạnh phúc thực sự sinh ra từ một cuộc sống an nhàn và khả năng tự thỏa mãn.**

**3. Bài mẫu tham khảo (Hàn - Việt):**
* **KO:** 물론 행복해지려면 어느 정도의 경제적인 조건은 요구된다. 사람에게 필수적인 의식주가 해결되지 않은 상황에서는 행복의 크기가 경제력과 비례 관계에 있다고 볼 수도 있다. 그러나 의식주가 문제가 되지 않는 요즈음, '먹고 살 걱정'에서 놓여난 다음 잉여의 경제력을 어떻게 처리하느냐의 문제를 두고 고민할 필요가 있다. 배고픈 예술가가 행복할 것이라고 여기는 사람은 별로 없을 것이다. 그렇다고 해서 배만 부른 부자가 되기를 원하는 사람도 별로 없다. 결국 행복이란 안락한 생활과 스스로 만족하는 삶에서 느낄 수 있는 것이다.
* **VI:** Dĩ nhiên, để trở nên hạnh phúc thì vẫn luôn đòi hỏi phải có một mức độ điều kiện kinh tế nhất định. Trong hoàn cảnh mà những nhu cầu thiết yếu nhất (ăn mặc ở) chưa được giải quyết, thì ta có thể xem kích thước của hạnh phúc tỷ lệ thuận với sức mạnh tài chính. Thế nhưng trong thời đại ngày nay, khi chuyện ăn mặc không còn là một vấn đề quá to tát, thì sau khi thoát khỏi nỗi lo 'cơm áo gạo tiền', chúng ta cần phải suy ngẫm về bài toán xử lý lượng kinh tế dư thừa đó ra sao. Sẽ hiếm có ai cho rằng một người nghệ sĩ ôm cái bụng đói meo là hạnh phúc. Nhưng ngược lại, cũng chẳng có mấy ai mong muốn mình trở thành một kẻ trọc phú chỉ được mỗi cái bụng no. Rốt cuộc, hạnh phúc thực sự là thứ ta chỉ có thể cảm nhận được qua một cuộc sống an nhàn và thái độ tự thỏa mãn.

---

### 🔘 DỮ LIỆU TAB 3: KẾT BÀI (결론)

**1. Trọng tâm câu hỏi:** 행복 만족도를 높이기 위해 어떠한 노력이 필요한가? (Cần có những nỗ lực nào để nâng cao mức độ thỏa mãn hạnh phúc?)

**2. Hướng dẫn tư duy & Cách viết:**
* **Bước 1 (Giải pháp cá nhân hóa):** Nhấn mạnh vào chữ "Tự bản thân" (스스로). Con người phải nỗ lực tự tạo ra môi trường làm mình thấy vui. Phải hiểu rõ bản thân mình hạnh phúc KHI NÀO, VỚI AI, LÀM GÌ.
* **Bước 2 (Giải pháp về cách dùng tiền/thời gian):** Khi đã có sự "dư dả" (여유), phải biết dừng lại suy nghĩ xem nên đầu tư sự dư dả đó vào những trải nghiệm nào để tối đa hóa niềm vui.
* **Bước 3 (Lời khuyên đạo đức - Chốt bài):** Đưa ra một ranh giới bảo vệ: Việc nỗ lực tìm kiếm và tận hưởng hạnh phúc của bản thân tuyệt đối không được làm tổn hại hay cản trở đến hạnh phúc của người khác.

**3. Bài mẫu tham khảo (Hàn - Việt):**
* **KO:** 행복해지기 위해서는 우리 자신이 스스로 행복하다고 느낄 수 있는 환경에서 생활하는 것이 중요하므로 그런 상황을 자주 만들려고 노력하는 자세가 필요하다. 언제 행복한지, 누구와 있을 때 행복한지 그리고 무슨 일에서 행복함을 느끼는지를 잘 알게 된다면 그것이 그리 어려운 일은 아닐 것이다. 다시 말해서 약간의 '여유'가 생긴다면 그 여유를 언제, 누구와, 무엇을 하면서 쓸 것인가에 대해 가끔씩은 생각하면서 사는 것이 중요하다. 물론 그 여유를 누리는 것이 다른 사람의 행복을 방해하지는 않아야 할 것이다.
* **VI:** Để trở nên hạnh phúc, việc được sống trong một môi trường mà bản thân ta tự cảm thấy hạnh phúc là điều vô cùng quan trọng; do đó, ta cần trang bị một thái độ luôn nỗ lực kiến tạo ra những hoàn cảnh như vậy. Nếu thấu hiểu bản thân hạnh phúc khi nào, vui vẻ khi ở bên cạnh ai, và làm công việc gì thì mang lại niềm vui, thì việc kiến tạo ra hạnh phúc chẳng phải bài toán khó. Nói cách khác, nếu tạo ra được một chút sự 'dư dả', thì điều quan trọng là đôi khi phải biết sống chậm lại và suy nghĩ xem sẽ dùng sự dư dả đó vào lúc nào, với ai và để làm gì. Tất nhiên, việc tận hưởng sự dư dả đó tuyệt đối không được phép biến thành hành động cản bước hạnh phúc của người khác.