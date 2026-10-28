// src/harness/rubrics.js
// Simple rubric-based scoring for correctness, clarity, and effort.
export const TUTORING_RUBRIC = {
  correctness: { label: "Correctness", max: 5, description: "Is the explanation accurate and aligned with the official topic definition." },
  clarity: { label: "Clarity", max: 3, description: "Is the explanation easy to understand at secondary school level?" },
  effort: { label: "Effort", max: 2, description: "Does the explanation use worked examples, diagrams, or analogies?" },
};

export function scoreExplanation({ resultText, sourceExplanation, matchedKeywords }) {
  let correctness = 3;
  if (sourceExplanation) {
    correctness = matchedKeywords.length >= 2 ? 4 : 3;
  } else if (resultText.length > 60) {
    correctness = 2;
  }
  const clarity = resultText.includes("→") || resultText.includes("result:") ? 2 : resultText.length > 80 ? 2 : 1;
  const effort = resultText.includes("Step ") || resultText.includes("1.") ? 2 : resultText.length > 40 ? 1 : 0;
  const total = correctness + clarity + effort;
  return { correctness, clarity, effort, total: Math.min(total, 10) };
}
