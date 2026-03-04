import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/index.js';
import { QuizGeneratorService } from '../services/QuizGeneratorService.js';
import { FeedbackEngine } from '../services/FeedbackEngine.js';

// SSE registry: testId → Map<studentId, res>
const sseClients = new Map();

function sendSSE(testId, data) {
  if (!sseClients.has(testId)) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients.get(testId).values()) {
    try { res.write(payload); } catch (_) { /* client disconnected */ }
  }
}

// GET /tests (teacher sees own; student sees classroom's)
export async function listTests(req, res, next) {
  try {
    let tests;
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      tests = await query(
        `SELECT t.*, c.name as classroom_name
         FROM tests t JOIN classrooms c ON t.classroom_id = c.id
         WHERE t.teacher_id = ? ORDER BY t.created_at DESC`,
        [req.user.id]
      );
    } else {
      tests = await query(
        `SELECT t.*, c.name as classroom_name,
          (SELECT status FROM test_participants tp WHERE tp.test_id = t.id AND tp.student_id = ?) as my_status
         FROM tests t JOIN classrooms c ON t.classroom_id = c.id
         JOIN student_classroom sc ON sc.classroom_id = c.id
         WHERE sc.student_id = ?
         ORDER BY t.created_at DESC`,
        [req.user.id, req.user.id]
      );
    }
    res.json(tests);
  } catch (err) {
    next(err);
  }
}

// POST /tests (teacher)
export async function createTest(req, res, next) {
  try {
    const { classroom_id, title, level, num_questions = 10, allowed_types, time_limit_minutes = 15 } = req.body;

    if (!classroom_id || !title || !level) {
      return res.status(400).json({ error: 'classroom_id, title, level are required' });
    }

    const classroom = await queryOne(
      `SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?`,
      [classroom_id, req.user.id]
    );
    if (!classroom) return res.status(403).json({ error: 'Not your classroom' });

    const types = allowed_types || ['mcq', 'typing', 'fill_blank', 'matching'];
    const id = uuidv4();

    await run(
      `INSERT INTO tests (id, classroom_id, teacher_id, title, level, num_questions, allowed_types, time_limit_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, classroom_id, req.user.id, title, level, num_questions, JSON.stringify(types), time_limit_minutes]
    );

    const test = await queryOne(`SELECT * FROM tests WHERE id = ?`, [id]);
    res.status(201).json(test);
  } catch (err) {
    next(err);
  }
}

// GET /tests/:id
export async function getTest(req, res, next) {
  try {
    const test = await queryOne(
      `SELECT t.*, c.name as classroom_name
       FROM tests t JOIN classrooms c ON t.classroom_id = c.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    next(err);
  }
}

// POST /tests/:id/start (teacher activates the test and generates questions)
export async function startTest(req, res, next) {
  try {
    const { id } = req.params;
    const test = await queryOne(
      `SELECT * FROM tests WHERE id = ? AND teacher_id = ?`,
      [id, req.user.id]
    );
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.status !== 'pending') return res.status(409).json({ error: 'Test already started or completed' });

    const allowedTypes = JSON.parse(test.allowed_types);
    const questions = await QuizGeneratorService.generate(
      null, test.level, test.num_questions, allowedTypes
    );

    if (!questions.length) {
      return res.status(400).json({ error: 'Not enough vocabulary to generate test questions' });
    }

    await run(
      `UPDATE tests SET status = 'active', questions = ?, started_at = datetime('now') WHERE id = ?`,
      [JSON.stringify(questions), id]
    );

    sendSSE(id, { type: 'TEST_STARTED', test_id: id });
    res.json({ message: 'Test started', questions_count: questions.length });
  } catch (err) {
    next(err);
  }
}

// POST /tests/:id/end (teacher)
export async function endTest(req, res, next) {
  try {
    const { id } = req.params;
    const test = await queryOne(`SELECT * FROM tests WHERE id = ? AND teacher_id = ?`, [id, req.user.id]);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    await run(`UPDATE tests SET status = 'completed', completed_at = datetime('now') WHERE id = ?`, [id]);
    sendSSE(id, { type: 'TEST_ENDED', test_id: id });
    res.json({ message: 'Test ended' });
  } catch (err) {
    next(err);
  }
}

// POST /tests/:id/join (student)
export async function joinTest(req, res, next) {
  try {
    const { id } = req.params;
    const test = await queryOne(
      `SELECT t.* FROM tests t
       JOIN classrooms c ON t.classroom_id = c.id
       JOIN student_classroom sc ON sc.classroom_id = c.id
       WHERE t.id = ? AND sc.student_id = ?`,
      [id, req.user.id]
    );
    if (!test) return res.status(404).json({ error: 'Test not found or you are not in this classroom' });
    if (test.status === 'completed') return res.status(409).json({ error: 'Test already completed' });

    const existing = await queryOne(
      `SELECT * FROM test_participants WHERE test_id = ? AND student_id = ?`,
      [id, req.user.id]
    );

    if (!existing) {
      await run(
        `INSERT INTO test_participants (id, test_id, student_id) VALUES (?, ?, ?)`,
        [uuidv4(), id, req.user.id]
      );
    }

    const questions = test.questions ? JSON.parse(test.questions) : [];
    sendSSE(id, { type: 'STUDENT_JOINED', student_id: req.user.id, student_name: req.user.name });
    res.json({ test, questions });
  } catch (err) {
    next(err);
  }
}

// POST /tests/:id/submit (student submits answers)
export async function submitTest(req, res, next) {
  try {
    const { id } = req.params;
    const { answers } = req.body; // [{ question_index, user_answer }]

    const participant = await queryOne(
      `SELECT * FROM test_participants WHERE test_id = ? AND student_id = ?`,
      [id, req.user.id]
    );
    if (!participant) return res.status(404).json({ error: 'Not a participant' });
    if (participant.status === 'completed') return res.status(409).json({ error: 'Already submitted' });

    const test = await queryOne(`SELECT * FROM tests WHERE id = ?`, [id]);
    const questions = test.questions ? JSON.parse(test.questions) : [];

    let score = 0;
    const processedAnswers = [];

    for (const ans of answers || []) {
      const q = questions[ans.question_index];
      if (!q) continue;

      const vocab = {
        headword: q.vocab?.headword,
        level: q.vocab?.level,
        part_of_speech: q.vocab?.part_of_speech,
        meaning_vi: q.vocab?.meaning_vi,
        meaning_en: q.vocab?.meaning_en,
        example_sentence: q.vocab?.example_sentence,
      };

      const { is_correct } = FeedbackEngine.evaluate(
        q.question_type, q.question_data, ans.user_answer, vocab
      );

      if (is_correct) score++;
      processedAnswers.push({ ...ans, is_correct });
    }

    await run(
      `UPDATE test_participants SET status = 'completed', score = ?, answers = ?, completed_at = datetime('now')
       WHERE test_id = ? AND student_id = ?`,
      [score, JSON.stringify(processedAnswers), id, req.user.id]
    );

    sendSSE(id, {
      type: 'STUDENT_SUBMITTED',
      student_id: req.user.id,
      student_name: req.user.name,
      score,
      total: questions.length,
    });

    res.json({ score, total: questions.length });
  } catch (err) {
    next(err);
  }
}

// POST /tests/:id/events (student sends tab switch event)
export async function logEvent(req, res, next) {
  try {
    const { id } = req.params;
    const { event_type, event_data } = req.body;

    if (!event_type) return res.status(400).json({ error: 'event_type is required' });

    const eventId = uuidv4();
    await run(
      `INSERT INTO test_events (id, test_id, student_id, event_type, event_data) VALUES (?, ?, ?, ?, ?)`,
      [eventId, id, req.user.id, event_type, event_data ? JSON.stringify(event_data) : null]
    );

    if (event_type === 'tab_switch') {
      await run(
        `UPDATE test_participants SET tab_switch_count = tab_switch_count + 1 WHERE test_id = ? AND student_id = ?`,
        [id, req.user.id]
      );
    }

    sendSSE(id, {
      type: 'STUDENT_EVENT',
      event_type,
      student_id: req.user.id,
      student_name: req.user.name,
      event_data,
    });

    res.json({ message: 'Event logged' });
  } catch (err) {
    next(err);
  }
}

// GET /tests/:id/results (teacher)
export async function getResults(req, res, next) {
  try {
    const { id } = req.params;
    const test = await queryOne(`SELECT * FROM tests WHERE id = ? AND teacher_id = ?`, [id, req.user.id]);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const participants = await query(
      `SELECT tp.*, u.name as student_name, u.email as student_email
       FROM test_participants tp
       JOIN users u ON u.id = tp.student_id
       WHERE tp.test_id = ?
       ORDER BY tp.score DESC`,
      [id]
    );

    const events = await query(
      `SELECT te.*, u.name as student_name
       FROM test_events te JOIN users u ON u.id = te.student_id
       WHERE te.test_id = ?
       ORDER BY te.created_at DESC`,
      [id]
    );

    res.json({ test, participants, events });
  } catch (err) {
    next(err);
  }
}

// GET /tests/:id/stream — SSE endpoint
export function streamTestEvents(req, res, next) {
  try {
    const { id } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Register client
    if (!sseClients.has(id)) sseClients.set(id, new Map());
    sseClients.get(id).set(req.user.id, res);

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

    // Keepalive
    const keepalive = setInterval(() => {
      try { res.write(':keepalive\n\n'); } catch (_) {}
    }, 25000);

    req.on('close', () => {
      clearInterval(keepalive);
      if (sseClients.has(id)) {
        sseClients.get(id).delete(req.user.id);
        if (!sseClients.get(id).size) sseClients.delete(id);
      }
    });
  } catch (err) {
    next(err);
  }
}
