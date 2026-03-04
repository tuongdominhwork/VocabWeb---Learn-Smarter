import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/index.js';
import { sendPasswordResetEmail } from '../services/EmailService.js';

const SALT_ROUNDS = 12;
const RESET_EXPIRES_HOURS = Number(process.env.RESET_TOKEN_EXPIRES_HOURS) || 1;

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /auth/register
export async function register(req, res, next) {
  try {
    const { email, password, name, role = 'student', student_type = 'individual', classroom_code } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password and name are required' });
    }
    if (role !== 'student') {
      return res.status(403).json({ error: 'Only students can self-register. Teacher accounts are created by admins.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (role === 'student' && !['individual', 'classroom'].includes(student_type)) {
      return res.status(400).json({ error: 'student_type must be individual or classroom' });
    }

    // If classroom student, validate the code before creating account
    let classroom = null;
    if (role === 'student' && student_type === 'classroom') {
      if (!classroom_code) {
        return res.status(400).json({ error: 'classroom_code is required for classroom students' });
      }
      classroom = await queryOne(
        `SELECT * FROM classrooms WHERE join_code = ? AND is_active = 1`,
        [classroom_code.toUpperCase().trim()]
      );
      if (!classroom) return res.status(404).json({ error: 'Classroom not found or inactive. Check your code.' });
    }

    const existing = await queryOne(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    const actualStudentType = role === 'student' ? student_type : 'individual';
    await run(
      `INSERT INTO users (id, email, password_hash, name, role, student_type) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, email.toLowerCase().trim(), passwordHash, name.trim(), role, actualStudentType]
    );

    // Join classroom if provided
    if (classroom) {
      await run(
        `INSERT INTO student_classroom (id, student_id, classroom_id) VALUES (?, ?, ?)`,
        [uuidv4(), id, classroom.id]
      );
    }

    const user = await queryOne(
      `SELECT id, email, name, role, ui_language, entrance_exam_completed, vocab_level, student_type FROM users WHERE id = ?`,
      [id]
    );
    const token = signToken(id);
    res.status(201).json({ token, user, classroom: classroom || null });
  } catch (err) {
    next(err);
  }
}

// POST /auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await queryOne(
      `SELECT id, email, name, role, ui_language, password_hash, is_locked, entrance_exam_completed, vocab_level, student_type FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.is_locked) return res.status(403).json({ error: 'Account is locked. Contact your administrator.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user.id);
    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
}

// POST /auth/logout (stateless JWT — just acknowledge)
export async function logout(_req, res) {
  res.json({ message: 'Logged out successfully' });
}

// POST /auth/request-reset
export async function requestReset(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await queryOne(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent.' });

    // Invalidate old tokens
    await run(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`, [user.id]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_EXPIRES_HOURS * 3600 * 1000).toISOString();

    await run(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      [uuidv4(), user.id, token, expiresAt]
    );

    await sendPasswordResetEmail(email, token);
    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
}

// POST /auth/reset
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const record = await queryOne(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0`,
      [token]
    );
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset token' });

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, record.user_id]);
    await run(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`, [record.id]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}
