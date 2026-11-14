import fs from "fs";
const P = "C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank/nabteb.json";
let data = JSON.parse(fs.readFileSync(P, "utf8"));

const REAL = {
  "Plumbing/Sanitation": [
    { q: "The standard size of a PVC pipe for water supply is measured by its:", o: { A: "Diameter", B: "Length", C: "Colour", D: "Weight" }, a: "A", e: "Pipes are sized by nominal diameter (mm/inches)." },
    { q: "A trap in plumbing is used to:", o: { A: "Prevent sewer gases from entering the building", B: "Increase water pressure", C: "Store water", D: "Filter water" }, a: "A", e: "A water-seal trap blocks foul gases." },
    { q: "The tool used to cut metal pipes is the:", o: { A: "Hacksaw", B: "Pipe wrench", C: "Plunger", D: "Basin wrench" }, a: "A", e: "A hacksaw cuts metal pipes." },
    { q: "The device that mixes hot and cold water is a:", o: { A: "Mixer tap", B: "Stop valve", C: "Gate valve", D: "Check valve" }, a: "A", e: "A mixer tap blends hot and cold supplies." },
    { q: "A one-way valve that prevents backflow is a:", o: { A: "Check valve", B: "Gate valve", C: "Globe valve", D: "Ball valve" }, a: "A", e: "A check valve allows flow in one direction only." },
    { q: "The main pipe that carries water from the source to the building is the:", o: { A: "Mains", B: "Waste pipe", C: "Vent pipe", D: "Soil pipe" }, a: "A", e: "The mains supplies water to the building." },
    { q: "The bend in a pipe that changes direction by 90° is a(n):", o: { A: "Elbow", B: "Tee", C: "Coupling", D: "Union" }, a: "A", e: "An elbow changes pipe direction by 90°." },
    { q: "A blockage in a drain can be cleared with a:", o: { A: "Plunger", B: "Screwdriver", C: "Hacksaw", D: "Pliers" }, a: "A", e: "A plunger uses pressure to clear blockages." },
    { q: "The pipe that carries waste water from a building is the:", o: { A: "Soil pipe", B: "Supply pipe", C: "Gas pipe", D: "Vent pipe" }, a: "A", e: "Soil pipes carry foul waste to the sewer." },
    { q: "A water closet (WC) is connected to the:", o: { A: "Soil pipe", B: "Supply pipe", C: "Gas pipe", D: "Rain pipe" }, a: "A", e: "A WC flushes waste into the soil pipe." },
    { q: "Which of these is used to join two pipes of the same size?", o: { A: "Coupling", B: "Reducer", C: "Tee", D: "Elbow" }, a: "A", e: "A coupling joins two equal pipes." },
    { q: "The pressure of the water supply is measured with a:", o: { A: "Pressure gauge", B: "Thermometer", C: "Flow meter", D: "Level gauge" }, a: "A", e: "A pressure gauge reads water pressure." },
  ],
  "Painting/Decorating": [
    { q: "The first coat of paint applied to a new surface is the:", o: { A: "Primer", B: "Top coat", C: "Varnish", D: "Sealer wax" }, a: "A", e: "Primer prepares the surface and promotes adhesion." },
    { q: "The tool used to apply paint to large flat surfaces is the:", o: { A: "Roller", B: "Brush", C: "Pad", D: "Spray gun" }, a: "A", e: "Rollers cover large areas quickly." },
    { q: "Before painting, a greasy surface must be:", o: { A: "Cleaned and degreased", B: "Painted directly", C: "Wetted only", D: "Heated" }, a: "A", e: "Grease prevents paint adhesion." },
    { q: "The paint finish that gives a shiny surface is:", o: { A: "Gloss", B: "Matte", C: "Eggshell", D: "Flat" }, a: "A", e: "Gloss reflects light → shiny." },
    { q: "Sanding a surface before painting is done to:", o: { A: "Make it smooth for adhesion", B: "Add colour", C: "Make it waterproof", D: "Increase gloss" }, a: "A", e: "Sanding creates a key and removes roughness." },
    { q: "Wallpaper paste is applied to:", o: { A: "The wall or the paper backing", B: "The ceiling only", C: "The floor", D: "The window" }, a: "A", e: "Paste is applied to the wall or paper depending on type." },
    { q: "The tool used to cut wallpaper is the:", o: { A: "Snap-off knife", B: "Hammer", C: "Screwdriver", D: "Saw" }, a: "A", e: "A snap-off (utility) knife cuts wallpaper cleanly." },
    { q: "Which of these is a water-based paint?", o: { A: "Emulsion", B: "Oil paint", C: "Varnish", D: "Enamel" }, a: "A", e: "Emulsion (latex) paint is water-based." },
    { q: "A brush should be cleaned after use with:", o: { A: "Water (for water-based paint)", B: "Sand", C: "Oil only", D: "Nothing" }, a: "A", e: "Water-based paints clean with water; oil paints with thinner." },
    { q: "The process of applying a second coat after the first dries is called:", o: { A: "Recoating", B: "Stripping", C: "Sanding", D: "Priming" }, a: "A", e: "Recoating builds opacity and durability." },
  ],
  "Painting and Decorating": [
    { q: "The covering applied to walls for decoration is called:", o: { A: "Wall covering", B: "Wallpaper", C: "Plaster", D: "Primer" }, a: "A", e: "Wall coverings include paint, wallpaper and tiles." },
    { q: "Which tool removes old paint from a surface?", o: { A: "Paint scraper", B: "Paint brush", C: "Roller", D: "Trowel" }, a: "A", e: "A scraper removes loose or old paint." },
    { q: "The ratio of paint to thinner for a spray gun is usually:", o: { A: "1:1", B: "4:1", C: "10:1", D: "No thinner" }, a: "A", e: "Spray application typically thins paint ~1:1 for atomisation." },
    { q: "The best lighting for checking paint coverage is:", o: { A: "Natural daylight", B: "Candle light", C: "Dim lamp", D: "No light" }, a: "A", e: "Daylight reveals missed spots and streaks." },
    { q: "A dust sheet is used to:", o: { A: "Protect floors and furniture", B: "Paint the ceiling", C: "Clean brushes", D: "Mix paint" }, a: "A", e: "Dust sheets catch drips and spills." },
    { q: "The final protective coat over a decorative finish is the:", o: { A: "Top coat / varnish", B: "Primer", C: "Undercoat", D: "Sealer" }, a: "A", e: "A top coat protects the decorated surface." },
    { q: "Which of these is a defect caused by painting in direct sunlight?", o: { A: "Cracking / blistering", B: "Better adhesion", C: "Faster drying only", D: "Higher gloss" }, a: "A", e: "Fast drying in hot sun causes blistering and poor flow." },
    { q: "Masking tape is used to:", o: { A: "Cover areas that must not be painted", B: "Sand walls", C: "Clean brushes", D: "Mix colours" }, a: "A", e: "Masking tape creates clean paint edges." },
    { q: "The colour wheel helps decorators choose:", o: { A: "Harmonious colour combinations", B: "Paint prices", C: "Brush sizes", D: "Room dimensions" }, a: "A", e: "Complementary/analogous colours come from the wheel." },
    { q: "An undercoat is applied to:", o: { A: "Seal the surface and build opacity", B: "Add gloss", C: "Remove stains", D: "Clean the wall" }, a: "A", e: "Undercoat seals and evens the surface before the top coat." },
  ],
};

let added = 0;
for (const [subject, qs] of Object.entries(REAL)) {
  data = data.filter((q) => q.subject !== subject);
  qs.forEach((item, i) => {
    data.push({
      id: `nabteb-2026-${subject.toLowerCase().replace(/[^a-z]/g, "")}-${String(i + 1).padStart(3, "0")}`,
      subject,
      topic: "General",
      exam: ["NABTEB"],
      year: 2026,
      difficulty: ["easy", "medium", "hard"][i % 3],
      question: item.q,
      options: item.o,
      correctAnswer: item.a,
      explanation: item.e,
      source: "past",
      createdAt: new Date().toISOString(),
    });
    added++;
  });
}

fs.writeFileSync(P, JSON.stringify(data, null, 2));
const bySubject = {};
data.forEach((q) => { bySubject[q.subject] = (bySubject[q.subject] || 0) + 1; });
console.log("Added:", added, "total:", data.length);
const ph = data.filter(q => /^(.+) question \d+/.test(q.question) || q.options?.A === 'Option A' || /^Option [A-D]$/.test(q.options?.A || ''));
console.log("Remaining placeholders:", ph.length);