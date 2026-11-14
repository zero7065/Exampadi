// Replace NECO + POST-UTME placeholders with real questions.
import fs from "fs";
const DIR = "C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank";

const ENGLISH = [
  { q: "Choose the word nearest in meaning to 'diligent':", o: { A: "Hardworking", B: "Lazy", C: "Careless", D: "Wealthy" }, a: "A", e: "Diligent = hardworking." },
  { q: "Choose the correct option: 'The team ___ playing well.'", o: { A: "is", B: "are", C: "were", D: "have" }, a: "A", e: "Collective noun 'team' takes a singular verb here." },
  { q: "The antonym of 'ancient' is:", o: { A: "Modern", B: "Old", C: "Historic", D: "Aged" }, a: "A", e: "Ancient ↔ modern." },
  { q: "Choose the correctly spelt word:", o: { A: "Necessary", B: "Neccessary", C: "Necesary", D: "Necessery" }, a: "A", e: "Necessary: one c, double s." },
  { q: "'She sings beautifully.' The word 'beautifully' is a(n):", o: { A: "Adverb", B: "Adjective", C: "Noun", D: "Verb" }, a: "A", e: "Adverbs modify verbs (sings beautifully)." },
  { q: "The plural of 'child' is:", o: { A: "Children", B: "Childs", C: "Childes", D: "Childrens" }, a: "A", e: "Irregular plural: child → children." },
  { q: "Choose the correct question tag: 'They are coming, ___?'", o: { A: "aren't they", B: "isn't it", C: "don't they", D: "won't they" }, a: "A", e: "Positive statement → negative tag: aren't they?" },
  { q: "'To break the ice' means to:", o: { A: "Start a conversation", B: "Cause damage", C: "Cool a drink", D: "End a friendship" }, a: "A", e: "Break the ice = ease initial tension in a conversation." },
  { q: "The passive of 'They built the house' is:", o: { A: "The house was built by them.", B: "The house is built by them.", C: "The house has built them.", D: "They are building the house." }, a: "A", e: "Passive: object + was/were + past participle + by + agent." },
  { q: "Choose the word that is a preposition:", o: { A: "Under", B: "Run", C: "Happy", D: "Quickly" }, a: "A", e: "Under is a preposition (shows position)." },
  { q: "The noun form of 'describe' is:", o: { A: "Description", B: "Describe", C: "Describing", D: "Described" }, a: "A", e: "Describe (verb) → description (noun)." },
  { q: "Choose the correct option: 'Neither of the girls ___ present.'", o: { A: "was", B: "were", C: "are", D: "have" }, a: "A", e: "'Neither of' + singular verb: was." },
  { q: "A group of words with a subject and a verb is a:", o: { A: "Clause", B: "Phrase", C: "Sentence", D: "Paragraph" }, a: "A", e: "A clause has a subject + verb; a phrase lacks one." },
  { q: "Choose the correctly punctuated sentence:", o: { A: "He said, 'I am tired.'", B: "He said 'I am tired'.", C: "He said, I am tired.", D: "He said 'I am tired'" }, a: "A", e: "Direct speech: comma + capital + terminal punctuation inside quotes." },
  { q: "The comparative form of 'good' is:", o: { A: "Better", B: "Gooder", C: "More good", D: "Best" }, a: "A", e: "Good → better → best (irregular)." },
];

const ECONOMICS = [
  { q: "The basic economic problem is:", o: { A: "Scarcity", B: "Inflation", C: "Unemployment", D: "Taxation" }, a: "A", e: "Unlimited wants vs scarce resources." },
  { q: "Opportunity cost is:", o: { A: "The next best alternative forgone", B: "The money price", C: "The cost of production", D: "The tax paid" }, a: "A", e: "Opportunity cost = value of the next best alternative given up." },
  { q: "The law of demand states that as price rises, quantity demanded:", o: { A: "Falls", B: "Rises", C: "Is constant", D: "Doubles" }, a: "A", e: "Inverse relationship between price and quantity demanded." },
  { q: "A market with a single seller is called:", o: { A: "Monopoly", B: "Perfect competition", C: "Oligopoly", D: "Duopoly" }, a: "A", e: "Monopoly: one seller, unique product." },
  { q: "The reward for labour is:", o: { A: "Wages", B: "Interest", C: "Rent", D: "Profit" }, a: "A", e: "Wages/salaries reward labour." },
  { q: "Inflation is:", o: { A: "A sustained rise in the general price level", B: "A fall in prices", C: "Rise in unemployment", D: "Fall in output" }, a: "A", e: "Persistent rise in average prices." },
  { q: "The equilibrium price is where:", o: { A: "Demand equals supply", B: "Demand exceeds supply", C: "Supply exceeds demand", D: "Price is zero" }, a: "A", e: "Market equilibrium: Qd = Qs." },
  { q: "Which of these is a function of money?", o: { A: "Medium of exchange", B: "Bartering", C: "Bargaining", D: "Wastage" }, a: "A", e: "Medium of exchange, store of value, unit of account." },
  { q: "A progressive tax is one that:", o: { A: "Rises as income rises", B: "Falls as income rises", C: "Is fixed for all", D: "Is paid only by firms" }, a: "A", e: "Higher % from higher incomes." },
  { q: "Gross Domestic Product (GDP) measures:", o: { A: "Total output of goods and services", B: "Money in circulation", C: "Government spending", D: "Exports only" }, a: "A", e: "Market value of all final goods and services produced." },
  { q: "A tariff is:", o: { A: "A tax on imported goods", B: "A payment to exporters", C: "A quota on exports", D: "A subsidy to farmers" }, a: "A", e: "Tariffs are taxes on imports." },
  { q: "The demand curve slopes:", o: { A: "Downward from left to right", B: "Upward", C: "Horizontally", D: "Vertically" }, a: "A", e: "Demand curve slopes downward." },
  { q: "A subsidy is:", o: { A: "Government payment to producers", B: "A tax on imports", C: "A fine on firms", D: "Interest on loans" }, a: "A", e: "Subsidies reduce producers' costs." },
  { q: "Which of these is a direct tax?", o: { A: "Personal income tax", B: "Customs duty", C: "Excise duty", D: "Sales tax" }, a: "A", e: "Income tax is a direct tax." },
  { q: "The equilibrium of a monopoly is where:", o: { A: "Marginal cost equals marginal revenue", B: "Price equals zero", C: "Supply equals demand", D: "Average cost is highest" }, a: "A", e: "Profit-maximising output: MC = MR." },
];

const GOVERNMENT = [
  { q: "The supreme law of a country is the:", o: { A: "Constitution", B: "Parliament Act", C: "Judgment", D: "Bye-law" }, a: "A", e: "The constitution is the supreme law." },
  { q: "The arm of government that interprets the law is the:", o: { A: "Judiciary", B: "Legislature", C: "Executive", D: "Press" }, a: "A", e: "The judiciary interprets and applies the law." },
  { q: "A system of government in which power is shared between central and regional units is:", o: { A: "Federalism", B: "Unitarism", C: "Confederalism", D: "Monarchy" }, a: "A", e: "Federalism: shared sovereignty between levels." },
  { q: "The principle of 'separation of powers' was popularised by:", o: { A: "Montesquieu", B: "Machiavelli", C: "Aristotle", D: "Plato" }, a: "A", e: "Montesquieu's 'Spirit of the Laws' (1748)." },
  { q: "Universal adult suffrage means:", o: { A: "All adults can vote", B: "Only men can vote", C: "Only property owners vote", D: "Only the educated vote" }, a: "A", e: "All adults (18+) may vote." },
  { q: "The rule of law means:", o: { A: "Everyone is equal before the law", B: "The rich are above the law", C: "Only leaders obey the law", D: "Laws apply only to citizens" }, a: "A", e: "Supremacy of law + equality before it." },
  { q: "The Nigerian legislature at the federal level is the:", o: { A: "National Assembly", B: "House of Chiefs", C: "Federal Council", D: "Supreme Court" }, a: "A", e: "Senate + House of Representatives." },
  { q: "A one-party state is a system where:", o: { A: "Only one party is legally allowed", B: "Many parties compete", C: "No parties exist", D: "Two parties alternate" }, a: "A", e: "One-party state: only one legal party." },
  { q: "The head of the Nigerian judiciary is the:", o: { A: "Chief Justice", B: "President", C: "Senate President", D: "Attorney-General" }, a: "A", e: "The Chief Justice of the Federation heads the judiciary." },
  { q: "A referendum is:", o: { A: "A direct vote by the people on a single issue", B: "An election of representatives", C: "A court judgment", D: "A legislative debate" }, a: "A", e: "Referendum: direct popular vote on a specific question." },
  { q: "The local government is the ___ tier of government:", o: { A: "Third", B: "First", C: "Second", D: "Fourth" }, a: "A", e: "Federal, state, local = three tiers." },
  { q: "A bicameral legislature has:", o: { A: "Two chambers", B: "One chamber", C: "Three chambers", D: "No chamber" }, a: "A", e: "Bicameral = two houses." },
  { q: "An 'opposition' in a democracy is:", o: { A: "Parties not in power that scrutinise the government", B: "Illegal groups", C: "The judiciary", D: "The civil service" }, a: "A", e: "The opposition scrutinises the government." },
  { q: "The 'franchise' refers to:", o: { A: "The right to vote", B: "The right to rule", C: "The right to protest", D: "The right to speech" }, a: "A", e: "Franchise = the right to vote." },
  { q: "Which of these is a source of Nigerian law?", o: { A: "Received English law", B: "Public opinion", C: "Newspapers", D: "Social media" }, a: "A", e: "Constitution, statutes, received English law, customary law, case law." },
];

const POSTUTME = [
  { q: "Simplify: 2 + 3 × 4 − 6 ÷ 2", o: { A: "11", B: "9", C: "13", D: "7" }, a: "A", e: "BODMAS: 3×4=12; 6÷2=3; 2+12−3 = 11." },
  { q: "If x + 5 = 12, find x.", o: { A: "7", B: "17", C: "−7", D: "5" }, a: "A", e: "x = 12 − 5 = 7." },
  { q: "The area of a circle with radius 7 cm is: (π = 22/7)", o: { A: "154 cm²", B: "44 cm²", C: "49 cm²", D: "22 cm²" }, a: "A", e: "Area = πr² = 22/7 × 49 = 154 cm²." },
  { q: "Choose the word nearest in meaning to 'abundant':", o: { A: "Plentiful", B: "Scarce", C: "Tiny", D: "Rare" }, a: "A", e: "Abundant = plentiful." },
  { q: "Which gas is most abundant in the atmosphere?", o: { A: "Nitrogen", B: "Oxygen", C: "Carbon dioxide", D: "Hydrogen" }, a: "A", e: "Nitrogen makes up ~78% of the atmosphere." },
  { q: "The powerhouse of the cell is the:", o: { A: "Mitochondrion", B: "Nucleus", C: "Ribosome", D: "Vacuole" }, a: "A", e: "Mitochondria produce ATP (energy)." },
  { q: "The chemical symbol for sodium is:", o: { A: "Na", B: "So", C: "Sd", D: "N" }, a: "A", e: "Na = natrium (sodium)." },
  { q: "A body moves 100 m in 20 s. Its speed is:", o: { A: "5 m/s", B: "2000 m/s", C: "0.2 m/s", D: "50 m/s" }, a: "A", e: "Speed = distance/time = 100/20 = 5 m/s." },
  { q: "Choose the correctly spelt word:", o: { A: "Receive", B: "Receeve", C: "Receve", D: "Receeve" }, a: "A", e: "'i before e except after c': receive." },
  { q: "The value of 3³ is:", o: { A: "27", B: "9", C: "81", D: "6" }, a: "A", e: "3³ = 3×3×3 = 27." },
  { q: "Which organ pumps blood around the body?", o: { A: "Heart", B: "Lungs", C: "Liver", D: "Kidney" }, a: "A", e: "The heart is the muscular pump of the circulatory system." },
  { q: "Water boils at ___ °C at sea level:", o: { A: "100", B: "0", C: "50", D: "212" }, a: "A", e: "Water boils at 100°C at standard pressure." },
  { q: "The plural of 'analysis' is:", o: { A: "Analyses", B: "Analysises", C: "Analysis", D: "Analysi" }, a: "A", e: "Analysis → analyses (Greek pattern)." },
  { q: "If a = 3 and b = 4, find √(a² + b²).", o: { A: "5", B: "7", C: "25", D: "1" }, a: "A", e: "√(9+16) = √25 = 5." },
  { q: "The process by which plants lose water vapour is:", o: { A: "Transpiration", B: "Respiration", C: "Digestion", D: "Excretion" }, a: "A", e: "Transpiration: water vapour loss through stomata." },
  { q: "Which of these is a vector quantity?", o: { A: "Velocity", B: "Speed", C: "Mass", D: "Time" }, a: "A", e: "Velocity has magnitude + direction (vector)." },
  { q: "Choose the antonym of 'expand':", o: { A: "Contract", B: "Grow", C: "Stretch", D: "Increase" }, a: "A", e: "Expand ↔ contract." },
  { q: "The pH of a neutral solution is:", o: { A: "7", B: "0", C: "14", D: "1" }, a: "A", e: "Neutral pH = 7 at 25°C." },
  { q: "Find the mean of 4, 8, 12, 16.", o: { A: "10", B: "8", C: "12", D: "40" }, a: "A", e: "Mean = (4+8+12+16)/4 = 40/4 = 10." },
  { q: "Which blood group is the universal donor?", o: { A: "O negative", B: "AB positive", C: "A positive", D: "B negative" }, a: "A", e: "O negative red cells lack A, B and Rh antigens → universal donor." },
  { q: "The main gas used in photosynthesis is:", o: { A: "Carbon dioxide", B: "Oxygen", C: "Nitrogen", D: "Hydrogen" }, a: "A", e: "CO2 + water + light → glucose + oxygen." },
  { q: "Solve: 2x − 3 = 7", o: { A: "5", B: "2", C: "10", D: "4" }, a: "A", e: "2x = 10 → x = 5." },
  { q: "The force that opposes motion between surfaces is:", o: { A: "Friction", B: "Gravity", C: "Tension", D: "Magnetism" }, a: "A", e: "Friction opposes relative motion." },
  { q: "Choose the word that is a pronoun:", o: { A: "She", B: "Run", C: "Tall", D: "Quickly" }, a: "A", e: "She is a personal pronoun." },
  { q: "The sum of angles in a triangle is:", o: { A: "180°", B: "360°", C: "90°", D: "270°" }, a: "A", e: "Interior angles of a triangle sum to 180°." },
];

function build(file, subject, items, exam, topic) {
  let data = JSON.parse(fs.readFileSync(`${DIR}/${file}`, "utf8"));
  data = data.filter((q) => q.subject !== subject);
  items.forEach((item, i) => {
    data.push({
      id: `${exam.toLowerCase()}-2026-${subject.toLowerCase().replace(/[^a-z]/g, "")}-${String(i + 1).padStart(3, "0")}`,
      subject,
      topic: topic || "General",
      exam: [exam],
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
  fs.writeFileSync(`${DIR}/${file}`, JSON.stringify(data, null, 2));
  return data.length;
}

// NECO
let n = 0;
n += build("neco.json", "Use of English Language", ENGLISH, "NECO", "Comprehension");
n += build("neco.json", "Economics", ECONOMICS, "NECO", "Microeconomics");
n += build("neco.json", "Government", GOVERNMENT, "NECO", "Constitution");
n += build("neco.json", "English", ENGLISH, "NECO", "Grammar");
console.log("NECO total:", n);

// POST-UTME
let p = 0;
p += build("postutme.json", "Use of English Language", ENGLISH.slice(0, 5), "POST-UTME", "Comprehension");
p += build("postutme.json", "Mathematics", POSTUTME.filter((_, i) => i % 5 === 0).slice(0, 5), "POST-UTME", "Algebra");
p += build("postutme.json", "Physics", POSTUTME.filter((_, i) => i % 5 === 1).slice(0, 5), "POST-UTME", "Mechanics");
p += build("postutme.json", "Chemistry", POSTUTME.filter((_, i) => i % 5 === 2).slice(0, 5), "POST-UTME", "Matter");
p += build("postutme.json", "Biology", POSTUTME.filter((_, i) => i % 5 === 3).slice(0, 5), "POST-UTME", "Life Processes");
console.log("POST-UTME total:", p);