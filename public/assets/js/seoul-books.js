/* Bộ giáo trình 서울대 한국어 (Student's Book, bản cũ) — 12 cuốn 1A … 6B.
   Dùng cho kệ sách ở trang Kho giáo trình (chỉ admin thấy). Mỗi bài: no, kr (tên bài trong sách),
   vi (dịch tên bài), topic (chủ đề), points (điểm chính: ngữ pháp với sơ cấp – 3B, nội dung với 4A trở lên).
   Ảnh bìa: /assets/img/seoul/<code>.jpg. Bài trên hệ thống được ghép theo tên giáo trình "서울대 한국어 1A" + số bài. */
(function () {
    const L = (no, kr, vi, topic, points) => ({ no, kr, vi, topic, points });
    window.SEOUL_BOOKS = [
        {
            code: '1A', level: 'Sơ cấp 1', color: '#e8b400', accent: '#1f8f4e', lessons: [
                L(1, '안녕하세요?', 'Xin chào', 'Chào hỏi, giới thiệu tên, quốc tịch, nghề nghiệp', ['인사말', '은/는', 'N이에요/예요', '입니다 · 입니까', '이/가 아니다']),
                L(2, '이거는 뭐예요?', 'Cái này là gì?', 'Đồ vật quanh mình, hỏi tên đồ vật', ['N이/가 있어요/없어요', '이것/그것/저것', 'N 주세요', '하고 · 와/과']),
                L(3, '한국어를 공부해요', 'Tôi học tiếng Hàn', 'Hoạt động hằng ngày, nơi chốn', ['-아/어요', '을/를', '에서 (nơi chốn)', '안 (phủ định)']),
                L(4, '어디에 있어요?', 'Ở đâu?', 'Vị trí, phương hướng, đi đến đâu', ['여기/거기/저기', '에 있다 · 에 가다', 'N 앞/뒤/옆/위/아래/안']),
                L(5, '주말에 친구를 만났어요', 'Cuối tuần tôi đã gặp bạn', 'Ngày tháng, thứ, kể chuyện cuối tuần', ['날짜와 요일', '에 (thời gian)', '-았/었어요', '-고 (liệt kê)']),
                L(6, '얼마예요?', 'Bao nhiêu tiền?', 'Mua sắm, số đếm, đơn vị đếm', ['-(으)세요', 'N 개/병/잔/그릇', 'N이/가 A-아요/어요', '도']),
                L(7, '날씨가 어떻습니까?', 'Thời tiết thế nào?', 'Thời tiết và các mùa', ['ㅂ 불규칙', '-지만', '-ㅂ/습니다', '-고 (nối)']),
                L(8, '영화 볼까요?', 'Cùng xem phim nhé?', 'Rủ rê, hẹn gặp', ['-(으)ㄹ까요?', 'ㄷ 불규칙', '이/그/저 + N', '-네요'])
            ]
        },
        {
            code: '1B', level: 'Sơ cấp 1', color: '#f2c200', accent: '#1f8f4e', lessons: [
                L(9, '이분은 누구세요?', 'Vị này là ai?', 'Gia đình, giới thiệu người khác, kính ngữ', ['의', 'N을/를 잘하다/못하다', 'N(이)세요', '-(으)시-']),
                L(10, '지금 몇 시예요?', 'Bây giờ là mấy giờ?', 'Giờ giấc, thời gian biểu', ['시간', '부터 ~ 까지', '-아/어서 (trình tự)', '-(으)ㄹ 거예요']),
                L(11, '감기에 걸렸어요', 'Tôi bị cảm rồi', 'Sức khỏe, bệnh viện, hiệu thuốc', ['ㅡ 탈락', '-지 말다', '만', '-아/어야 하다']),
                L(12, '여보세요', 'A lô', 'Gọi điện thoại', ['-지요?', '-고 있다', '못', '-아/어서 (lý do)']),
                L(13, '서울역으로 가 주세요', 'Cho tôi đến ga Seoul', 'Giao thông, đi taxi, chỉ đường', ['-(으)려고 하다', '에서 ~ 까지', '-아/어 주다', '(으)로 (hướng · phương tiện)']),
                L(14, '이 옷을 입어 보세요', 'Hãy mặc thử bộ đồ này', 'Quần áo, mua sắm, tặng quà', ['ㄹ 탈락', '-(으)ㄴ (định ngữ tính từ)', '에게/한테/께', '-아/어 보다']),
                L(15, '여행을 가고 싶어요', 'Tôi muốn đi du lịch', 'Du lịch, kế hoạch, mong muốn', ['-(으)면', '-는 (định ngữ động từ)', '-고 싶다', '-고 싶어 하다']),
                L(16, '우리 집에 올 수 있어요?', 'Bạn đến nhà tôi được không?', 'Mời mọc, thăm nhà, hứa hẹn', ['-(으)ㄹ 수 있다/없다', '-(으)ㄹ게요', '-(으)러 가다', '-(으)면서'])
            ]
        },
        {
            code: '2A', level: 'Sơ cấp 2', color: '#7cb342', accent: '#f4c20d', lessons: [
                L(1, '처음 뵙겠습니다', 'Rất hân hạnh được gặp bạn', 'Làm quen, giới thiệu bản thân chi tiết', ['N(이)라고 하다', '-(으)려고', '-거나', '(이)나 (lựa chọn)']),
                L(2, '취미가 뭐예요?', 'Sở thích của bạn là gì?', 'Sở thích, khả năng', ['-기 · -는 것', '-(으)ㄹ 줄 알다/모르다', '-(으)ㄴ (quá khứ)', '-지 않다']),
                L(3, '콘서트에 가 봤어요?', 'Bạn đã từng đi xem hòa nhạc chưa?', 'Kinh nghiệm, văn hóa giải trí', ['-아/어 보다 (kinh nghiệm)', 'N 동안', '-(으)ㄴ/는데', '-(으)ㄹ (tương lai)']),
                L(4, '옷이 좀 큰 것 같아요', 'Hình như áo hơi rộng', 'Đổi trả, nhận xét, phỏng đoán', ['-(으)ㄴ/는 것 같다', '보다 (so sánh)', '-(으)면 좋겠다']),
                L(5, '어디에 가면 좋을까요?', 'Nên đi đâu thì hay?', 'Xin lời khuyên, địa điểm vui chơi', ['-(으)ㄹ까요? (phỏng đoán)', '-(으)니까', '-고 나서']),
                L(6, '비행기로 보내면 얼마예요?', 'Gửi đường hàng không thì bao nhiêu?', 'Bưu điện, gửi đồ', ['N(이)라서', '르 불규칙', '-(으)면 되다', '-(으)ㄴ 것 같다']),
                L(7, '한옥마을이 어디에 있는지 아세요?', 'Bạn có biết làng Hanok ở đâu không?', 'Hỏi đường, tham quan', ['-(으)ㄹ 것 같다', '-는지 알다/모르다', '-(으)려면', '-다가']),
                L(8, '정말 속상하겠어요', 'Chắc bạn buồn lắm', 'Sự cố, mất đồ, an ủi', ['-겠- (suy đoán)', '-기 때문에', '-아/어 버리다', '-(으)ㄹ 때']),
                L(9, '문의할 게 있는데요', 'Tôi có điều muốn hỏi', 'Hỏi thông tin, thủ tục', ['-(으)ㄴ/는데요', '-는 중이다', '-나요? / -(으)ㄴ가요?', 'N밖에 없다'])
            ]
        },
        {
            code: '2B', level: 'Sơ cấp 2', color: '#8bc34a', accent: '#f4c20d', lessons: [
                L(10, '뭐 먹을래?', 'Ăn gì nào?', 'Ăn uống, nói trống không (반말)', ['N 중에(서)', '반말', '-(으)ㄹ래요', '-(으)ㄴ/는데']),
                L(11, '운동을 좀 해 보는 게 어때요?', 'Thử tập thể dục xem sao?', 'Sức khỏe, khuyên nhủ, quyết định', ['ㅅ 불규칙', '마다', '-는 게 어때요?', '-기로 하다']),
                L(12, '저는 좀 조용한 편이에요', 'Tôi thuộc kiểu khá trầm tính', 'Ngoại hình, tính cách', ['-아/어 보이다', 'N처럼', '-(으)ㄴ/는 편이다', '-게']),
                L(13, '주변이 조용해서 살기 좋아요', 'Xung quanh yên tĩnh nên sống rất thích', 'Nhà ở, tìm nhà', ['-(으)ㄹ지 모르겠다', '-기는 하지만', '-기(가) + tính từ']),
                L(14, '여기서 사진을 찍어도 돼요?', 'Chụp ảnh ở đây có được không?', 'Quy tắc nơi công cộng, xin phép', ['-(으)ㄴ 적이 있다', '-았/었을 때', '-아/어도 되다', '-(으)면 안 되다']),
                L(15, '한국 생활에 익숙해졌어요', 'Tôi đã quen với cuộc sống ở Hàn', 'Thay đổi, thích nghi', ['-아/어지다', '-게 되다', '-기 전에', '-(으)ㄴ 후에']),
                L(16, '설날에는 밥 대신 떡국을 먹어요', 'Ngày Tết ăn canh bánh gạo thay cơm', 'Ngày lễ, phong tục Hàn Quốc', ['-아/어 놓다', '-(으)ㄴ/는 대신에', '-(으)ㄹ까 하다', '-(으)ㄹ 테니까']),
                L(17, '비행기를 놓칠 뻔했어요', 'Suýt nữa thì lỡ chuyến bay', 'Sự cố khi đi lại, thất lạc đồ', ['-아다/어다 주다', '-(으)ㄹ 뻔하다', 'ㅎ 불규칙', '-아/어 있다']),
                L(18, '한국에 온 지 벌써 6개월이 되었어요', 'Tôi đến Hàn đã được 6 tháng rồi', 'Nhìn lại, kỷ niệm, văn viết', ['-(으)ㄴ 지', '(이)나 (nhấn mạnh)', '-다 / -ㄴ/는다 (thể văn viết)'])
            ]
        },
        {
            code: '3A', level: 'Trung cấp 3', color: '#f39c12', accent: '#1e88e5', lessons: [
                L(1, '신입생 환영회를 한다고 해요', 'Nghe nói sẽ có tiệc chào tân sinh viên', 'Đời sống đại học, truyền đạt tin tức', ['Câu gián tiếp -다고 하다', '-(느)ㄴ다고 하다 / -(이)라고 하다']),
                L(2, '방을 바꿔 달라고 해 봐', 'Thử nhờ họ đổi phòng cho đi', 'Ký túc xá, nhờ vả, phàn nàn', ['Gián tiếp mệnh lệnh -(으)라고 하다', '-아/어 달라고 하다 · -자고 하다']),
                L(3, '비가 이렇게 많이 올 줄 몰랐어요', 'Không ngờ mưa nhiều thế này', 'Thời tiết, khí hậu, điều bất ngờ', ['-(으)ㄹ 줄 몰랐다/알았다']),
                L(4, '먹어 보니까 맛있던데요', 'Ăn thử thì thấy ngon lắm', 'Ẩm thực, kể lại trải nghiệm', ['-(으)니까 (phát hiện)', '-던데요 · -더라고요']),
                L(5, '입어 보고 살걸 그랬어요', 'Đáng lẽ nên mặc thử rồi mới mua', 'Mua sắm, hối tiếc, đổi trả', ['-(으)ㄹ걸 그랬다']),
                L(6, '일요일에는 아무 약속도 없어요', 'Chủ nhật tôi không có hẹn gì cả', 'Thời gian rảnh, lịch hẹn', ['아무 N도 · 아무 N(이)나']),
                L(7, '껐다가 다시 켜 보세요', 'Thử tắt đi rồi bật lại xem', 'Đồ điện tử, sự cố, sửa chữa', ['-았/었다가']),
                L(8, '교통사고가 났다고요?', 'Bạn nói là bị tai nạn giao thông à?', 'Tai nạn, sự cố, xác nhận lại lời nói', ['-다고요? (hỏi lại / nhấn mạnh)']),
                L(9, '한글날에 대해 들어 봤어요?', 'Bạn đã nghe về ngày Hangeul chưa?', 'Chữ Hàn, ngày lễ, văn hóa', ['N에 대해(서)', 'Giới thiệu, thuyết minh'])
            ]
        },
        {
            code: '3B', level: 'Trung cấp 3', color: '#f5a623', accent: '#1e88e5', lessons: [
                L(10, '결혼하려면 아직 멀었어요', 'Còn lâu tôi mới kết hôn', 'Hẹn hò, tình yêu và hôn nhân', ['-(으)려면 멀었다', '-던 (hồi tưởng)', '-잖아(요)']),
                L(11, '언제든지 일할 수 있어요', 'Lúc nào tôi cũng làm được', 'Việc làm thêm, phỏng vấn xin việc', ['-든지 · 언제든지/무엇이든지']),
                L(12, '운동을 했더니 몸이 좋아졌어요', 'Tập thể dục nên cơ thể khỏe lên', 'Sức khỏe, thói quen, kết quả', ['-았/었더니']),
                L(13, '지금 입고 있는 양복이 잘 어울려요', 'Bộ vest bạn đang mặc rất hợp', 'Thời trang, trang phục', ['-고 있다 (trạng thái mặc)', 'Động từ mặc/đội/đeo']),
                L(14, '나이가 들면 들수록 고향이 그리워져요', 'Càng lớn tuổi càng nhớ quê', 'Quê hương, nỗi nhớ, thay đổi theo thời gian', ['-(으)면 -(으)ㄹ수록', '-아/어지다']),
                L(15, '전기를 아껴 쓰지 않으면 안 돼요', 'Phải tiết kiệm điện', 'Môi trường, tiết kiệm năng lượng', ['-지 않으면 안 되다']),
                L(16, '가야금이 사람 키만 해요', 'Đàn gayageum cao bằng người', 'Âm nhạc, nhạc cụ truyền thống', ['N만 하다 (so sánh kích thước)']),
                L(17, '두 사람이 연인 사이라니요?', 'Hai người đó là người yêu ư?', 'Tin đồn, quan hệ, bất ngờ', ['-(이)라니요? · -다니요?']),
                L(18, '거울이 깨지고 말았어요', 'Cái gương bị vỡ mất rồi', 'Mê tín, điềm báo, kết cục ngoài ý muốn', ['-고 말다'])
            ]
        },
        {
            code: '4A', level: 'Trung cấp 4', color: '#1e88e5', accent: '#f39c12', lessons: [
                L(1, '적성과 진로', 'Năng khiếu và con đường sự nghiệp', 'Nghề nghiệp, định hướng tương lai', ['Năng lực và sở trường', 'Chọn ngành, chọn nghề']),
                L(2, '건강한 삶', 'Cuộc sống khỏe mạnh', 'Sức khỏe, lối sống', ['Bệnh tật và triệu chứng', 'Thói quen tốt cho sức khỏe']),
                L(3, '스포츠의 세계', 'Thế giới thể thao', 'Thể thao, thi đấu', ['Các môn thể thao', 'Bình luận, cổ vũ trận đấu']),
                L(4, '남자와 여자', 'Đàn ông và phụ nữ', 'Giới tính, khác biệt nam – nữ', ['Định kiến giới', 'Thay đổi vai trò trong xã hội']),
                L(5, '속담과 관용어', 'Tục ngữ và thành ngữ', 'Tục ngữ, quán dụng ngữ tiếng Hàn', ['Tục ngữ thông dụng', 'Thành ngữ chỉ bộ phận cơ thể']),
                L(6, '공연과 축제', 'Biểu diễn và lễ hội', 'Văn hóa nghệ thuật, lễ hội', ['Các loại hình biểu diễn', 'Lễ hội ở Hàn Quốc']),
                L(7, '옳고 그름', 'Đúng và sai', 'Đạo đức, phán đoán đúng sai', ['Phép lịch sự, quy tắc xã hội', 'Bày tỏ ý kiến tán thành – phản đối']),
                L(8, '흥미로운 세상', 'Thế giới thú vị', 'Chuyện lạ, điều thú vị quanh ta', ['Kỷ lục, chuyện kỳ lạ', 'Truyền đạt thông tin nghe được']),
                L(9, '한국의 대중문화', 'Văn hóa đại chúng Hàn Quốc', 'Hallyu, phim, nhạc, giải trí', ['K-pop, phim truyền hình', 'Làn sóng Hàn Quốc'])
            ]
        },
        {
            code: '4B', level: 'Trung cấp 4', color: '#2196f3', accent: '#f39c12', lessons: [
                L(10, '옛날이야기와 신화', 'Truyện cổ và thần thoại', 'Truyện dân gian, thần thoại Hàn Quốc', ['Thần thoại Dangun', 'Kể lại câu chuyện']),
                L(11, '언어와 생활', 'Ngôn ngữ và đời sống', 'Ngôn ngữ, cách nói, giao tiếp', ['Kính ngữ, xưng hô', 'Ngôn ngữ của giới trẻ']),
                L(12, '소중한 환경', 'Môi trường quý giá', 'Môi trường, bảo vệ thiên nhiên', ['Ô nhiễm môi trường', 'Giải pháp bảo vệ môi trường']),
                L(13, '여행의 즐거움', 'Niềm vui du lịch', 'Du lịch, trải nghiệm', ['Kiểu du lịch', 'Giới thiệu điểm đến']),
                L(14, '숫자의 세계', 'Thế giới những con số', 'Con số trong đời sống, thống kê', ['Ý nghĩa con số trong văn hóa', 'Đọc biểu đồ, số liệu']),
                L(15, '동물과 식물', 'Động vật và thực vật', 'Thiên nhiên, sinh vật', ['Đặc điểm động – thực vật', 'Con người và thiên nhiên']),
                L(16, '과학의 신비', 'Bí ẩn của khoa học', 'Khoa học, phát minh', ['Phát minh, công nghệ', 'Giải thích hiện tượng']),
                L(17, '만남과 헤어짐', 'Gặp gỡ và chia ly', 'Quan hệ con người, tình cảm', ['Duyên gặp gỡ', 'Chia tay, tạm biệt']),
                L(18, '흥부와 놀부', 'Heungbu và Nolbu', 'Truyện cổ tích nổi tiếng', ['Đọc truyện cổ tích', 'Bài học thiện – ác'])
            ]
        },
        {
            code: '5A', level: 'Cao cấp 5', color: '#139c8a', accent: '#8e44ad', lessons: [
                L('Ⅰ', '외모와 성격', 'Ngoại hình và tính cách', 'Miêu tả người', ['갸름한 얼굴에 긴 생머리', 'A형 성격과 B형 성격', '만나고 싶은 사람']),
                L('Ⅱ', '사랑하는 마음', 'Tấm lòng yêu thương', 'Tình yêu, lòng nhân ái', ['사랑의 손길', '사랑이란']),
                L('Ⅲ', '가정과 사회', 'Gia đình và xã hội', 'Gia đình thời hiện đại', ['변화하는 가족', '행복한 가정을 위해', '듣고 싶은 말']),
                L('Ⅳ', '직업과 직장', 'Nghề nghiệp và nơi làm việc', 'Việc làm, chuẩn bị đi làm', ['일하는 사람들', '취업 준비']),
                L('Ⅴ', '가르침과 배움', 'Dạy và học', 'Giáo dục, bí quyết học tập', ['학교 이야기', '한석봉의 어머니', '공부 잘하는 비결']),
                L('Ⅵ', '한국 탐구', 'Khám phá Hàn Quốc', 'Người Hàn và nét đẹp Hàn Quốc', ['한국인 이해하기', '한국의 멋'])
            ]
        },
        {
            code: '5B', level: 'Cao cấp 5', color: '#16a596', accent: '#8e44ad', lessons: [
                L('Ⅶ', '대중문화', 'Văn hóa đại chúng', 'Tin tức, điện ảnh, quảng cáo', ['뉴스 따라잡기', '영화 속을 걷다', '광고와 소비자']),
                L('Ⅷ', '의식주와 생활', 'Ăn – mặc – ở và đời sống', 'Nhà ở, ẩm thực, thời trang', ['살고 싶은 집', '음식 여행, 비빔밥', '유행하는 옷']),
                L('Ⅸ', '도시와 환경', 'Đô thị và môi trường', 'Thành phố đáng sống, Seoul', ['살기 좋은 도시', '서울 돌아보기']),
                L('Ⅹ', '관념의 세계', 'Thế giới quan niệm', 'Nhân sinh quan, số phận', ['삶과 운명', '세상을 보는 눈']),
                L('Ⅺ', '역사의 발자취', 'Dấu chân lịch sử', 'Lịch sử Hàn Quốc, nhân vật', ['한강에 얽힌 역사', '이야기 속 인물', '여행으로 만나는 세상']),
                L('Ⅻ', '과학과 미래', 'Khoa học và tương lai', 'Công nghệ, đạo đức khoa học', ['과학 기술과 윤리', '생활 속의 발명품']),
                L('ⅩⅢ', '문학의 향기', 'Hương sắc văn chương', 'Đọc tác phẩm văn học', ['옥상의 민들레꽃', '내가 사랑하는 사람'])
            ]
        },
        {
            code: '6A', level: 'Cao cấp 6', color: '#7b3f8c', accent: '#16a596', lessons: [
                L('Ⅰ', '개인과 사회생활', 'Cá nhân và đời sống xã hội', 'Hình mẫu nhân tài, lợi ích chung', ['바람직한 인재상', '공익과 사생활']),
                L('Ⅱ', '사랑과 추억', 'Tình yêu và kỷ niệm', 'Kỷ niệm, truyện ngắn "Mưa rào"', ['잊지 못할 순간', '소나기']),
                L('Ⅲ', '경제와 생활', 'Kinh tế và đời sống', 'Vật giá, thương mại', ['물가 이야기', '경제와 무역']),
                L('Ⅳ', '건강한 삶', 'Cuộc sống khỏe mạnh', 'Thể chất, sức khỏe tinh thần', ['음식과 체질', '건강과 마음']),
                L('Ⅴ', '성공과 실패', 'Thành công và thất bại', 'Thử thách, vượt khó', ['새로운 시도', '흔들리며 피는 꽃']),
                L('Ⅵ', '생활과 예술', 'Đời sống và nghệ thuật', 'Nghệ thuật, kiến trúc', ['생활 속의 예술', '건축물의 미학']),
                L('Ⅶ', '사상과 이데올로기', 'Tư tưởng và hệ tư tưởng', 'Nho giáo, ý thức hệ', ['한국인과 유교 사상', '한국인과 이데올로기'])
            ]
        },
        {
            code: '6B', level: 'Cao cấp 6', color: '#8e4a9e', accent: '#16a596', lessons: [
                L('Ⅷ', '사고방식과 문화', 'Lối tư duy và văn hóa', 'Khác biệt văn hóa, phân biệt đối xử', ['문화 차이', '차이와 차별']),
                L('Ⅸ', '인간과 심리', 'Con người và tâm lý', 'Tâm lý học trong đời sống', ['학습과 심리', '사람의 심리']),
                L('Ⅹ', '한국과 세계', 'Hàn Quốc và thế giới', 'Toàn cầu hóa', ['한국 속의 세계', '세계 속의 한국']),
                L('Ⅺ', '대중 매체와 문화', 'Truyền thông đại chúng và văn hóa', 'Tự do ngôn luận, văn hóa đại chúng', ['표현의 자유와 공공성', '대중문화의 위상']),
                L('Ⅻ', '과학과 생활', 'Khoa học và đời sống', 'Năng lượng thay thế, khoa học thường ngày', ['환경과 대체 에너지', '생활 속 과학 이야기']),
                L('ⅩⅢ', '한국 사회와 문제', 'Xã hội Hàn Quốc và các vấn đề', 'Giáo dục đại học, dân số', ['대학 교육의 정체성', '인구와 사회 문제']),
                L('ⅩⅣ', '한국의 정치와 경제', 'Chính trị và kinh tế Hàn Quốc', 'Dân chủ hóa, tăng trưởng kinh tế', ['한국의 정치와 민주화', '한국의 경제와 성장 과정']),
                L('ⅩⅤ', '지형과 방언', 'Địa hình và phương ngữ', 'Địa lý, tiếng địa phương', ['지형과 사회', '다양한 한국어의 모습'])
            ]
        }
    ];
})();
