import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/index.js';

// Generate a random classroom join code
function generateJoinCode() {
  const words = ['APPLE', 'BRAIN', 'CLOUD', 'DELTA', 'EAGLE', 'FLAME', 'GLOBE', 'HONEY', 'IVORY', 'JEWEL'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

// GET /classrooms (teacher sees their own; admin sees all; student sees theirs)
export async function listClassrooms(req, res, next) {
  try {
    let classrooms;
    if (req.user.role === 'admin') {
      classrooms = await query(
        `SELECT c.*, u.name as teacher_name,
          (SELECT COUNT(*) FROM student_classroom sc WHERE sc.classroom_id = c.id) as student_count
         FROM classrooms c LEFT JOIN users u ON c.teacher_id = u.id ORDER BY c.created_at DESC`
      );
    } else if (req.user.role === 'teacher') {
      classrooms = await query(
        `SELECT c.*,
          (SELECT COUNT(*) FROM student_classroom sc WHERE sc.classroom_id = c.id) as student_count
         FROM classrooms c WHERE c.teacher_id = ? ORDER BY c.created_at DESC`,
        [req.user.id]
      );
    } else {
      // student
      classrooms = await query(
        `SELECT c.*, u.name as teacher_name
         FROM classrooms c
         JOIN student_classroom sc ON sc.classroom_id = c.id
         JOIN users u ON c.teacher_id = u.id
         WHERE sc.student_id = ?`,
        [req.user.id]
      );
    }
    res.json(classrooms);
  } catch (err) {
    next(err);
  }
}

// POST /classrooms (teacher only)
export async function createClassroom(req, res, next) {
  try {
    const { name, description, level } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const id = uuidv4();
    const join_code = generateJoinCode();

    await run(
      `INSERT INTO classrooms (id, name, description, teacher_id, join_code, level) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), description?.trim() || null, req.user.id, join_code, level || null]
    );

    const classroom = await queryOne(`SELECT * FROM classrooms WHERE id = ?`, [id]);
    res.status(201).json(classroom);
  } catch (err) {
    next(err);
  }
}

// POST /classrooms/join (student only)
export async function joinClassroom(req, res, next) {
  try {
    const { join_code } = req.body;
    if (!join_code) return res.status(400).json({ error: 'join_code is required' });

    const classroom = await queryOne(
      `SELECT * FROM classrooms WHERE join_code = ? AND is_active = 1`,
      [join_code.toUpperCase().trim()]
    );
    if (!classroom) return res.status(404).json({ error: 'Classroom not found or inactive' });

    // Check if already in a classroom
    const existing = await queryOne(
      `SELECT * FROM student_classroom WHERE student_id = ?`,
      [req.user.id]
    );
    if (existing) {
      if (existing.classroom_id === classroom.id) {
        return res.status(409).json({ error: 'You are already in this classroom' });
      }
      return res.status(409).json({ error: 'You are already enrolled in a classroom. Leave it first.' });
    }

    await run(
      `INSERT INTO student_classroom (id, student_id, classroom_id) VALUES (?, ?, ?)`,
      [uuidv4(), req.user.id, classroom.id]
    );

    res.json({ message: 'Joined classroom successfully', classroom });
  } catch (err) {
    next(err);
  }
}

// DELETE /classrooms/leave (student only)
export async function leaveClassroom(req, res, next) {
  try {
    const sc = await queryOne(
      `SELECT * FROM student_classroom WHERE student_id = ?`,
      [req.user.id]
    );
    if (!sc) return res.status(404).json({ error: 'You are not enrolled in any classroom' });
    await run(`DELETE FROM student_classroom WHERE student_id = ?`, [req.user.id]);
    res.json({ message: 'Left classroom successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /classrooms/:id/students (teacher / admin)
export async function getClassroomStudents(req, res, next) {
  try {
    const { id } = req.params;

    // Ownership check for teacher
    if (req.user.role === 'teacher') {
      const classroom = await queryOne(
        `SELECT id FROM classrooms WHERE id = ? AND teacher_id = ?`,
        [id, req.user.id]
      );
      if (!classroom) return res.status(403).json({ error: 'Not your classroom' });
    }

    const students = await query(
      `SELECT u.id, u.name, u.email, sc.joined_at,
        COALESCE(svm.avg_accuracy, 0) as avg_accuracy,
        COALESCE(svm.total_studied, 0) as total_studied
       FROM users u
       JOIN student_classroom sc ON sc.student_id = u.id
       LEFT JOIN (
         SELECT student_id,
           AVG(accuracy) as avg_accuracy,
           COUNT(*) as total_studied
         FROM student_vocab_mastery
         GROUP BY student_id
       ) svm ON svm.student_id = u.id
       WHERE sc.classroom_id = ?
       ORDER BY u.name`,
      [id]
    );
    res.json(students);
  } catch (err) {
    next(err);
  }
}

// GET /classrooms/:id (single classroom)
export async function getClassroom(req, res, next) {
  try {
    const { id } = req.params;
    const classroom = await queryOne(
      `SELECT c.*, u.name as teacher_name,
        (SELECT COUNT(*) FROM student_classroom sc WHERE sc.classroom_id = c.id) as student_count
       FROM classrooms c LEFT JOIN users u ON c.teacher_id = u.id WHERE c.id = ?`,
      [id]
    );
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    res.json(classroom);
  } catch (err) {
    next(err);
  }
}

// PATCH /classrooms/:id
export async function updateClassroom(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, is_active, level } = req.body;

    const classroom = await queryOne(
      `SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?`,
      [id, req.user.id]
    );
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    await run(
      `UPDATE classrooms SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active),
        level = COALESCE(?, level),
        updated_at = datetime('now')
       WHERE id = ?`,
      [name ?? null, description ?? null, is_active ?? null, level ?? null, id]
    );

    const updated = await queryOne(`SELECT * FROM classrooms WHERE id = ?`, [id]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /classrooms/:id (teacher only) — removes all students, resets them to individual
export async function deleteClassroom(req, res, next) {
  try {
    const { id } = req.params;
    const classroom = await queryOne(
      `SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?`,
      [id, req.user.id]
    );
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Reset all students in this classroom back to individual
    await run(
      `UPDATE users SET student_type = 'individual' WHERE id IN (
         SELECT student_id FROM student_classroom WHERE classroom_id = ?
       )`,
      [id]
    );

    // Cascade deletes handle student_classroom, classroom_vocab, teacher_feedback, tests, etc.
    await run(`DELETE FROM classrooms WHERE id = ?`, [id]);

    res.json({ message: 'Classroom deleted' });
  } catch (err) {
    next(err);
  }
}

// GET /classrooms/:id/vocab — list vocab assigned to classroom
export async function getClassroomVocab(req, res, next) {
  try {
    const { id } = req.params;
    const vocab = await query(
      `SELECT v.*, cv.assigned_at FROM classroom_vocab cv
       JOIN vocab v ON v.id = cv.vocab_id
       WHERE cv.classroom_id = ?
       ORDER BY v.level, v.headword`,
      [id]
    );
    res.json(vocab);
  } catch (err) {
    next(err);
  }
}

// POST /classrooms/:id/vocab — assign vocab to classroom (teacher)
export async function assignVocabToClassroom(req, res, next) {
  try {
    const { id } = req.params;
    const { vocab_id } = req.body;
    if (!vocab_id) return res.status(400).json({ error: 'vocab_id is required' });

    const classroom = await queryOne(
      `SELECT id FROM classrooms WHERE id = ? AND teacher_id = ?`,
      [id, req.user.id]
    );
    if (!classroom) return res.status(403).json({ error: 'Not your classroom' });

    const vocab = await queryOne(`SELECT id FROM vocab WHERE id = ? AND status = 'approved'`, [vocab_id]);
    if (!vocab) return res.status(404).json({ error: 'Vocab not found or not approved' });

    const existing = await queryOne(
      `SELECT id FROM classroom_vocab WHERE classroom_id = ? AND vocab_id = ?`,
      [id, vocab_id]
    );
    if (existing) return res.status(409).json({ error: 'Vocab already assigned' });

    await run(
      `INSERT INTO classroom_vocab (id, classroom_id, vocab_id, assigned_by) VALUES (?, ?, ?, ?)`,
      [uuidv4(), id, vocab_id, req.user.id]
    );
    res.status(201).json({ message: 'Vocab assigned to classroom' });
  } catch (err) {
    next(err);
  }
}

// DELETE /classrooms/:id/vocab/:vocab_id — remove vocab from classroom
export async function removeVocabFromClassroom(req, res, next) {
  try {
    const { id, vocab_id } = req.params;
    const classroom = await queryOne(
      `SELECT id FROM classrooms WHERE id = ? AND teacher_id = ?`,
      [id, req.user.id]
    );
    if (!classroom) return res.status(403).json({ error: 'Not your classroom' });

    await run(
      `DELETE FROM classroom_vocab WHERE classroom_id = ? AND vocab_id = ?`,
      [id, vocab_id]
    );
    res.json({ message: 'Vocab removed from classroom' });
  } catch (err) {
    next(err);
  }
}
