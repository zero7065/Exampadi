// src/harness/guardrails.js
// Exam integrity: strict guardrails the AI Tutor must follow — never reveal
// answers to upcoming CBT questions; only coach reasoning on past/practice items.
// Returns an object: { ok: boolean, reason?: string }.
export function checkAnswerAllowed({ kind, questionId, source, mode = "practice" }) {
  // CBT/timed-mode live questions are forbidden.
  if (kind === "live-cbt" || mode === "live-cbt") {
    return { ok: false, reason: "I can't answer live CBT questions — that's exam malpractice." };
  }
  // Official jamb past questions with answer keys already released are OK for practice.
  if (source === "past-question") {
    return { ok: true, reason: "past question allowed" };
  }
  // Everything else in practice mode is fine.
  if (mode === "practice") {
    return { ok: true, reason: "practice question allowed" };
  }
  return { ok: false, reason: "Only practice/past-question coaching is allowed." };
}

export const PROMPT_GUARDRAILS = [
  "Never reveal the correct option letter for a live/cbt question.",
  "Never tell the student which option to click.",
  "Do not output raw exam item bank questions unless they are published past questions.",
  "Coach the *reasoning* and the method, not the final answer for timed items.",
  "If a question looks like a live exam item, refuse coaching and redirect to past-question practice.",
];

export function applyPromptGuardrails(systemPrompt, kind) {
  const added = kind === "live-cbt" ? PROMPT_GUARDRAILS.join(" ") : PROMPT_GUARDRAILS.slice(0, 3).join(" ");
  return `${systemPrompt}\nExam integrity rules:\n${added}`;
}
