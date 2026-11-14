// Logic games data — trivia, brain teasers, puzzles.
export const TRIVIA_QUESTIONS = [
  { q: "What is the largest planet in our solar system?", o: ["Jupiter", "Saturn", "Neptune", "Earth"], a: 0, category: "Science" },
  { q: "Who wrote 'Things Fall Apart'?", o: ["Wole Soyinka", "Chinua Achebe", "Ben Okri", "Femi Osofisan"], a: 1, category: "Literature" },
  { q: "What is the chemical symbol for gold?", o: ["Ag", "Au", "Gd", "Go"], a: 1, category: "Chemistry" },
  { q: "Which planet is known as the Red Planet?", o: ["Venus", "Mars", "Jupiter", "Mercury"], a: 1, category: "Science" },
  { q: "What is the capital of Nigeria?", o: ["Lagos", "Abuja", "Kano", "Port Harcourt"], a: 1, category: "Geography" },
  { q: "Who developed the theory of relativity?", o: ["Newton", "Einstein", "Galileo", "Hawking"], a: 1, category: "Physics" },
  { q: "What is the square root of 144?", o: ["10", "12", "14", "16"], a: 1, category: "Mathematics" },
  { q: "Which gas do plants absorb from the atmosphere?", o: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], a: 2, category: "Biology" },
  { q: "How many sides does a hexagon have?", o: ["5", "6", "7", "8"], a: 1, category: "Mathematics" },
  { q: "Who painted the 'Mona Lisa'?", o: ["Van Gogh", "Picasso", "Leonardo da Vinci", "Michelangelo"], a: 2, category: "Art" },
  { q: "What is the largest ocean on Earth?", o: ["Atlantic", "Indian", "Arctic", "Pacific"], a: 3, category: "Geography" },
  { q: "Which organ pumps blood around the body?", o: ["Lungs", "Heart", "Liver", "Kidney"], a: 1, category: "Biology" },
  { q: "What is 15% of 200?", o: ["20", "25", "30", "35"], a: 2, category: "Mathematics" },
  { q: "Which language has the most native speakers?", o: ["English", "Mandarin Chinese", "Spanish", "Hindi"], a: 1, category: "Language" },
  { q: "What is the hardest natural substance?", o: ["Gold", "Iron", "Diamond", "Quartz"], a: 2, category: "Science" },
  { q: "Who was the first President of Nigeria?", o: ["Obafemi Awolowo", "Nnamdi Azikiwe", "Tafawa Balewa", "Yakubu Gowon"], a: 1, category: "History" },
  { q: "What does 'H2O' stand for?", o: ["Salt", "Water", "Oxygen", "Hydrogen peroxide"], a: 1, category: "Chemistry" },
  { q: "Which is the smallest prime number?", o: ["0", "1", "2", "3"], a: 2, category: "Mathematics" },
  { q: "What is the fastest land animal?", o: ["Lion", "Cheetah", "Horse", "Greyhound"], a: 1, category: "Biology" },
  { q: "In which year did Nigeria gain independence?", o: ["1957", "1960", "1963", "1970"], a: 1, category: "History" },
];

export const BRAIN_TEASERS = [
  { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", a: "An echo", hint: "You hear it in canyons and empty halls." },
  { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps", hint: "You make them when you walk." },
  { q: "What has keys but can't open locks?", a: "A piano", hint: "It makes music." },
  { q: "What gets wetter the more it dries?", a: "A towel", hint: "You use it after a bath." },
  { q: "What has a head and a tail but no body?", a: "A coin", hint: "You flip it." },
  { q: "What comes once in a minute, twice in a moment, but never in a thousand years?", a: "The letter M", hint: "Look at the spelling." },
  { q: "What has cities but no houses, forests but no trees, and rivers but no water?", a: "A map", hint: "You use it to find places." },
  { q: "What can travel around the world while staying in a corner?", a: "A stamp", hint: "It goes on letters." },
  { q: "What has a neck but no head?", a: "A bottle", hint: "You drink from it." },
  { q: "What is full of holes but still holds water?", a: "A sponge", hint: "You use it to clean." },
];

export const RIDDLES = [
  { q: "What has to be broken before you can use it?", a: "An egg", hint: "You cook it." },
  { q: "I'm tall when I'm young, and I'm short when I'm old. What am I?", a: "A candle", hint: "It melts." },
  { q: "What month of the year has 28 days?", a: "All of them", hint: "Read carefully." },
  { q: "What is so fragile that saying its name breaks it?", a: "Silence", hint: "You hear it in libraries." },
  { q: "What can you catch but not throw?", a: "A cold", hint: "It makes you sneeze." },
  { q: "What goes up but never comes down?", a: "Your age", hint: "It changes every birthday." },
  { q: "What has one eye but can't see?", a: "A needle", hint: "You use it to sew." },
  { q: "What has many teeth but can't bite?", a: "A comb", hint: "You use it on hair." },
  { q: "What runs but never walks, has a bed but never sleeps?", a: "A river", hint: "It flows." },
  { q: "What can fill a room but takes up no space?", a: "Light", hint: "You turn it on." },
];

export const PATTERNS = [
  { seq: "2, 4, 8, 16, ?", answer: "32", rule: "Each number doubles." },
  { seq: "1, 1, 2, 3, 5, 8, ?", answer: "13", rule: "Fibonacci: add the two before." },
  { seq: "3, 6, 11, 18, 27, ?", answer: "38", rule: "Add 3, 5, 7, 9, 11…" },
  { seq: "1, 4, 9, 16, 25, ?", answer: "36", rule: "Perfect squares." },
  { seq: "2, 3, 5, 7, 11, ?", answer: "13", rule: "Prime numbers." },
  { seq: "100, 50, 25, ?", answer: "12.5", rule: "Each is halved." },
  { seq: "1, 8, 27, 64, ?", answer: "125", rule: "Perfect cubes." },
  { seq: "A, C, E, G, ?", answer: "I", rule: "Skip one letter each time." },
  { seq: "Z, X, V, T, ?", answer: "R", rule: "Skip one letter backward." },
  { seq: "1, 2, 6, 24, 120, ?", answer: "720", rule: "Factorials: ×2, ×3, ×4, ×5, ×6." },
];

export const GAME_CATEGORIES = [
  { id: "trivia", label: "Trivia", desc: "Test your knowledge across subjects", icon: "🧠" },
  { id: "teasers", label: "Brain Teasers", desc: "Riddles that make you think", icon: "💡" },
  { id: "patterns", label: "Patterns", desc: "Find the next number in the sequence", icon: "🔢" },
  { id: "chess", label: "Chess", desc: "Play chess against AI (10 levels)", icon: "♟️" },
];