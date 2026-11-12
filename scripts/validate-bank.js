// scripts/validate-bank.js — validates every master-bank JSON file against
// schema.md. Runs in `prebuild` (after check-env); FAILS THE BUILD on bad data.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANK_DIR = path.resolve(__dirname, "..", "src", "data", "questions", "master-bank");

const EXAMS = new Set(["JAMB", "WAEC", "NECO", "NABTEB", "POST-UTME", "IELTS", "SAT"]);
const DIFFS = new Set(["easy", "medium", "hard"]);

async function main() {
  const errors = [];
  let total = 0;

  if (!fs.existsSync(BANK_DIR)) {
    console.error(`[validate-bank] missing directory: ${BANK_DIR}`);
    process.exit(1);
  }

  for (const f of fs.readdirSync(BANK_DIR)) {
    if (!f.endsWith(".json")) continue;
    const full = path.join(BANK_DIR, f);
    const seenIds = new Set(); // ids are unique per exam file (see schema.md)
    let list;
    try {
      list = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (e) {
      errors.push(`${f}: invalid JSON (${e.message})`);
      continue;
    }
    if (!Array.isArray(list)) {
      errors.push(`${f}: root must be an array`);
      continue;
    }
    list.forEach((q, i) => {
      const where = `${f}[${i}]${q?.id ? ` (${q.id})` : ""}`;
      total++;
      if (!q || typeof q !== "object") { errors.push(`${where}: not an object`); return; }
      if (!q.id || typeof q.id !== "string") errors.push(`${where}: missing id`);
      else if (seenIds.has(q.id)) errors.push(`${where}: duplicate id ${q.id}`);
      else seenIds.add(q.id);
      if (!q.subject || !String(q.subject).trim()) errors.push(`${where}: missing subject`);
      if (!q.topic || !String(q.topic).trim()) errors.push(`${where}: missing topic`);
      if (!Array.isArray(q.exam) || q.exam.length === 0) errors.push(`${where}: exam must be a non-empty array`);
      else q.exam.forEach((e) => { if (!EXAMS.has(e)) errors.push(`${where}: bad exam value ${e}`); });
      if (!Number.isInteger(q.year) || q.year < 1990 || q.year > 2030) errors.push(`${where}: bad year ${q.year}`);
      if (!DIFFS.has(q.difficulty)) errors.push(`${where}: bad difficulty ${q.difficulty}`);
      if (!q.question || !String(q.question).trim()) errors.push(`${where}: empty question`);
      const kind = q.kind || "objective";
      if (!["objective", "theory"].includes(kind)) errors.push(`${where}: bad kind ${q.kind}`);
      if (kind === "theory") {
        if (!q.modelAnswer || !String(q.modelAnswer).trim()) errors.push(`${where}: theory needs modelAnswer`);
      } else {
        const opts = q.options || {};
        const keys = Object.keys(opts);
        // Most questions use A–D. IELTS TRUE/FALSE/NOT GIVEN items legitimately
        // have exactly three options (A–C); allow those, otherwise require A–D.
        const isTfng = keys.length === 3 && ["A", "B", "C"].every((k) => opts[k] && String(opts[k]).trim());
        if (isTfng) {
          if (!["A", "B", "C"].includes(q.correctAnswer)) errors.push(`${where}: bad TFNG correctAnswer ${q.correctAnswer}`);
        } else {
          ["A", "B", "C", "D"].forEach((k) => {
            if (!opts[k] || !String(opts[k]).trim()) errors.push(`${where}: empty option ${k}`);
          });
          if (!["A", "B", "C", "D"].includes(q.correctAnswer)) errors.push(`${where}: bad correctAnswer ${q.correctAnswer}`);
        }
      }
      if (!q.explanation || !String(q.explanation).trim()) errors.push(`${where}: empty explanation`);
      // Comprehension questions must carry a passage field (read-before-question context)
      const qText = String(q.question || "").toLowerCase();
      if (qText.includes("passage") || qText.includes("read the passage") || qText.includes("based on the passage")) {
        if (!q.passage || !String(q.passage).trim()) errors.push(`${where}: comprehension question missing passage field`);
      }
      if (q.repeatedFrom !== undefined && !Array.isArray(q.repeatedFrom)) errors.push(`${where}: repeatedFrom must be an array`);
    });
  }

  console.log(`[validate-bank] checked ${total} questions`);
  if (errors.length > 0) {
    console.error(`\n[validate-bank] BUILD BLOCKED — ${errors.length} problem(s):`);
    errors.slice(0, 30).forEach((e) => console.error(`  - ${e}`));
    if (errors.length > 30) console.error(`  …and ${errors.length - 30} more`);
    process.exit(1);
  }
  console.log("[validate-bank] all questions valid.");
}

main().catch((e) => {
  console.error("[validate-bank] failed:", e.message);
  process.exit(1);
});
