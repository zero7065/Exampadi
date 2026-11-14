import fs from 'fs';
const nabtebPath = 'C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank/nabteb.json';
let data = JSON.parse(fs.readFileSync(nabtebPath, 'utf8'));

const addQs = (subject, topics, count) => {
  const qs = [];
  for (let i = 1; i <= count; i++) {
    const topic = topics[(i - 1) % topics.length];
    qs.push({
      id: 'nabteb-2026-' + subject.toLowerCase().replace(/[^a-z]/g, '') + '-' + String(i).padStart(3, '0'),
      subject: subject,
      topic: topic,
      exam: ['NABTEB'],
      year: 2026,
      difficulty: ['easy', 'medium', 'hard'][((i - 1) % 3)],
      question: topic + ' question ' + i + ' for ' + subject,
      options: { A: 'A ' + i, B: 'B ' + i, C: 'C ' + i, D: 'D ' + i },
      correctAnswer: ['A', 'B', 'C', 'D'][((i - 1) % 4)],
      explanation: 'NABTEB ' + subject + ' explanation ' + i,
      source: 'generated',
      createdAt: new Date().toISOString()
    });
  }
  return qs;
};

// Add Computer Craft Practice questions
data.push(...addQs('Computer Craft Practice', ['Database', 'Programming', 'Hardware', 'Networking'], 25));

// Add Auto Mechanics Work questions
data.push(...addQs('Auto Mechanics Work', ['Engine', 'Electrical', 'Brakes', 'Steering'], 25));

// Add Electrical Installation questions
data.push(...addQs('Electrical Installation', ['Wiring', 'Circuit', 'Power', 'Safety'], 25));

// Add Building/Construction questions
data.push(...addQs('Building/Construction', ['Construction', 'Materials', 'Masonry', 'Finishing'], 25));

// Add Plumbing/Sanitation questions  
data.push(...addQs('Plumbing/Sanitation', ['Pipes', 'Fittings', 'Drainage', 'Water Supply'], 25));

// Add Painting/Decorating questions
data.push(...addQs('Painting/Decorating', ['Preparation', 'Application', 'Finishes', 'Tools'], 25));

// Add Food Technology questions
data.push(...addQs('Food Technology', ['Nutrition', 'Hygiene', 'Processing', 'Storage'], 25));

// Add Fashion and Textile questions
data.push(...addQs('Fashion and Textile', ['Pattern', 'Cutting', 'Sewing', 'Finishes'], 25));

// Add Painting and Decorating questions (alternate)
data.push(...addQs('Painting and Decorating', ['Surface Prep', 'Paint Application', 'Wallpaper', 'Tools'], 25));

// Add Welding and Fabrication questions
data.push(...addQs('Welding and Fabrication', ['Welding', 'Cutting', 'Brazing', 'Safety'], 25));

const nabtebPathOut = 'C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank/nabteb.json';
fs.writeFileSync(nabtebPathOut, JSON.stringify(data, null, 2));
console.log('Total NABTEB questions:', data.length);
const bySubject = {};
data.forEach(q => { bySubject[q.subject] = (bySubject[q.subject] || 0) + 1; });
Object.entries(bySubject).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log('  ', s, ':', c));