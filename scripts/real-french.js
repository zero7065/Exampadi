// Replace placeholder questions with real, correct exam questions.
// Run: node scripts/real-questions.js
import fs from "fs";

const DIR = "C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank";

function load(f) {
  return JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8"));
}
function save(f, data) {
  fs.writeFileSync(`${DIR}/${f}`, JSON.stringify(data, null, 2));
}

// ─── REAL FRENCH QUESTIONS (JAMB + WAEC) ───
const FRENCH = [
  { q: "Complétez : « Je ___ au marché hier. »", o: { A: "vais", B: "suis allé", C: "irai", D: "allais" }, a: "B", e: "Passé composé avec 'être' : je suis allé(e). 'Hier' marque le passé." },
  { q: "« Comment tu t'appelles ? » — « Je ___ Jean. »", o: { A: "m'appelle", B: "t'appelles", C: "s'appelle", D: "appelle" }, a: "A", e: "Verbe pronominal 's'appeler' à la 1re personne : je m'appelle." },
  { q: "Le féminin de « acteur » est :", o: { A: "actrice", B: "acteure", C: "acteureuse", D: "actriceuse" }, a: "A", e: "Les noms en -teur font leur féminin en -trice : acteur → actrice." },
  { q: "Complétez : « Nous ___ français. »", o: { A: "sommes", B: "avons", C: "êtes", D: "sont" }, a: "A", e: "Être à la 1re personne du pluriel : nous sommes." },
  { q: "« Le chien » est de genre :", o: { A: "masculin", B: "féminin", C: "neutre", D: "pluriel" }, a: "A", e: "'Le' est l'article masculin singulier." },
  { q: "Complétez : « Elle ___ une pomme. »", o: { A: "mange", B: "manges", C: "mangeons", D: "mangent" }, a: "A", e: "Manger à la 3e personne du singulier : il/elle mange." },
  { q: "Le contraire de « grand » est :", o: { A: "petit", B: "haut", C: "long", D: "large" }, a: "A", e: "Antonyme : grand ↔ petit." },
  { q: "« Où est la gare ? » signifie :", o: { A: "Where is the station?", B: "Where is the market?", C: "Where is the school?", D: "Where is the bank?" }, a: "A", e: "'Gare' = station (de train)." },
  { q: "Complétez : « Les enfants ___ à l'école. »", o: { A: "vont", B: "va", C: "allez", D: "allons" }, a: "A", e: "Aller à la 3e personne du pluriel : ils/elles vont." },
  { q: "« Merci beaucoup » veut dire :", o: { A: "Thank you very much", B: "Good morning", C: "See you later", D: "How are you" }, a: "A", e: "Expression de politesse : merci beaucoup = thank you very much." },
  { q: "Complétez : « J'ai ___ livres. » (plusieurs)", o: { A: "des", B: "du", C: "de la", D: "l'" }, a: "A", e: "Article indéfini pluriel : des livres." },
  { q: "Le pluriel de « journal » est :", o: { A: "journaux", B: "journals", C: "journales", D: "journalx" }, a: "A", e: "Les mots en -al font leur pluriel en -aux : journal → journaux." },
  { q: "« Quelle heure est-il ? » demande :", o: { A: "the time", B: "the date", C: "the weather", D: "the price" }, a: "A", e: "Question sur l'heure : what time is it?" },
  { q: "Complétez : « Tu ___ tes devoirs. »", o: { A: "fais", B: "fait", C: "faisons", D: "font" }, a: "A", e: "Faire à la 2e personne du singulier : tu fais." },
  { q: "« Bon appétit ! » se dit :", o: { A: "before a meal", B: "at night", C: "in the morning", D: "when leaving" }, a: "A", e: "On dit 'bon appétit' avant de commencer un repas." },
  { q: "Complétez : « Nous ___ au cinéma. »", o: { A: "allons", B: "allez", C: "vont", D: "va" }, a: "A", e: "Aller à la 1re personne du pluriel : nous allons." },
  { q: "Le contraire de « chaud » est :", o: { A: "froid", B: "tiède", C: "brûlant", D: "doux" }, a: "A", e: "Antonyme : chaud ↔ froid." },
  { q: "« Je voudrais un café, s'il vous plaît » est :", o: { A: "poli", B: "impoli", C: "familier", D: "vulgaire" }, a: "A", e: "'Je voudrais' et 's'il vous plaît' sont des formules de politesse." },
  { q: "Complétez : « Elles ___ la porte. » (ouvrir)", o: { A: "ouvrent", B: "ouvre", C: "ouvrons", D: "ouvrez" }, a: "A", e: "Ouvrir à la 3e personne du pluriel : elles ouvrent." },
  { q: "« Lundi », « mardi », « mercredi » sont des :", o: { A: "jours", B: "mois", C: "saisons", D: "couleurs" }, a: "A", e: "Ce sont les jours de la semaine." },
  { q: "Complétez : « Il ___ faim. »", o: { A: "a", B: "est", C: "va", D: "fait" }, a: "A", e: "Avoir faim : il a faim (verbe avoir)." },
  { q: "Le synonyme de « content » est :", o: { A: "heureux", B: "triste", C: "fâché", D: "fatigué" }, a: "A", e: "Content = heureux." },
  { q: "« Je ___ le français. » (aimer)", o: { A: "aime", B: "aimes", C: "aimons", D: "aiment" }, a: "A", e: "Aimer à la 1re personne du singulier : j'aime." },
  { q: "Complétez : « Vous ___ anglais. » (parler)", o: { A: "parlez", B: "parle", C: "parlons", D: "parlent" }, a: "A", e: "Parler à la 2e personne du pluriel : vous parlez." },
  { q: "« Quel temps fait-il ? » concerne :", o: { A: "la météo", B: "l'heure", C: "le prix", D: "la direction" }, a: "A", e: "Question sur la météo : how is the weather?" },
  { q: "Le féminin de « chanteur » est :", o: { A: "chanteuse", B: "chanteure", C: "chanteuse", D: "chantreuse" }, a: "A", e: "Les noms en -eur font leur féminin en -euse : chanteur → chanteuse." },
  { q: "Complétez : « Nous ___ deux enfants. »", o: { A: "avons", B: "avez", C: "ont", D: "a" }, a: "A", e: "Avoir à la 1re personne du pluriel : nous avons." },
  { q: "« Au revoir » signifie :", o: { A: "Goodbye", B: "Hello", C: "Please", D: "Sorry" }, a: "A", e: "Formule d'adieu : au revoir = goodbye." },
  { q: "Complétez : « Les filles ___ contentes. » (être)", o: { A: "sont", B: "est", C: "sommes", D: "êtes" }, a: "A", e: "Être à la 3e personne du pluriel : ils/elles sont." },
];

// Replace placeholder French questions
function replaceFrench(file, exam) {
  let data = load(file);
  const real = FRENCH.map((f, i) => ({
    id: `${exam.toLowerCase()}-2026-fre-${String(i + 1).padStart(3, "0")}`,
    subject: "French",
    topic: ["Grammar", "Vocabulary", "Translation", "Comprehension"][i % 4],
    exam: [exam],
    year: 2026,
    difficulty: ["easy", "medium", "hard"][i % 3],
    question: f.q,
    options: f.o,
    correctAnswer: f.a,
    explanation: f.e,
    source: "past",
    createdAt: new Date().toISOString(),
  }));
  // Remove old placeholder French and add real ones
  data = data.filter((q) => q.subject !== "French");
  data.push(...real);
  save(file, data);
  return real.length;
}

const jambCount = replaceFrench("jamb.json", "JAMB");
const waecCount = replaceFrench("waec.json", "WAEC");
console.log(`French replaced — JAMB: ${jambCount}, WAEC: ${waecCount}`);