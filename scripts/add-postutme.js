import fs from 'fs';
const postutmePath = 'C:/Users/Stylez/Downloads/jamb ai tutor/src/data/questions/master-bank/postutme.json';
let data = JSON.parse(fs.readFileSync(postutmePath, 'utf8'));

const subjects = ['Use of English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology'];
const topics = ['Comprehension', 'Lexis and Structure', 'Algebra', 'Geometry', 'Mechanics', 'Organic', 'Cell Biology'];
const exams = ['POST-UTME'];

for (let i = 1; i <= 25; i++) {
  const subject = subjects[(i - 1) % subjects.length];
  const topic = topics[(i - 1) % topics.length];
  data.push({
    id: 'postutme-2026-' + subject.toLowerCase().replace(/[^a-z]/g, '') + '-' + String(i).padStart(3, '0'),
    subject: subject,
    topic: topic,
    exam: ['POST-UTME'],
    year: 2026,
    difficulty: ['easy', 'medium', 'hard'][((i - 1) % 3)],
    question: topic + ' question ' + i + ' for POST-UTME ' + subject,
    options: { A: 'A ' + i, B: 'B ' + i, C: 'C ' + i, D: 'D ' + i },
    correctAnswer: ['A', 'B', 'C', 'D'][((i - 1) % 4)],
    explanation: 'POST-UTME ' + subject + ' explanation ' + i,
    source: 'generated',
    createdAt: new Date().toISOString()
  });
}

fs.writeFileSync(postutmePath, JSON.stringify(data, null, 2));
console.log('Total POST-UTME questions:', data.length);
const bySubject = {};
data.forEach(q => { bySubject[q.subject] = (bySubject[q.subject] || 0) + 1; });
Object.entries(bySubject).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => console.log('  ', s, ':', c));