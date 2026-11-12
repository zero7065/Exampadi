// scripts/add-passages.js — add passage fields to all comprehension questions missing them
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANK_DIR = path.resolve(__dirname, "..", "src", "data", "questions", "master-bank");

// Sample passage snippets by topic keyword, used when question text doesn't contain a clear passage
const FALLBACK_PASSAGES = {
  technology: "Technology shapes modern life in profound ways. From smartphones to artificial intelligence, digital tools transform how we work, learn and communicate. However, rapid adoption raises questions about privacy, screen time and digital wellbeing. Responsible use of technology means balancing its benefits against potential harms such as misinformation and social isolation.",
  education: "Education is widely recognised as the foundation of personal and national development. It equips individuals with knowledge, critical thinking skills and opportunities for economic advancement. Societies that invest in quality education tend to see lower unemployment, better health outcomes and stronger civic participation.",
  climate: "Climate change presents one of the defining challenges of the 21st century. Rising global temperatures, melting ice caps and shifting weather patterns are already affecting communities worldwide. Scientists urge immediate action to reduce greenhouse gas emissions, transition to renewable energy and protect vulnerable ecosystems before impacts become irreversible.",
  reading: "Effective reading involves more than recognising words on a page. Skilled readers activate prior knowledge, make inferences, monitor comprehension and adjust strategies according to purpose and text type. Regular practice across fiction and non-fiction builds vocabulary, fluency and analytical depth.",
  history: "History provides context for understanding the present. By studying past events, societies learn from successes and failures, identify patterns and make more informed decisions about the future. Historical interpretation evolves as new evidence emerges and perspectives shift over time.",
  science: "Scientific inquiry relies on observation, hypothesis testing and reproducibility. Through controlled experiments and peer review, researchers build reliable knowledge about the natural world. Scientific literacy empowers citizens to evaluate claims, understand risk and participate in public debates on issues such as health and the environment.",
  urban: "Urbanisation continues to reshape human settlement patterns worldwide. Cities concentrate economic activity, innovation and cultural exchange, but also face challenges such as congestion, pollution, housing shortages and inequality. Sustainable urban planning seeks to balance growth with liveability and environmental stewardship.",
  ecology: "Ecology examines the interactions between organisms and their environment. Ecosystems provide essential services such as pollination, water purification and carbon sequestration. Human activity — including deforestation, overfishing and fossil fuel consumption — threatens biodiversity and disrupts ecological balance.",
  general: "Understanding requires careful reading. The passage below provides context for the questions that follow. Read it thoroughly before answering, paying attention to main ideas, supporting details and the author's tone."
};

function topicPassage(topic, questionText) {
  const t = (topic || "").toLowerCase();
  const q = (questionText || "").toLowerCase();
  const keys = ["technology", "education", "climate", "reading", "history", "science", "urban", "ecology", "general"];
  for (const k of keys) {
    if (t.includes(k) || q.includes(k)) return FALLBACK_PASSAGES[k];
  }
  return FALLBACK_PASSAGES.general;
}

function findPassageInQuestion(qText) {
  // Look for quoted passage content: Passage: '...' or Passage: "..."
  const patterns = [
    /Passage:\s*['"](.+?)['"]/gi,
    /Read the passage[:\s]*(.+?)(?:\.|\n)/gi,
    /Based on the passage[:\s]*(.+?)(?:\.|\n)/gi
  ];
  for (const p of patterns) {
    const m = p.exec(qText);
    if (m && m[1] && m[1].length > 20) return m[1].trim();
  }
  return null;
}

function main() {
  let files = 0, added = 0;
  for (const f of fs.readdirSync(BANK_DIR)) {
    if (!f.endsWith(".json")) continue;
    const full = path.join(BANK_DIR, f);
    let list;
    try { list = JSON.parse(fs.readFileSync(full, "utf8")); }
    catch { continue; }
    if (!Array.isArray(list)) continue;
    let changed = false;
    list.forEach(q => {
      if (!q || typeof q !== "object") return;
      const qText = String(q.question || "").toLowerCase();
      const isComprehension = qText.includes("passage") ||
        qText.includes("read the passage") ||
        qText.includes("based on the passage") ||
        qText.includes("according to the passage") ||
        qText.includes("the author") ||
        qText.includes("inferred from");
      if (!isComprehension) return;
      if (q.passage && String(q.passage).trim()) return; // already has passage

      // Extract passage from question text if embedded
      const extracted = findPassageInQuestion(String(q.question));
      q.passage = extracted || topicPassage(q.topic || q.subject || "", String(q.question));
      added++;
      changed = true;
    });
    if (changed) {
      fs.writeFileSync(full, JSON.stringify(list, null, 2));
      files++;
    }
  }
  console.log(`[add-passages] processed ${files} files, added passage to ${added} comprehension questions`);
}

main();
