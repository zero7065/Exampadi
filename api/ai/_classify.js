const INTENT_PATTERNS = [
  { intent: "vision", re: /\[image\]|describe this|in this image|photo of|from this (photo|image|diagram)/i },
  { intent: "plan", re: /study plan|schedule|timetable|prepare in \d+ (day|week)|revision plan/i },
  { intent: "predict", re: /likely question|predict|what will come out|probably appear|exam focus/i },
  { intent: "flashcard", re: /flashcard|memori[sz]e|recall practice|active recall/i },
  { intent: "grade", re: /grade|mark this|score my|how many marks|award marks/i },
  { intent: "solve", re: /solve|calculate|compute|find x|find the value|evaluate|work out/i },
  { intent: "explain", re: /why (is|does|are|do)|explain|how (does|do|can)|reason|because|breakdown/i },
];

const INTENTS = new Set(["chat", "explain", "solve", "vision", "plan", "predict", "flashcard", "grade"]);

const SUBJECT_KEYWORDS = {
  Mathematics: /(equation|algebra|calculus|geometry|matrix|vector|integral|derivative|probability|logarithm|trigonometry|simultaneous)/i,
  Physics: /(force|velocity|acceleration|newton|wave|circuit|voltage|magnet|optics|momentum|friction|energy)/i,
  Chemistry: /(molecule|atom|acid|base|reaction|oxidation|mole|periodic|organic|hydrocarbon|electrolysis|titration)/i,
  Biology: /(cell|dna|gene|photosynthesis|enzyme|mitosis|ecosystem|organ|tissue|bacteria|respiration|genetics)/i,
  "English Language": /(concord|synonym|antonym|passage|comprehension|verb|noun|tense|punctuation|lexis|phonetics)/i,
  Economics: /(demand|supply|elasticity|inflation|gdp|market|fiscal|monetary|opportunity cost|subsidy)/i,
  Government: /(constitution|federal|senate|election|democracy|president|legislature|judiciary|franchise)/i,
  Literature: /(poem|poet|novel|drama|prose|character|theme|metaphor|set text|protagonist)/i,
  Geography: /(climate|latitude|longitude|map|river|population|soil|vegetation|erosion|rainfall)/i,
  "Agric Science": /(crop|livestock|soil|fertilizer|harvest|poultry|irrigation|farm|seed)/i,
  "Financial Accounting": /(debit|credit|ledger|balance sheet|trial balance|depreciation|journal|accounting)/i,
  Commerce: /(trade|business unit|bank|insurance|advert|consumer|wholesale|retail|partnership)/i,
  "Use of English": /(comprehension|cloze|oral english|stress|vowel|consonant|idiom)/i,
};

export function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return String(part.text || "");
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

export function messagesText(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => textFromContent(message?.content))
    .filter(Boolean)
    .join(" ");
}

export function messagesHaveImage(messages = []) {
  return (Array.isArray(messages) ? messages : []).some((message) =>
    Array.isArray(message?.content)
    && message.content.some((part) =>
      part?.type === "image_url"
      || part?.type === "image"
      || part?.inlineData?.data
      || part?.inline_data?.data
    )
  );
}

export function normalizeIntent(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "study_plan" || normalized === "planner") return "plan";
  if (normalized === "image" || normalized === "photo") return "vision";
  return INTENTS.has(normalized) ? normalized : null;
}

export function classifyIntent({ messages, hasImage, intentHint } = {}) {
  const hinted = normalizeIntent(intentHint);
  if (hinted) return { intent: hinted, confidence: 1, source: "client" };
  if (hasImage) return { intent: "vision", confidence: 0.99, source: "image" };

  const text = messagesText(messages);
  for (const { intent, re } of INTENT_PATTERNS) {
    if (re.test(text)) return { intent, confidence: 0.85, source: "regex" };
  }
  return { intent: "chat", confidence: 0.6, source: "default" };
}

export function detectSubject(text) {
  const value = String(text || "");
  for (const [subject, re] of Object.entries(SUBJECT_KEYWORDS)) {
    if (re.test(value)) return subject;
  }
  return null;
}

export function previewForMessages(messages = []) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const text = textFromContent(list[i]?.content);
    if (text.trim()) return text.trim();
  }
  return "";
}
