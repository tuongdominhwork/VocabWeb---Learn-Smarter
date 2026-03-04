import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query, queryOne, run } from '../db/index.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 12;
const router = Router();
router.use(authenticate);

// GET /me
router.get('/', async (req, res, next) => {
  try {
    const user = await queryOne(
      `SELECT id, email, name, role, ui_language, is_locked, created_at FROM users WHERE id = ?`,
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /me
router.patch('/', async (req, res, next) => {
  try {
    const { name, ui_language } = req.body;
    await run(
      `UPDATE users SET
        name = COALESCE(?, name),
        ui_language = COALESCE(?, ui_language),
        updated_at = datetime('now')
       WHERE id = ?`,
      [name || null, ui_language || null, req.user.id]
    );
    const user = await queryOne(
      `SELECT id, email, name, role, ui_language, created_at FROM users WHERE id = ?`,
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ─── Admin-only: list all users ────────────────────────────────────────────
router.get('/all', requireRole('admin'), async (req, res, next) => {
  try {
    const { q, role, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    const args = [];
    if (q) { conditions.push('(name LIKE ? OR email LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
    if (role) { conditions.push('role = ?'); args.push(role); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const users = await query(
      `SELECT id, email, name, role, ui_language, is_locked, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, Number(limit), offset]
    );
    const [{ total }] = await query(`SELECT COUNT(*) as total FROM users ${where}`, args);
    res.json({ data: users, total });
  } catch (err) {
    next(err);
  }
});

// PATCH /me/all/:id/lock-toggle (admin)
router.patch('/all/:id/lock', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await queryOne(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newLocked = user.is_locked ? 0 : 1;
    await run(`UPDATE users SET is_locked = ? WHERE id = ?`, [newLocked, id]);
    res.json({ id, is_locked: !!newLocked });
  } catch (err) {
    next(err);
  }
});

// DELETE /me/all/:id (admin) — delete any non-admin account
router.delete('/all/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await queryOne(`SELECT id, role FROM users WHERE id = ?`, [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });

    if (user.role === 'teacher') {
      // Reset students in teacher’s classrooms to individual
      await run(
        `UPDATE users SET student_type = 'individual' WHERE id IN (
           SELECT sc.student_id FROM student_classroom sc
           JOIN classrooms c ON sc.classroom_id = c.id
           WHERE c.teacher_id = ?
         )`,
        [id]
      );
    }

    await run(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /me/teachers — list all teachers with their classrooms (admin)
router.get('/teachers', requireRole('admin'), async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const teachers = await query(
      `SELECT u.id, u.email, u.name, u.is_locked, u.created_at,
         (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id) as classroom_count,
         (SELECT COUNT(*) FROM classrooms c JOIN student_classroom sc ON sc.classroom_id = c.id WHERE c.teacher_id = u.id) as student_count
       FROM users u
       WHERE u.role = 'teacher' AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.created_at DESC`,
      [`%${search}%`, `%${search}%`]
    );

    // Attach classrooms list to each teacher
    for (const t of teachers) {
      t.classrooms = await query(
        `SELECT c.id, c.name, c.level, c.join_code, c.is_active,
           (SELECT COUNT(*) FROM student_classroom sc WHERE sc.classroom_id = c.id) as student_count
         FROM classrooms c WHERE c.teacher_id = ? ORDER BY c.created_at DESC`,
        [t.id]
      );
    }

    res.json(teachers);
  } catch (err) {
    next(err);
  }
});

// POST /me/teachers — create a new teacher account (admin)
router.post('/teachers', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await queryOne(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    await run(
      `INSERT INTO users (id, email, password_hash, name, role, student_type) VALUES (?, ?, ?, ?, 'teacher', 'individual')`,
      [id, email.toLowerCase().trim(), passwordHash, name.trim()]
    );

    const teacher = await queryOne(
      `SELECT id, email, name, role, is_locked, created_at FROM users WHERE id = ?`,
      [id]
    );
    res.status(201).json(teacher);
  } catch (err) {
    next(err);
  }
});

// GET /me/students — list all students with classroom info (admin)
router.get('/students', requireRole('admin'), async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const students = await query(
      `SELECT u.id, u.email, u.name, u.is_locked, u.created_at,
         c.name as classroom_name, c.level as classroom_level,
         t.name as teacher_name
       FROM users u
       LEFT JOIN student_classroom sc ON sc.student_id = u.id
       LEFT JOIN classrooms c ON c.id = sc.classroom_id
       LEFT JOIN users t ON t.id = c.teacher_id
       WHERE u.role = 'student' AND (u.name LIKE ? OR u.email LIKE ?)
       ORDER BY u.created_at DESC`,
      [`%${search}%`, `%${search}%`]
    );
    res.json(students);
  } catch (err) {
    next(err);
  }
});

// POST /me/students — create a new student account (admin)
router.post('/students', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await queryOne(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    await run(
      `INSERT INTO users (id, email, password_hash, name, role, student_type) VALUES (?, ?, ?, ?, 'student', 'individual')`,
      [id, email.toLowerCase().trim(), passwordHash, name.trim()]
    );
    const student = await queryOne(
      `SELECT id, email, name, role, is_locked, created_at FROM users WHERE id = ?`,
      [id]
    );
    res.status(201).json(student);
  } catch (err) {
    next(err);
  }
});

// DELETE /me/teachers/:id — delete a teacher account (admin)
router.delete('/teachers/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacher = await queryOne(`SELECT id, role FROM users WHERE id = ?`, [id]);
    if (!teacher) return res.status(404).json({ error: 'User not found' });
    if (teacher.role !== 'teacher') return res.status(400).json({ error: 'User is not a teacher' });

    // Reset students in teacher's classrooms to individual
    await run(
      `UPDATE users SET student_type = 'individual' WHERE id IN (
         SELECT sc.student_id FROM student_classroom sc
         JOIN classrooms c ON sc.classroom_id = c.id
         WHERE c.teacher_id = ?
       )`,
      [id]
    );

    await run(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ message: 'Teacher account deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
