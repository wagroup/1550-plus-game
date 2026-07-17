import crypto from 'crypto';
import { db } from './store.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

export function createSession(teacherId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = teacherId;
  db.saveSessions();
  return token;
}

export function destroySession(token) {
  delete db.sessions[token];
  db.saveSessions();
}

export function getTeacherByToken(token) {
  const teacherId = db.sessions[token];
  if (!teacherId) return null;
  return db.teachers.find((t) => t.id === teacherId) || null;
}

/** Express middleware requiring a valid teacher session. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const teacher = token ? getTeacherByToken(token) : null;
  if (!teacher) return res.status(401).json({ error: 'Not signed in' });
  req.teacher = teacher;
  req.token = token;
  next();
}
