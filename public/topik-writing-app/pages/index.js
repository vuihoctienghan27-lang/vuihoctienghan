import { useState } from "react";
import SplitScreenLayout from "../components/SplitScreenLayout";
import WizardStepper from "../components/WizardStepper";

const PROMPT =
  "현대 사회에서 발생하는 여러 가지 문제를 해결하기 위해서는 개인과 사회의 노력이 모두 필요하다. 이에 대해 자신의 의견을 쓰라.";

const GUIDING_QUESTIONS = [
  "현대 사회에서 흔히 발생하는 문제는 무엇인가?",
  "그 문제를 해결하기 위한 개인의 노력은 무엇인가?",
  "그 문제를 해결하기 위한 사회의 노력은 무엇인가?",
];

export default function Home() {
  const [essayParts, setEssayParts] = useState([]);

  return (
    <main className="lg:flex lg:h-screen">
      <SplitScreenLayout
        prompt={PROMPT}
        guidingQuestions={GUIDING_QUESTIONS}
        essayParts={essayParts}
      />
      <WizardStepper
        prompt={PROMPT}
        guidingQuestions={GUIDING_QUESTIONS}
        onEssayPartAdded={(text) => setEssayParts((prev) => [...prev, text])}
      />
    </main>
  );
}
