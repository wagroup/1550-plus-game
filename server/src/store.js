import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load(name, fallback) {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function save(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Simple persistent collections. Fine for an MVP running on a single node.
export const db = {
  teachers: load('teachers', []),
  sessions: load('sessions', {}), // token -> teacherId
  questionSets: load('questionSets', []),
  games: load('games', []), // game definitions (settings, teams config)
  reports: load('reports', []),

  saveTeachers() { save('teachers', this.teachers); },
  saveSessions() { save('sessions', this.sessions); },
  saveQuestionSets() { save('questionSets', this.questionSets); },
  saveGames() { save('games', this.games); },
  saveReports() { save('reports', this.reports); },
};
