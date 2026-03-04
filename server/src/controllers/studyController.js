import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/index.js';
import { QuizGeneratorService } from '../services/QuizGeneratorService.js';
import { FeedbackEngine } from '../services/FeedbackEngine.js';
import { getHint } from '../services/HintService.js';

// POST /study/session/create
export async function createSession(req, res, next) {
  try {
    let { level, session_size } = req.body;
    const validSizes = [10, 20, 50];
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    if (!validSizes.includes(Number(session_size))) {
      return res.status(400).json({ error: 'session_size must be 10, 20, or 50' });
    }

    const size = Number(session_size);

    // ── Classroom student: restrict to classroom-assigned vocab ──────────────
    const studentInfo = await queryOne(
      `SELECT student_type FROM users WHERE id = ?`, [req.user.id]
    );

    let questions = [];

    if (studentInfo?.student_type === 'classroom') {
      // Get the student's classroom
      const sc = await queryOne(
        `SELECT sc.classroom_id FROM student_classroom sc WHERE sc.student_id = ?`,
        [req.user.id]
      );

      if (sc) {
        // Try classroom-assigned vocab first
        const classroomVocab = await query(
          `SELECT v.* FROM classroom_vocab cv
           JOIN vocab v ON v.id = cv.vocab_id
           WHERE cv.classroom_id = ? AND v.status = 'approved'
           ORDER BY RANDOM()`,
          [sc.classroom_id]
        );

        if (classroomVocab.length > 0) {
          const selected = classroomVocab.slice(0, Math.min(size, classroomVocab.length));
          const distractors = classroomVocab.filter(v => !selected.find(s => s.id === v.id));
          for (let i = 0; i < selected.length; i++) {
            const word = selected[i];
            const ALL_TYPES = ['flashcard', 'mcq', 'typing', 'spelling', 'fill_blank', 'matching'];
            const questionType = ALL_TYPES[i % ALL_TYPES.length];
            const questionData = QuizGeneratorService.buildQuestion(questionType, word, distractors);
            questions.push({ vocab_id: word.id, question_type: questionType, question_data: questionData, vocab: word });
          }
        } else {
          // Fall back to classroom level, then teacher target, then A1
          const classroom = await queryOne(
            `SELECT level FROM classrooms WHERE id = ?`,
            [sc.classroom_id]
          );
          const target = await queryOne(
            `SELECT target_level FROM teacher_targets WHERE classroom_id = ? ORDER BY created_at DESC LIMIT 1`,
            [sc.classroom_id]
          );
          const fallbackLevel = classroom?.level || target?.target_level || level || 'A1';
          questions = await QuizGeneratorService.generate(req.user.id, fallbackLevel, size);
        }
      }
    } else {
      // Individual student — use freely chosen level
      if (!level || !validLevels.includes(level)) {
        return res.status(400).json({ error: `level must be one of ${validLevels.join(', ')}` });
      }
      questions = await QuizGeneratorService.generate(req.user.id, level, size);
    }

    if (!questions.length) {
      return res.status(400).json({ error: 'Not enough vocabulary available to generate a study session' });
    }

    const sessionId = uuidv4();
    await run(
      `INSERT INTO study_sessions (id, student_id, session_size, level) VALUES (?, ?, ?, ?)`,
      [sessionId, req.user.id, size, level || 'mixed']
    );

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = uuidv4();
      await run(
        `INSERT INTO study_questions (id, session_id, vocab_id, question_type, question_data, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
        [qId, sessionId, q.vocab_id, q.question_type, JSON.stringify(q.question_data), i]
      );
      questions[i].id = qId;
    }

    res.status(201).json({
      session_id: sessionId,
      level: level || 'mixed',
      session_size: size,
      questions,
    });
  } catch (err) {
    next(err);
  }
}

// POST /study/answer
export async function submitAnswer(req, res, next) {
  try {
    const { question_id, user_answer, time_spent_ms } = req.body;

    if (!question_id) return res.status(400).json({ error: 'question_id is required' });

    const question = await queryOne(
      `SELECT sq.*, v.* FROM study_questions sq
       JOIN study_sessions ss ON sq.session_id = ss.id
       JOIN vocab v ON sq.vocab_id = v.id
       WHERE sq.id = ? AND ss.student_id = ?`,
      [question_id, req.user.id]
    );

    if (!question) return res.status(404).json({ error: 'Question not found or access denied' });

    const questionData = JSON.parse(question.question_data);
    const vocab = {
      id: question.vocab_id,
      headword: question.headword,
      level: question.level,
      part_of_speech: question.part_of_speech,
      meaning_vi: question.meaning_vi,
      meaning_en: question.meaning_en,
      example_sentence: question.example_sentence,
      notes: question.notes,
    };

    // Count previous attempts for hint logic
    const attempts = await query(
      `SELECT * FROM study_attempts WHERE question_id = ? AND student_id = ? ORDER BY attempt_number`,
      [question_id, req.user.id]
    );

    const attemptNum = attempts.length + 1;
    const { is_correct, feedback_vi, feedback_en } = FeedbackEngine.evaluate(
      question.question_type,
      questionData,
      user_answer,
      vocab
    );

    // Record the attempt
    await run(
      `INSERT INTO study_attempts (id, question_id, student_id, attempt_number, user_answer, is_correct)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), question_id, req.user.id, attemptNum, user_answer ?? '', is_correct ? 1 : 0]
    );

    // Determine hint level
    const hintLevelUsed = attemptNum >= 3 ? Math.min(attemptNum - 2, 2) : 0;
    let hint = null;
    if (!is_correct && attemptNum >= 3) {
      hint = getHint(vocab, question.question_type, hintLevelUsed);
    }

    // If correct or this is a final attempt (4+), record the answer and update mastery
    const isFinal = is_correct || attemptNum >= 4;
    if (isFinal) {
      const wasAlreadyAnswered = await queryOne(
        `SELECT id FROM study_answers WHERE question_id = ? AND student_id = ?`,
        [question_id, req.user.id]
      );

      if (!wasAlreadyAnswered) {
        await run(
          `INSERT INTO study_answers (id, question_id, student_id, user_answer, is_correct, time_spent_ms, hint_level_used)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), question_id, req.user.id, user_answer ?? '', is_correct ? 1 : 0, time_spent_ms || null, hintLevelUsed]
        );

        // Update mastery
        await upsertMastery(req.user.id, vocab.id, is_correct);
      }
    }

    res.json({
      is_correct,
      feedback_vi,
      feedback_en,
      hint,
      attempt_number: attemptNum,
      is_final: isFinal,
      correct_answer: isFinal ? questionData.correct_answer : undefined,
    });
  } catch (err) {
    next(err);
  }
}

async function upsertMastery(student_id, vocab_id, is_correct) {
  const existing = await queryOne(
    `SELECT * FROM student_vocab_mastery WHERE student_id = ? AND vocab_id = ?`,
    [student_id, vocab_id]
  );

  if (!existing) {
    const correct = is_correct ? 1 : 0;
    const incorrect = is_correct ? 0 : 1;
    const accuracy = is_correct ? 100.0 : 0.0;
    await run(
      `INSERT INTO student_vocab_mastery (id, student_id, vocab_id, correct_count, incorrect_count, accuracy, last_reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), student_id, vocab_id, correct, incorrect, accuracy]
    );
  } else {
    const correct = existing.correct_count + (is_correct ? 1 : 0);
    const incorrect = existing.incorrect_count + (is_correct ? 0 : 1);
    const total = correct + incorrect;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    await run(
      `UPDATE student_vocab_mastery SET
        correct_count = ?, incorrect_count = ?, accuracy = ?, last_reviewed_at = datetime('now')
       WHERE student_id = ? AND vocab_id = ?`,
      [correct, incorrect, accuracy, student_id, vocab_id]
    );
  }
}

// POST /study/session/:id/complete
export async function completeSession(req, res, next) {
  try {
    const { id } = req.params;
    const session = await queryOne(
      `SELECT * FROM study_sessions WHERE id = ? AND student_id = ?`,
      [id, req.user.id]
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await run(
      `UPDATE study_sessions SET status = 'completed', completed_at = datetime('now') WHERE id = ?`,
      [id]
    );

    // Stats for this session
    const stats = await queryOne(
      `SELECT
        COUNT(sa.id) as answered,
        SUM(CASE WHEN sa.is_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM study_questions sq
       LEFT JOIN study_answers sa ON sa.question_id = sq.id AND sa.student_id = ?
       WHERE sq.session_id = ?`,
      [req.user.id, id]
    );

    res.json({ message: 'Session completed', stats });
  } catch (err) {
    next(err);
  }
}

// GET /study/stats
export async function getStudyStats(req, res, next) {
  try {
    const overall = await queryOne(
      `SELECT
        COUNT(DISTINCT vocab_id) as words_studied,
        AVG(accuracy) as avg_accuracy,
        SUM(correct_count) as total_correct,
        SUM(incorrect_count) as total_incorrect
       FROM student_vocab_mastery WHERE student_id = ?`,
      [req.user.id]
    );

    const byLevel = await query(
      `SELECT v.level,
        COUNT(DISTINCT svm.vocab_id) as words_studied,
        AVG(svm.accuracy) as avg_accuracy
       FROM student_vocab_mastery svm
       JOIN vocab v ON v.id = svm.vocab_id
       WHERE svm.student_id = ?
       GROUP BY v.level ORDER BY v.level`,
      [req.user.id]
    );

    const recentSessions = await query(
      `SELECT ss.*, 
        (SELECT COUNT(*) FROM study_questions WHERE session_id = ss.id) as total_questions,
        (SELECT COUNT(*) FROM study_answers sa JOIN study_questions sq ON sa.question_id = sq.id
         WHERE sq.session_id = ss.id AND sa.is_correct = 1 AND sa.student_id = ?) as correct_count
       FROM study_sessions ss WHERE ss.student_id = ?
       ORDER BY ss.started_at DESC LIMIT 10`,
      [req.user.id, req.user.id]
    );

    res.json({ overall, byLevel, recentSessions });
  } catch (err) {
    next(err);
  }
}
