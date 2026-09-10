// video-lessons.js — Cơ sở dữ liệu bài học video (shadowing & dictation)
// Mỗi bài học được định danh bằng ID duy nhất
window.VideoLessons = [
    {
        id: "bai-1",
        videoId: "dQw4w9WgXcQ",
        title: "Bài 1: Chào hỏi & Giới thiệu",
        subtitle: "인사와 자기소개 — Hội thoại gặp gỡ lần đầu",
        duration: "00:25",
        lineCount: 8,
        subtitles: [
            { start: 0.0, end: 3.5,  ko: "안녕하세요",           vi: "Xin chào" },
            { start: 3.8, end: 7.0,  ko: "처음 뵙겠습니다",     vi: "Rất vui được gặp bạn" },
            { start: 7.3, end: 11.0, ko: "저는 민수입니다",     vi: "Tôi là Minsu" },
            { start: 11.3, end: 14.5, ko: "한국에서 왔습니다",   vi: "Tôi đến từ Hàn Quốc" },
            { start: 14.8, end: 18.5, ko: "지금 서울에 살고 있습니다",  vi: "Hiện đang sống ở Seoul" },
            { start: 18.8, end: 22.0, ko: "한국어를 공부하고 있습니다",  vi: "Tôi đang học tiếng Hàn" },
            { start: 22.3, end: 27.0, ko: "만나서 반갑습니다",   vi: "Rất vui được gặp bạn" },
            { start: 27.3, end: 32.0, ko: "앞으로 잘 부탁드립니다", vi: "Mong được giúp đỡ từ nay về sau" }
        ]
    }
    // Thêm bài mới ở đây theo format:
    // ,{
    //     id: "bai-2",
    //     videoId: "YOUTUBE_ID",
    //     title: "Bài 2: ...",
    //     subtitle: "Mô tả",
    //     duration: "MM:SS",
    //     lineCount: N,
    //     subtitles: [{ start, end, ko, vi }, ...]
    // }
];
