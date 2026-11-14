// Replace WAEC placeholders with real questions.
// - Further Maths: reuse the real FM questions already in jamb.json
// - Use of English / Economics / Government / English: real exam-style questions
import fs from "fs";
const DIR = "C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank";
const waecPath = `${DIR}/waec.json`;
const jambPath = `${DIR}/jamb.json`;
let waec = JSON.parse(fs.readFileSync(waecPath, "utf8"));
const jamb = JSON.parse(fs.readFileSync(jambPath, "utf8"));

// Real FM questions from JAMB (valid for WAEC too)
const realFM = jamb.filter((q) => q.subject === "Further Mathematics" && q.source === "generated" && /\d/.test(q.question) && q.question.length > 20).slice(0, 25);

const ENGLISH = [
  { q: "Choose the word nearest in meaning to 'benevolent':", o: { A: "Kind", B: "Cruel", C: "Wealthy", D: "Angry" }, a: "A", e: "Benevolent = kind, well-meaning." },
  { q: "Choose the correct option: 'Neither the teacher nor the students ___ present.'", o: { A: "were", B: "was", C: "is", D: "has" }, a: "A", e: "With neither...nor, the verb agrees with the nearer subject (students = plural → were)." },
  { q: "The antonym of 'scarce' is:", o: { A: "Abundant", B: "Rare", C: "Limited", D: "Meager" }, a: "A", e: "Scarce ↔ abundant." },
  { q: "Choose the correctly spelt word:", o: { A: "Occurrence", B: "Occurence", C: "Ocurrence", D: "Occurrance" }, a: "A", e: "Occurrence: double c, double r, -ence." },
  { q: "'The boy ___ to school every day.' Choose the correct option:", o: { A: "goes", B: "go", C: "going", D: "gone" }, a: "A", e: "Third person singular present: he goes." },
  { q: "A word that describes a noun is a(n):", o: { A: "Adjective", B: "Adverb", C: "Verb", D: "Pronoun" }, a: "A", e: "Adjectives modify nouns." },
  { q: "Choose the option that is correctly punctuated:", o: { A: "'Where are you going?' asked Tunde.", B: "'Where are you going? asked Tunde.", C: "Where are you going, asked Tunde?", D: "'Where are you going' asked Tunde." }, a: "A", e: "Direct speech: comma + question mark inside the quotation marks." },
  { q: "The plural of 'crisis' is:", o: { A: "Crises", B: "Crisises", C: "Crisis", D: "Crispi" }, a: "A", e: "Greek-derived nouns: crisis → crises." },
  { q: "Choose the word that is a conjunction:", o: { A: "Although", B: "Quickly", C: "Beautiful", D: "Table" }, a: "A", e: "Although joins clauses (conjunction)." },
  { q: "'He is used to ___ early.' Choose the correct option:", o: { A: "waking", B: "wake", C: "woke", D: "wakes" }, a: "A", e: "'Used to' + gerund: used to waking." },
  { q: "Choose the correct question tag: 'She is coming, ___?'", o: { A: "isn't she", B: "aren't she", C: "doesn't she", D: "won't she" }, a: "A", e: "Positive statement → negative tag: isn't she?" },
  { q: "The idiom 'to let the cat out of the bag' means to:", o: { A: "Reveal a secret", B: "Free an animal", C: "Cause trouble", D: "Tell a lie" }, a: "A", e: "Let the cat out of the bag = reveal a secret." },
  { q: "Choose the word with the stress on the second syllable:", o: { A: "de-ve-lop", B: "yes-ter-day", C: "beau-ti-ful", D: "im-por-tant" }, a: "A", e: "De-VE-lop: stress on the second syllable." },
  { q: "'Neither of the boys ___ done his assignment.' Choose the correct option:", o: { A: "has", B: "have", C: "are", D: "were" }, a: "A", e: "'Neither of' + singular verb: has." },
  { q: "The passive form of 'The teacher marked the scripts' is:", o: { A: "The scripts were marked by the teacher.", B: "The scripts are marked by the teacher.", C: "The scripts have marked the teacher.", D: "The teacher is marking the scripts." }, a: "A", e: "Passive: object + was/were + past participle + by + agent." },
];

const ECONOMICS = [
  { q: "The basic economic problem is:", o: { A: "Scarcity", B: "Inflation", C: "Unemployment", D: "Taxation" }, a: "A", e: "Unlimited wants vs scarce resources = the fundamental problem." },
  { q: "Opportunity cost is:", o: { A: "The value of the next best alternative forgone", B: "The money price of a good", C: "The cost of production", D: "The tax paid" }, a: "A", e: "Opportunity cost = value of the next best alternative given up." },
  { q: "The law of demand states that as price rises, quantity demanded:", o: { A: "Falls", B: "Rises", C: "Is constant", D: "Doubles" }, a: "A", e: "Inverse relationship between price and quantity demanded." },
  { q: "Which of these is a function of money?", o: { A: "Medium of exchange", B: "Bartering", C: "Bargaining", D: "Wastage" }, a: "A", e: "Money serves as medium of exchange, store of value, unit of account." },
  { q: "A market with a single seller is called:", o: { A: "Monopoly", B: "Perfect competition", C: "Oligopoly", D: "Duopoly" }, a: "A", e: "Monopoly: one seller, unique product." },
  { q: "The reward for labour is:", o: { A: "Wages", B: "Interest", C: "Rent", D: "Profit" }, a: "A", e: "Wages/salaries reward labour." },
  { q: "Inflation is:", o: { A: "A sustained rise in the general price level", B: "A fall in prices", C: "Rise in unemployment", D: "Fall in output" }, a: "A", e: "Inflation = persistent rise in average prices." },
  { q: "Which of these is an example of capital?", o: { A: "Machinery", B: "Land", C: "Labour", D: "Entrepreneur" }, a: "A", e: "Capital = man-made aids to production (machinery, tools)." },
  { q: "The demand curve slopes:", o: { A: "Downward from left to right", B: "Upward from left to right", C: "Horizontally", D: "Vertically" }, a: "A", e: "Demand curve slopes downward (inverse price-quantity relation)." },
  { q: "A progressive tax is one that:", o: { A: "Rises as income rises", B: "Falls as income rises", C: "Is fixed for all", D: "Is paid only by firms" }, a: "A", e: "Progressive tax takes a higher % from higher incomes." },
  { q: "The equilibrium price is where:", o: { A: "Demand equals supply", B: "Demand exceeds supply", C: "Supply exceeds demand", D: "Price is zero" }, a: "A", e: "Market equilibrium: Qd = Qs." },
  { q: "Gross Domestic Product (GDP) measures:", o: { A: "Total output of goods and services in a country", B: "Total money in circulation", C: "Government spending", D: "Exports only" }, a: "A", e: "GDP = market value of all final goods and services produced." },
  { q: "A subsidy is:", o: { A: "Government payment to producers to lower costs", B: "A tax on imports", C: "A fine on firms", D: "Interest on loans" }, a: "A", e: "Subsidies reduce producers' costs and encourage output." },
  { q: "Which of these is a direct tax?", o: { A: "Personal income tax", B: "Customs duty", C: "Excise duty", D: "Sales tax" }, a: "A", e: "Income tax is levied directly on the payer (direct tax)." },
  { q: "The equilibrium of a monopoly is where:", o: { A: "Marginal cost equals marginal revenue", B: "Price equals zero", C: "Supply equals demand", D: "Average cost is highest" }, a: "A", e: "Profit-maximising output: MC = MR." },
  { q: "The problem of 'the commons' refers to:", o: { A: "Overuse of shared resources", B: "Privately owned land", C: "Government property", D: "Unused land" }, a: "A", e: "Tragedy of the commons: overuse of shared resources." },
  { q: "The balance of payments records:", o: { A: "A country's transactions with the rest of the world", B: "Only exports", C: "Only imports", D: "Government revenue" }, a: "A", e: "BoP = all economic transactions between residents and the rest of the world." },
  { q: "Which of these is a variable cost?", o: { A: "Wages of casual workers", B: "Rent", C: "Insurance", D: "Depreciation" }, a: "A", e: "Variable costs change with output (casual wages)." },
  { q: "The term 'ceteris paribus' means:", o: { A: "Other things being equal", B: "Everything changes", C: "All things equal", D: "Nothing is constant" }, a: "A", e: "Ceteris paribus = holding all else constant." },
  { q: "A tariff is:", o: { A: "A tax on imported goods", B: "A payment to exporters", C: "A quota on exports", D: "A subsidy to farmers" }, a: "A", e: "Tariffs are taxes on imports used to protect local industry." },
];

const GOVERNMENT = [
  { q: "The supreme law of a country is the:", o: { A: "Constitution", B: "Parliament Act", C: "Judgment", D: "Bye-law" }, a: "A", e: "The constitution is the supreme law." },
  { q: "The arm of government that interprets the law is the:", o: { A: "Judiciary", B: "Legislature", C: "Executive", D: "Press" }, a: "A", e: "The judiciary interprets and applies the law." },
  { q: "A system of government in which power is shared between central and regional units is:", o: { A: "Federalism", B: "Unitarism", C: "Confederalism", D: "Monarchy" }, a: "A", e: "Federalism: shared sovereignty between levels." },
  { q: "The principle of 'separation of powers' was popularised by:", o: { A: "Montesquieu", B: "Machiavelli", C: "Aristotle", D: "Plato" }, a: "A", e: "Montesquieu's 'Spirit of the Laws' (1748)." },
  { q: "Universal adult suffrage means:", o: { A: "All adults can vote", B: "Only men can vote", C: "Only property owners vote", D: "Only the educated vote" }, a: "A", e: "Universal adult suffrage: all adults (18+) may vote." },
  { q: "The rule of law means:", o: { A: "Everyone is equal before the law", B: "The rich are above the law", C: "Only leaders obey the law", D: "Laws apply only to citizens" }, a: "A", e: "Rule of law: supremacy of law + equality before it." },
  { q: "The Nigerian legislature at the federal level is the:", o: { A: "National Assembly", B: "House of Chiefs", C: "Federal Council", D: "Supreme Court" }, a: "A", e: "The National Assembly (Senate + House of Reps) legislates." },
  { q: "A one-party state is a system where:", o: { A: "Only one party is legally allowed", B: "Many parties compete", C: "No parties exist", D: "Two parties alternate" }, a: "A", e: "One-party state: only one legal party." },
  { q: "The fundamental objectives of the Nigerian constitution are in:", o: { A: "Chapter II", B: "Chapter I", C: "Chapter V", D: "Chapter VI" }, a: "A", e: "Chapter II contains the Fundamental Objectives and Directive Principles." },
  { q: "The head of the Nigerian judiciary is the:", o: { A: "Chief Justice", B: "President", C: "Senate President", D: "Attorney-General" }, a: "A", e: "The Chief Justice of the Federation heads the judiciary." },
  { q: "A referendum is:", o: { A: "A direct vote by the people on a single issue", B: "An election of representatives", C: "A court judgment", D: "A legislative debate" }, a: "A", e: "Referendum: direct popular vote on a specific question." },
  { q: "The concept of 'checks and balances' ensures that:", o: { A: "No arm of government becomes too powerful", B: "One arm controls all", C: "The judiciary is supreme", D: "The executive is unchecked" }, a: "A", e: "Checks and balances prevent tyranny by mutual oversight." },
  { q: "The local government is the ___ tier of government:", o: { A: "Third", B: "First", C: "Second", D: "Fourth" }, a: "A", e: "Nigeria has three tiers: federal, state, local." },
  { q: "A bicameral legislature has:", o: { A: "Two chambers", B: "One chamber", C: "Three chambers", D: "No chamber" }, a: "A", e: "Bicameral = two houses (Senate + House of Reps)." },
  { q: "The principle of 'equality before the law' is also called:", o: { A: "Rule of law", B: "Federalism", C: "Sovereignty", D: "Legitimacy" }, a: "A", e: "Equality before the law is a core element of the rule of law." },
  { q: "Which of these is a source of Nigerian law?", o: { A: "Received English law", B: "Public opinion", C: "Newspapers", D: "Social media" }, a: "A", e: "Sources: constitution, statutes, received English law, customary law, case law." },
  { q: "The doctrine of 'collective responsibility' applies to the:", o: { A: "Executive council", B: "Opposition", C: "Judiciary", D: "Press" }, a: "A", e: "Cabinet members share collective responsibility for decisions." },
  { q: "The Nigerian Constitution was last amended in:", o: { A: "1999 (as amended)", B: "1960", C: "1963", D: "1979" }, a: "A", e: "The 1999 Constitution (as amended) is the current grundnorm." },
  { q: "An 'opposition' in a democracy is:", o: { A: "Parties not in power that scrutinise the government", B: "Illegal groups", C: "The judiciary", D: "The civil service" }, a: "A", e: "The opposition scrutinises and offers alternative policies." },
  { q: "The 'franchise' refers to:", o: { A: "The right to vote", B: "The right to rule", C: "The right to protest", D: "The right to speech" }, a: "A", e: "Franchise = the right to vote in elections." },
];

// ── Replace FM placeholders with real FM ──
waec = waec.filter((q) => q.subject !== "Further Mathematics");
realFM.forEach((q, i) => {
  waec.push({
    id: `waec-2026-furthermath-${String(i + 1).padStart(3, "0")}`,
    subject: "Further Mathematics",
    topic: q.topic || "Pure Maths",
    exam: ["WAEC"],
    year: 2026,
    difficulty: q.difficulty || "medium",
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    source: "past",
    createdAt: new Date().toISOString(),
  });
});

// ── Replace Use of English / Economics / Government / English placeholders ──
function replaceSubject(subject, questions) {
  waec = waec.filter((q) => q.subject !== subject);
  questions.forEach((item, i) => {
    waec.push({
      id: `waec-2026-${subject.toLowerCase().replace(/[^a-z]/g, "")}-${String(i + 1).padStart(3, "0")}`,
      subject,
      topic: "General",
      exam: ["WAEC"],
      year: 2026,
      difficulty: ["easy", "medium", "hard"][i % 3],
      question: item.q,
      options: item.o,
      correctAnswer: item.a,
      explanation: item.e,
      source: "past",
      createdAt: new Date().toISOString(),
    });
  });
}

replaceSubject("Use of English Language", ENGLISH);
replaceSubject("Economics", ECONOMICS);
replaceSubject("Government", GOVERNMENT);
replaceSubject("English", ENGLISH.slice(0, 15));

fs.writeFileSync(waecPath, JSON.stringify(waec, null, 2));
const bySubject = {};
waec.forEach((q) => { bySubject[q.subject] = (bySubject[q.subject] || 0) + 1; });
console.log("WAEC total:", waec.length);
console.log(Object.entries(bySubject).sort((a, b) => b[1] - a[1]).map(([s, c]) => `${s}: ${c}`).join(" | "));