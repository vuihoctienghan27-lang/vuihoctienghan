export default function SplitScreenLayout({ prompt, guidingQuestions, essayParts }) {
  return (
    <aside className="w-full lg:w-[42%] lg:h-screen lg:overflow-y-auto border-r border-grid bg-paper px-6 py-8 lg:px-10 lg:py-10">
      <div className="max-w-[520px] mx-auto">
        <p className="font-sans text-sm text-ink-soft mb-2">쓰기 54번 · Bài luận 54</p>
        <h1 className="font-serif text-2xl text-ink leading-snug mb-6">{prompt}</h1>

        <div className="mb-8 space-y-3">
          {guidingQuestions.map((q, i) => (
            <div key={i} className="flex gap-3 font-sans text-sm text-ink-soft">
              <span className="text-brush font-semibold">{i + 1}</span>
              <p>{q}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="font-sans text-xs uppercase tracking-wide text-ink-soft mb-3">
            Bài viết tổng thể
          </p>
          <div className="manuscript-grid rounded-sm border border-grid p-5 min-h-[320px] font-serif text-[15px] leading-[28px] text-ink whitespace-pre-wrap">
            {essayParts.length === 0 ? (
              <span className="text-ink-soft/60 font-sans text-sm">
                Đoạn văn của bạn sẽ xuất hiện ở đây sau khi vượt qua từng bước.
              </span>
            ) : (
              essayParts.join("\n\n")
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
