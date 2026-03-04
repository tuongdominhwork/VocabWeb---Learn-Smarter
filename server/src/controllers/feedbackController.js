import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/index.js';

// POST /feedback
export async function createFeedback(req, res, next) {
  try {
    const { classroom_id, student_id, content, feedback_type = 'general' } = req.body;
    if (!classroom_id || !content) {
      return res.status(400).json({ error: 'classroom_id and content are required' });
    }

    const classroom = await queryOne(
      `SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?`,
      [classroom_id, req.user.id]
    );
    if (!classroom) return res.status(403).json({ error: 'Not your classroom' });

    const id = uuidv4();
    await run(
      `INSERT INTO teacher_feedback (id, teacher_id, classroom_id, student_id, content, feedback_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, classroom_id, student_id || null, content.trim(), feedback_type]
    );

    const feedback = await queryOne(
      `SELECT tf.*, u.name as student_name
       FROM teacher_feedback tf
       LEFT JOIN users u ON u.id = tf.student_id
       WHERE tf.id = ?`,
      [id]
    );
    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
}

// GET /feedback
export async function listFeedback(req, res, next) {
  try {
    let feedbackList;
    if (req.user.role === 'teacher') {
      feedbackList = await query(
        `SELECT tf.*, u.name as student_name, c.name as classroom_name
         FROM teacher_feedback tf
         LEFT JOIN users u ON u.id = tf.student_id
         JOIN classrooms c ON c.id = tf.classroom_id
         WHERE tf.teacher_id = ?
         ORDER BY tf.created_at DESC`,
        [req.user.id]
      );
    } else {
      // Student sees their own feedback
      feedbackList = await query(
        `SELECT tf.*, u.name as teacher_name, c.name as classroom_name
         FROM teacher_feedback tf
         JOIN users u ON u.id = tf.teacher_id
         JOIN classrooms c ON c.id = tf.classroom_id
         WHERE tf.student_id = ? OR (tf.student_id IS NULL AND tf.classroom_id IN (
           SELECT classroom_id FROM student_classroom WHERE student_id = ?
         ))
         ORDER BY tf.created_at DESC`,
        [req.user.id, req.user.id]
      );
    }
    res.json(feedbackList);
  } catch (err) {
    next(err);
  }
}

// GET /feedback/history
export async function getFeedbackHistory(req, res, next) {
  try {
    const history = await query(
      `SELECT tfh.*, u.name as changed_by_name
       FROM teacher_feedback_history tfh
       JOIN users u ON u.id = tfh.changed_by
       WHERE tfh.feedback_id IN (
         SELECT id FROM teacher_feedback WHERE teacher_id = ?
       )
       ORDER BY tfh.changed_at DESC`,
      [req.user.id]
    );
    res.json(history);
  } catch (err) {
    next(err);
  }
}

// PATCH /feedback/:id
export async function updateFeedback(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const existing = await queryOne(
      `SELECT * FROM teacher_feedback WHERE id = ? AND teacher_id = ?`,
      [id, req.user.id]
    );
    if (!existing) return res.status(404).json({ error: 'Feedback not found' });

    // Record history
    await run(
      `INSERT INTO teacher_feedback_history (id, feedback_id, changed_by, old_content, new_content)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), id, req.user.id, existing.content, content.trim()]
    );

    await run(`UPDATE teacher_feedback SET content = ? WHERE id = ?`, [content.trim(), id]);
    const updated = await queryOne(`SELECT * FROM teacher_feedback WHERE id = ?`, [id]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
