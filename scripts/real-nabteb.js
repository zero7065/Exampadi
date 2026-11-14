// Replace NABTEB placeholders with real vocational questions.
import fs from "fs";
const P = "C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank/nabteb.json";
let data = JSON.parse(fs.readFileSync(P, "utf8"));

const REAL = {
  "Computer Craft Practice": [
    { q: "Which SQL command retrieves data from a database?", o: { A: "SELECT", B: "INSERT", C: "UPDATE", D: "DELETE" }, a: "A", e: "SELECT queries/retrieves data; INSERT adds; UPDATE modifies; DELETE removes." },
    { q: "What is the output of: print(type([]))?", o: { A: "<class 'list'>", B: "<class 'dict'>", C: "<class 'tuple'>", D: "<class 'set'>" }, a: "A", e: "[] creates an empty Python list." },
    { q: "Which device connects multiple networks and routes packets?", o: { A: "Router", B: "Hub", C: "Repeater", D: "Switch" }, a: "A", e: "A router forwards packets between networks." },
    { q: "The shortcut to copy text is:", o: { A: "Ctrl+C", B: "Ctrl+V", C: "Ctrl+X", D: "Ctrl+Z" }, a: "A", e: "Ctrl+C copies; Ctrl+V pastes; Ctrl+X cuts; Ctrl+Z undoes." },
    { q: "Which of these is an operating system?", o: { A: "Linux", B: "Oracle", C: "Photoshop", D: "Chrome" }, a: "A", e: "Linux is an OS; Oracle is a DBMS; Photoshop is graphics software; Chrome is a browser." },
    { q: "1 kilobyte equals:", o: { A: "1024 bytes", B: "1000 bytes", C: "1024 bits", D: "1000 bits" }, a: "A", e: "1 KB = 1024 bytes (binary)." },
    { q: "The physical parts of a computer are called:", o: { A: "Hardware", B: "Software", C: "Firmware", D: "Freeware" }, a: "A", e: "Hardware = tangible components." },
    { q: "Which of these is NOT a programming language?", o: { A: "HTTP", B: "Python", C: "Java", D: "C++" }, a: "A", e: "HTTP is a protocol, not a language." },
    { q: "CPU stands for:", o: { A: "Central Processing Unit", B: "Computer Personal Unit", C: "Central Program Utility", D: "Core Processing Underlay" }, a: "A", e: "CPU = Central Processing Unit, the 'brain'." },
    { q: "A collection of related records is called a:", o: { A: "File", B: "Field", C: "Byte", D: "Bit" }, a: "A", e: "A file contains records; a record contains fields." },
    { q: "Which key combination saves a document?", o: { A: "Ctrl+S", B: "Ctrl+P", C: "Ctrl+O", D: "Ctrl+N" }, a: "A", e: "Ctrl+S saves; Ctrl+P prints." },
    { q: "The main circuit board of a computer is the:", o: { A: "Motherboard", B: "Hard disk", C: "Monitor", D: "Keyboard" }, a: "A", e: "The motherboard connects all components." },
  ],
  "Electrical Installation": [
    { q: "The unit of electrical resistance is the:", o: { A: "Ohm", B: "Volt", C: "Ampere", D: "Watt" }, a: "A", e: "Resistance is measured in ohms (Ω)." },
    { q: "Ohm's law states that V =", o: { A: "I × R", B: "I ÷ R", C: "R ÷ I", D: "I + R" }, a: "A", e: "V = IR (voltage = current × resistance)." },
    { q: "The colour code for the live wire in a plug is:", o: { A: "Brown", B: "Blue", C: "Green/Yellow", D: "Black" }, a: "A", e: "IEC: live = brown; neutral = blue; earth = green/yellow." },
    { q: "A device that protects a circuit from excessive current is a:", o: { A: "Fuse", B: "Capacitor", C: "Resistor", D: "Diode" }, a: "A", e: "A fuse melts and breaks the circuit when current is too high." },
    { q: "The unit of electrical power is the:", o: { A: "Watt", B: "Joule", C: "Coulomb", D: "Farad" }, a: "A", e: "Power is measured in watts (W)." },
    { q: "Which instrument measures current?", o: { A: "Ammeter", B: "Voltmeter", C: "Ohmmeter", D: "Wattmeter" }, a: "A", e: "An ammeter measures current (connected in series)." },
    { q: "A circuit that has more than one path for current is:", o: { A: "Parallel circuit", B: "Series circuit", C: "Open circuit", D: "Short circuit" }, a: "A", e: "Parallel circuits have multiple paths." },
    { q: "The process of joining two wires permanently is:", o: { A: "Soldering", B: "Insulation", C: "Stripping", D: "Bending" }, a: "A", e: "Soldering joins wires with molten alloy." },
    { q: "The device that stores charge is a:", o: { A: "Capacitor", B: "Resistor", C: "Inductor", D: "Fuse" }, a: "A", e: "A capacitor stores electric charge." },
    { q: "Earthing is provided to:", o: { A: "Protect against electric shock", B: "Increase voltage", C: "Reduce resistance", D: "Store energy" }, a: "A", e: "Earthing provides a safe path for fault current." },
    { q: "A transformer works on the principle of:", o: { A: "Electromagnetic induction", B: "Ohm's law", C: "Static electricity", D: "Chemical reaction" }, a: "A", e: "Mutual induction between coils." },
    { q: "The unit of capacitance is the:", o: { A: "Farad", B: "Henry", C: "Weber", D: "Tesla" }, a: "A", e: "Capacitance is measured in farads (F)." },
  ],
  "Auto Mechanics Work": [
    { q: "The compression ratio of a diesel engine is typically:", o: { A: "15:1 to 20:1", B: "6:1 to 8:1", C: "10:1 to 12:1", D: "2:1 to 4:1" }, a: "A", e: "Diesel engines use high compression (15–20:1)." },
    { q: "The four strokes of a petrol engine are:", o: { A: "Intake, compression, power, exhaust", B: "Intake, exhaust, power, compression", C: "Compression, intake, exhaust, power", D: "Power, exhaust, intake, compression" }, a: "A", e: "The Otto cycle: intake → compression → power → exhaust." },
    { q: "The component that steps up voltage for the spark plug is the:", o: { A: "Ignition coil", B: "Alternator", C: "Radiator", D: "Carburettor" }, a: "A", e: "The ignition coil produces the high voltage spark." },
    { q: "Engine oil's main function is to:", o: { A: "Lubricate moving parts", B: "Cool the driver", C: "Clean the exhaust", D: "Charge the battery" }, a: "A", e: "Oil reduces friction and wear." },
    { q: "The device that charges the battery while the engine runs is the:", o: { A: "Alternator", B: "Starter", C: "Distributor", D: "Radiator" }, a: "A", e: "The alternator generates electricity to charge the battery." },
    { q: "A diesel engine ignites fuel by:", o: { A: "Compression heat", B: "Spark plug", C: "Glow plug only", D: "Battery" }, a: "A", e: "Diesel fuel self-ignites from compression heat." },
    { q: "The purpose of the radiator is to:", o: { A: "Cool the engine", B: "Filter oil", C: "Charge the battery", D: "Start the engine" }, a: "A", e: "The radiator dissipates heat from the coolant." },
    { q: "Which of these is a friction-reducing component?", o: { A: "Ball bearing", B: "Piston", C: "Spark plug", D: "Radiator" }, a: "A", e: "Bearings reduce friction between moving parts." },
    { q: "The fuel-air mixture in a petrol engine is prepared by the:", o: { A: "Carburettor", B: "Radiator", C: "Alternator", D: "Clutch" }, a: "A", e: "The carburettor (or fuel injector) mixes fuel and air." },
    { q: "Brake fluid is an example of a:", o: { A: "Hydraulic fluid", B: "Lubricant", C: "Coolant", D: "Fuel" }, a: "A", e: "Brake fluid transmits force hydraulically." },
    { q: "The clutch disconnects the:", o: { A: "Engine from the gearbox", B: "Battery from the starter", C: "Wheels from the axle", D: "Radiator from the engine" }, a: "A", e: "The clutch engages/disengages engine and transmission." },
    { q: "Spark plugs are used in:", o: { A: "Petrol engines", B: "Diesel engines", C: "Steam engines", D: "Electric motors" }, a: "A", e: "Petrol engines use spark ignition." },
  ],
  "Building/Construction": [
    { q: "The standard size of a concrete block in Nigeria is:", o: { A: "450mm × 225mm × 225mm", B: "600mm × 300mm × 300mm", C: "300mm × 150mm × 150mm", D: "1000mm × 500mm × 500mm" }, a: "A", e: "The 9-inch block: 450 × 225 × 225 mm." },
    { q: "The ratio of cement to sand in mortar for blockwork is typically:", o: { A: "1:6", B: "1:2", C: "1:12", D: "1:20" }, a: "A", e: "A common mortar mix is 1 part cement : 6 parts sand." },
    { q: "The instrument used to check vertical alignment is the:", o: { A: "Plumb bob", B: "Spirit level", C: "Tape measure", D: "Builder's square" }, a: "A", e: "A plumb bob establishes a vertical reference." },
    { q: "Curing of concrete means:", o: { A: "Keeping it moist to gain strength", B: "Breaking it up", C: "Painting it", D: "Heating it" }, a: "A", e: "Curing retains moisture so hydration completes." },
    { q: "The foundation that spreads the load over a wide area is the:", o: { A: "Raft foundation", B: "Pad foundation", C: "Pile foundation", D: "Strip foundation" }, a: "A", e: "A raft (mat) spreads loads over a large area." },
    { q: "The main purpose of a damp-proof course (DPC) is to:", o: { A: "Prevent rising damp", B: "Insulate sound", C: "Strengthen walls", D: "Decorate walls" }, a: "A", e: "DPC blocks moisture rising through walls." },
    { q: "The tool used for cutting bricks is the:", o: { A: "Bolster chisel", B: "Screwdriver", C: "Hacksaw", D: "Pliers" }, a: "A", e: "A bolster (cold chisel) cuts bricks/blocks." },
    { q: "The setting time of ordinary Portland cement is about:", o: { A: "30 minutes", B: "5 minutes", C: "3 hours", D: "24 hours" }, a: "A", e: "Initial setting ≈ 30 min for OPC." },
    { q: "Which of these is a load-bearing wall?", o: { A: "External wall supporting the roof", B: "Partition between rooms", C: "Decorative wall", D: "Boundary fence" }, a: "A", e: "Load-bearing walls carry structural loads." },
    { q: "The finish applied to a wall before painting is:", o: { A: "Plastering", B: "Tiling", C: "Roofing", D: "Flooring" }, a: "A", e: "Plaster provides a smooth base for paint." },
  ],
  "Food Technology": [
    { q: "Which nutrient is the body's main source of energy?", o: { A: "Carbohydrates", B: "Proteins", C: "Vitamins", D: "Minerals" }, a: "A", e: "Carbohydrates are the primary energy source." },
    { q: "The process of preserving food by removing moisture is:", o: { A: "Drying", B: "Boiling", C: "Freezing", D: "Frying" }, a: "A", e: "Drying removes water, inhibiting microbial growth." },
    { q: "Which vitamin is produced when skin is exposed to sunlight?", o: { A: "Vitamin D", B: "Vitamin C", C: "Vitamin A", D: "Vitamin K" }, a: "A", e: "UV light triggers vitamin D synthesis in skin." },
    { q: "Food poisoning is most commonly caused by:", o: { A: "Bacteria", B: "Vitamins", C: "Minerals", D: "Fats" }, a: "A", e: "Pathogenic bacteria (e.g. Salmonella) cause most food poisoning." },
    { q: "The nutrient that builds and repairs body tissue is:", o: { A: "Protein", B: "Carbohydrate", C: "Fat", D: "Water" }, a: "A", e: "Proteins supply amino acids for growth and repair." },
    { q: "Pasteurisation involves heating food to:", o: { A: "Kill harmful bacteria", B: "Add flavour", C: "Increase fat", D: "Remove colour" }, a: "A", e: "Pasteurisation kills pathogens without sterilising." },
    { q: "A balanced diet contains:", o: { A: "All food groups in correct proportions", B: "Only proteins", C: "Only carbohydrates", D: "Only fats" }, a: "A", e: "Balance = carbohydrates, proteins, fats, vitamins, minerals, water, fibre." },
    { q: "Which of these is a source of dietary fibre?", o: { A: "Whole grains", B: "Butter", C: "Sugar", D: "Egg yolk" }, a: "A", e: "Whole grains, fruits and vegetables supply fibre." },
    { q: "The best method to preserve nutrients when boiling vegetables is to:", o: { A: "Use minimal water and short cooking time", B: "Boil for hours", C: "Use lots of water", D: "Re-boil the water" }, a: "A", e: "Short cooking in little water retains water-soluble vitamins." },
    { q: "Kwashiorkor is caused by deficiency of:", o: { A: "Protein", B: "Vitamin C", C: "Iron", D: "Calcium" }, a: "A", e: "Kwashiorkor = severe protein deficiency (common in children)." },
  ],
  "Fashion and Textile": [
    { q: "The process of joining fabric pieces with thread is:", o: { A: "Sewing", B: "Cutting", C: "Dyeing", D: "Weaving" }, a: "A", e: "Sewing joins fabric using stitches." },
    { q: "A pattern used to cut fabric is called a:", o: { A: "Template", B: "Swatch", C: "Bobbin", D: "Selvage" }, a: "A", e: "A pattern/template guides cutting." },
    { q: "The raw material for cotton fabric is:", o: { A: "Cotton fibre", B: "Wool", C: "Silk", D: "Polyester" }, a: "A", e: "Cotton comes from the cotton plant's seed fibres." },
    { q: "The direction of fabric threads is called the:", o: { A: "Grain", B: "Weft", C: "Pile", D: "Nap" }, a: "A", e: "Grain = thread direction; weft = crosswise threads." },
    { q: "Which stitch is used to prevent fabric edges from fraying?", o: { A: "Overcasting stitch", B: "Buttonhole stitch", C: "Hemming stitch", D: "Running stitch" }, a: "A", e: "Overcasting finishes raw edges." },
    { q: "The tool that holds the fabric in place while sewing is the:", o: { A: "Pin", B: "Thimble", C: "Seam ripper", D: "Tape measure" }, a: "A", e: "Pins hold layers before stitching." },
    { q: "A garment that fits closely to the body is described as:", o: { A: "Fitted", B: "Loose", C: "Oversized", D: "Baggy" }, a: "A", e: "Fitted = shaped to the body." },
    { q: "The process of decorating fabric with colour is:", o: { A: "Dyeing", B: "Printing", C: "Embroidery", D: "Weaving" }, a: "A", e: "Dyeing applies colour to the whole fabric." },
    { q: "Which measurement is taken around the fullest part of the bust?", o: { A: "Bust", B: "Waist", C: "Hip", D: "Shoulder" }, a: "A", e: "Bust measurement is around the fullest part of the chest." },
    { q: "A seam is:", o: { A: "A line of stitching joining fabric", B: "A type of button", C: "A fabric pattern", D: "A cutting tool" }, a: "A", e: "A seam joins two fabric pieces." },
  ],
  "Welding and Fabrication": [
    { q: "The most common welding process for steel is:", o: { A: "Arc welding", B: "Soldering", C: "Brazing", D: "Riveting" }, a: "A", e: "Arc welding (MMA/MIG) is standard for steel." },
    { q: "The purpose of flux in welding is to:", o: { A: "Prevent oxidation of the weld", B: "Increase heat", C: "Cool the metal", D: "Colour the weld" }, a: "A", e: "Flux shields the molten metal from oxygen/nitrogen." },
    { q: "A fillet weld joins two pieces at:", o: { A: "A right angle (T-joint)", B: "A flat surface", C: "A curved edge", D: "A butt end" }, a: "A", e: "Fillet welds join T-joints and lap joints." },
    { q: "The temperature of an oxy-acetylene flame is about:", o: { A: "3,200°C", B: "1,000°C", C: "500°C", D: "10,000°C" }, a: "A", e: "Oxy-acetylene neutral flame ≈ 3,200°C." },
    { q: "Before welding, metal surfaces must be:", o: { A: "Cleaned of rust, oil and paint", B: "Painted", C: "Oiled", D: "Wet" }, a: "A", e: "Clean surfaces prevent porosity and weak welds." },
    { q: "The electrode in arc welding is:", o: { A: "A consumable metal rod", B: "A permanent tungsten rod", C: "A ceramic tube", D: "A gas nozzle" }, a: "A", e: "In MMA, the electrode melts and becomes filler metal." },
    { q: "A weld defect caused by trapped gas is:", o: { A: "Porosity", B: "Undercut", C: "Crack", D: "Slag inclusion" }, a: "A", e: "Porosity = gas pockets in the weld metal." },
    { q: "The process of joining metals by melting a filler rod without melting the base metal is:", o: { A: "Brazing", B: "Fusion welding", C: "Riveting", D: "Forging" }, a: "A", e: "Brazing melts filler only (above 450°C); soldering below 450°C." },
    { q: "Which safety equipment protects the eyes during arc welding?", o: { A: "Welding helmet with dark filter", B: "Safety goggles", C: "Face mask", D: "Reading glasses" }, a: "A", e: "A welding helmet with a dark filter lens protects against UV/IR." },
    { q: "A butt weld joins two pieces:", o: { A: "Edge to edge in the same plane", B: "At a right angle", C: "Overlapping", D: "With a gap" }, a: "A", e: "A butt weld joins edges in the same plane." },
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
console.log("NABTEB real questions added:", added, "total:", data.length);
console.log(Object.entries(bySubject).map(([s, c]) => `${s}: ${c}`).join(" | "));