import { useState, useEffect } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const STEPS = ["Brainstorm", "Mở bài", "Thân bài", "Kết bài", "Chấm điểm"];
const DRAFT_STEP_KEYS = ["mo-bai", "than-bai", "ket-bai"];

function ProgressBar({ current }) {
  return (
    <div className="flex items-center mb-8 font-sans text-sm">
      {STEPS.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border " +
                  (isDone
                    ? "bg-brush border-brush text-white"
                    : isActive
                    ? "border-brush text-brush"
                    : "border-grid text-ink-soft")
                }
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span className={isActive ? "text-ink font-medium" : "text-ink-soft"}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={"flex-1 h-px mx-2 " + (isDone ? "bg-brush" : "bg-grid")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function VocabCard({ v }) {
  return (
    <div className="rounded-sm border border-ochre/40 bg-ochre/[0.06] px-4 py-3 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-serif text-lg text-ink">{v.word}</p>
        {v.register && (
          <span className="font-sans text-[11px] text-ochre shrink-0">{v.register}</span>
        )}
      </div>
      <p className="font-sans text-sm text-ink">{v.meaning_vi}</p>
      <p className="font-sans text-xs text-ink-soft leading-relaxed">{v.why_chosen_vi}</p>
      <p className="font-serif text-sm text-brush leading-relaxed">예: {v.usage_example}</p>
    </div>
  );
}

function BrainstormStep({ prompt, guidingQuestions, onAdvance }) {
  const [answers, setAnswers] = useState(["", "", ""]);
  const [vocab, setVocab] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    const keywords = answers.map((a) => a.trim()).filter(Boolean);
    if (keywords.length === 0) {
      setError("Hãy nhập ít nhất một từ khóa (tiếng Việt hoặc tiếng Hàn).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brainstorm-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, prompt, guidingQuestions }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Tạo từ vựng thất bại");
      }
      const data = await res.json();
      setVocab(data.vocabularies || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-enter space-y-5">
      <p className="font-sans text-sm text-ink-soft">
        Nhập từ khóa (tiếng Việt hoặc tiếng Hàn) cho từng câu hỏi gợi ý để nhận từ vựng nâng cao
        phù hợp với đề bài.
      </p>
      {answers.map((val, i) => (
        <input
          key={i}
          value={val}
          onChange={(e) => {
            const next = [...answers];
            next[i] = e.target.value;
            setAnswers(next);
          }}
          placeholder={`Từ khóa cho câu hỏi ${i + 1}`}
          className="w-full border border-grid rounded-sm px-3 py-2 font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brush/40"
        />
      ))}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-brush hover:bg-brush-dark text-white font-sans text-sm px-4 py-2 rounded-sm disabled:opacity-50"
      >
        {loading ? "Đang tạo từ vựng..." : "Gợi ý từ vựng nâng cao"}
      </button>

      {error && <p className="font-sans text-sm text-error">{error}</p>}

      {vocab.length > 0 && (
        <div className="grid grid-cols-1 gap-3 pt-2">
          {vocab.map((v, i) => (
            <VocabCard key={v.word + i} v={v} />
          ))}
        </div>
      )}

      <button
        onClick={onAdvance}
        className="font-sans text-sm text-brush underline underline-offset-2"
      >
        Bắt đầu viết mở bài →
      </button>
    </div>
  );
}

function DraftingStep({ stepKey, stepLabel, prompt, guidingQuestions, onPass }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [guide, setGuide] = useState(null);
  const [guideLoading, setGuideLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setGuideLoading(true);
    setGuide(null);
    fetch("/api/writing-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: stepKey, prompt, guidingQuestions }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((b) => {
            throw new Error(b.error || "Tải hướng dẫn thất bại");
          });
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setGuide(data);
      })
      .catch((e) => {
        if (!cancelled) setGuide({ error: e.message });
      })
      .finally(() => {
        if (!cancelled) setGuideLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stepKey, prompt, guidingQuestions]);

  const handleCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/check-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepKey, studentText: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Kiểm tra thất bại");
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const renderHighlighted = () => {
    if (!result) return text;
    let parts = [text];
    result.errors.forEach(({ wrong_word }) => {
      if (!wrong_word) return;
      parts = parts.flatMap((chunk) => {
        if (typeof chunk !== "string") return [chunk];
        return chunk.split(wrong_word).flatMap((piece, i, arr) =>
          i < arr.length - 1
            ? [piece, <span key={`${wrong_word}-${i}`} className="wrong-word">{wrong_word}</span>]
            : [piece]
        );
      });
    });
    return parts;
  };

  return (
    <div className="step-enter space-y-4">
      {guideLoading && (
        <p className="font-sans text-sm text-ink-soft">Đang tải hướng dẫn {stepLabel.toLowerCase()}...</p>
      )}

      {guide && guide.error && <p className="font-sans text-sm text-error">{guide.error}</p>}

      {guide && !guide.error && (
        <div className="border border-brush/30 bg-brush/[0.04] rounded-sm p-4 space-y-3">
          <p className="font-sans text-xs uppercase tracking-wide text-brush">
            Hướng dẫn {stepLabel}
          </p>
          <p className="font-sans text-sm text-ink leading-relaxed">{guide.overview_vi}</p>
          {guide.tips && guide.tips.length > 0 && (
            <ul className="space-y-1">
              {guide.tips.map((t, i) => (
                <li key={i} className="font-sans text-sm text-ink-soft flex gap-2">
                  <span className="text-brush shrink-0">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
          {guide.model_sentence && (
            <p className="font-serif text-sm text-brush border-l-2 border-brush pl-3 leading-relaxed">
              Mẫu: {guide.model_sentence}
            </p>
          )}
          {guide.common_mistakes && guide.common_mistakes.length > 0 && (
            <p className="font-sans text-xs text-error">
              Tránh: {guide.common_mistakes.join(" · ")}
            </p>
          )}
        </div>
      )}

      <p className="font-sans text-sm text-ink-soft">
        Viết {stepLabel.toLowerCase()} của bạn (1–3 câu), dùng văn phong trang trọng
        (-는다/-다).
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="여기에 입력하세요..."
        className="w-full border border-grid rounded-sm px-3 py-2 font-serif text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-brush/40"
      />

      <button
        onClick={handleCheck}
        disabled={checking || !text.trim()}
        className="bg-brush hover:bg-brush-dark text-white font-sans text-sm px-4 py-2 rounded-sm disabled:opacity-50"
      >
        {checking ? "Đang kiểm tra..." : "Kiểm tra"}
      </button>

      {error && <p className="font-sans text-sm text-error">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="border border-grid rounded-sm p-3 font-serif text-[15px] leading-7 bg-white">
            {renderHighlighted()}
          </div>

          {result.errors.length > 0 && (
            <ul className="space-y-2">
              {result.errors.map((err, i) => (
                <li key={i} className="font-sans text-sm border-l-2 border-error pl-3">
                  <span className="font-medium text-error">{err.type}:</span>{" "}
                  {err.explanation_vi}
                  <span className="block text-ink-soft">
                    Gợi ý sửa: {err.correction}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {result.is_pass ? (
            <button
              onClick={() => onPass(result.corrected_text)}
              className="bg-success text-white font-sans text-sm px-4 py-2 rounded-sm"
            >
              Đạt — thêm vào bài viết →
            </button>
          ) : (
            <p className="font-sans text-sm text-ink-soft">
              Sửa các lỗi trên rồi bấm "Kiểm tra" lại.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GradingStep({ scores }) {
  const data = Object.entries(scores.scores).map(([key, value]) => ({
    subject: key,
    value,
    max: scores.max_scores[key],
  }));

  return (
    <div className="step-enter space-y-5">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#D9D4C6" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#425058" }} />
            <PolarRadiusAxis angle={30} tick={{ fontSize: 10 }} />
            <Radar dataKey="value" stroke="#2F5D62" fill="#2F5D62" fillOpacity={0.35} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="font-sans text-sm text-ink leading-relaxed">{scores.overall_feedback}</p>
    </div>
  );
}

const MOCK_GRADE = {
  scores: { content_relevance: 12, structure_logic: 13, vocabulary_grammar: 8, spelling_spacing: 7 },
  max_scores: { content_relevance: 15, structure_logic: 15, vocabulary_grammar: 10, spelling_spacing: 10 },
  overall_feedback: "Bài viết logic, tuy nhiên cần cải thiện độ đa dạng của từ vựng Hán-Hàn.",
};

export default function WizardStepper({ onEssayPartAdded, prompt, guidingQuestions }) {
  const [stepIndex, setStepIndex] = useState(0);

  const advanceWith = (text) => {
    if (text) onEssayPartAdded(text);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  return (
    <section className="flex-1 lg:h-screen lg:overflow-y-auto bg-white px-6 py-8 lg:px-12 lg:py-10">
      <div className="max-w-[560px] mx-auto">
        <ProgressBar current={stepIndex} />

        {stepIndex === 0 && (
          <BrainstormStep
            prompt={prompt}
            guidingQuestions={guidingQuestions}
            onAdvance={() => setStepIndex(1)}
          />
        )}
        {stepIndex >= 1 && stepIndex <= 3 && (
          <DraftingStep
            key={DRAFT_STEP_KEYS[stepIndex - 1]}
            stepKey={DRAFT_STEP_KEYS[stepIndex - 1]}
            stepLabel={STEPS[stepIndex]}
            prompt={prompt}
            guidingQuestions={guidingQuestions}
            onPass={advanceWith}
          />
        )}
        {stepIndex === 4 && <GradingStep scores={MOCK_GRADE} />}
      </div>
    </section>
  );
}
