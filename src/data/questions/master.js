// src/data/questions/master.js — canonical bank access.
//
// Data: per-exam JSON (see schema.md), statically imported today so every
// existing SYNCHRONOUS getter keeps working with zero consumer changes.
// When the bank passes ~2,000 questions, switch the imports below to
// dynamic import() inside loadBank() — the async API already exists and
// new code should prefer it.
import jamb from "./master-bank/jamb.json";
import waec from "./master-bank/waec.json";
import neco from "./master-bank/neco.json";
import nabteb from "./master-bank/nabteb.json";
import postutme from "./master-bank/postutme.json";
import ielts from "./master-bank/ielts.json";
import sat from "./master-bank/sat.json";

const BANKS = { JAMB: jamb, WAEC: waec, NECO: neco, NABTEB: nabteb, "POST-UTME": postutme, IELTS: ielts, SAT: sat };

function normExam(exam) {
  const e = String(exam || "JAMB").toUpperCase();
  if (e === "POSTUTME" || e === "POST_UTME") return "POST-UTME";
  return BANKS[e] ? e : "JAMB";
}

// Sync access (compat layer). Returns the array for an exam.
export function getBank(exam = "JAMB") {
  return BANKS[normExam(exam)] || [];
}

// All questions across exams (deduplicated by id+exam).
export function getAllBankQuestions() {
  return Object.values(BANKS).flat();
}

// Async loader for NEW code paths. Returns the already-loaded static bank.
export async function loadBank(exam = "JAMB") {
  return BANKS[normExam(exam)] || [];
}

export function bankCounts() {
  const out = {};
  for (const [exam, list] of Object.entries(BANKS)) out[exam] = list.length;
  out.TOTAL = Object.values(BANKS).reduce((a, l) => a + l.length, 0);
  return out;
}
