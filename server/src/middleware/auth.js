import jwt from 'jsonwebtoken';
import { queryOne } from '../db/index.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await queryOne(
      `SELECT id, email, name, role, ui_language, is_locked, entrance_exam_completed, vocab_level, student_type FROM users WHERE id = ?`,
      [payload.userId]
    );

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_locked) return res.status(403).json({ error: 'Account is locked. Contact your administrator.' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
