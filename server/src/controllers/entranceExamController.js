import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/index.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const QUESTIONS_PER_LEVEL = 3; // 18 total questions across 6 levels

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// GET /entrance-exam/questions
export async function getExamQuestions(req, res, next) {
  try {
    const user = await queryOne(
      `SELECT entrance_exam_completed, vocab_level FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (user?.entrance_exam_completed) {
      return res.json({ already_completed: true, vocab_level: user.vocab_level, questions: [] });
    }

    const allQuestions = [];

    for (const level of LEVELS) {
      // Fetch more words than needed so we can use some as distractors
      const pool = await query(
        `SELECT id as vocab_id, headword, meaning_en, meaning_vi, part_of_speech, level
         FROM vocab WHERE level = ? AND status = 'approved' ORDER BY RANDOM() LIMIT ?`,
        [level, QUESTIONS_PER_LEVEL + 5]
      );
      if (pool.length < 1) continue;

      const selected = pool.slice(0, Math.min(QUESTIONS_PER_LEVEL, pool.length));
      const levelDistractors = pool.slice(QUESTIONS_PER_LEVEL);

      for (const word of selected) {
        // Get 3 wrong meanings — first try level distractors, then random
        let wrongPool = levelDistractors.filter(d => d.vocab_id !== word.vocab_id);
        if (wrongPool.length < 3) {
          const extra = await query(
            `SELECT meaning_en FROM vocab WHERE status = 'approved' AND id != ? ORDER BY RANDOM() LIMIT 5`,
            [word.vocab_id]
          );
          wrongPool = [...wrongPool, ...extra];
        }
        const wrongs = shuffleArray(wrongPool).slice(0, 3);
        const options = shuffleArray([
          { value: word.meaning_en, is_correct: true },
          ...wrongs.map(d => ({ value: d.meaning_en, is_correct: false })),
        ]);

        allQuestions.push({
          id: word.vocab_id,
          level,
          prompt: `What does "${word.headword}" mean?`,
          headword: word.headword,
          options,
          correct_answer: word.meaning_en,
        });
      }
    }

    if (!allQuestions.length) {
      // No vocab in DB yet — allow skipping exam
      return res.json({ questions: [], no_vocab: true });
    }

    res.json({ questions: shuffleArray(allQuestions) });
  } catch (err) {
    next(err);
  }
}

// POST /entrance-exam/submit
export async function submitExam(req, res, next) {
  try {
    const user = await queryOne(
      `SELECT entrance_exam_completed, vocab_level FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (user?.entrance_exam_completed) {
      return res.json({ already_completed: true, vocab_level: user.vocab_level });
    }

    const { answers } = req.body; // [{ vocab_id, user_answer }]
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers array required' });
    }

    // Score per level
    const levelScores = {};
    LEVELS.forEach(l => (levelScores[l] = { correct: 0, total: 0 }));

    for (const ans of answers) {
      const vocab = await queryOne(
        `SELECT id, meaning_en, level FROM vocab WHERE id = ?`,
        [ans.vocab_id]
      );
      if (!vocab || !levelScores[vocab.level]) continue;
      levelScores[vocab.level].total++;
      // Compare against the correct option value (meaning_en)
      if (ans.user_answer === vocab.meaning_en) {
        levelScores[vocab.level].correct++;
      }
    }

    // Find highest level where student got >= 60% correct
    let estimatedLevel = 'A1';
    for (const level of LEVELS) {
      const s = levelScores[level];
      if (s.total > 0 && s.correct / s.total >= 0.6) {
        estimatedLevel = level;
      }
    }

    await run(
      `UPDATE users SET entrance_exam_completed = 1, vocab_level = ? WHERE id = ?`,
      [estimatedLevel, req.user.id]
    );

    res.json({ level_scores: levelScores, estimated_level: estimatedLevel });
  } catch (err) {
    next(err);
  }
}

// POST /entrance-exam/skip  — marks exam done with default A1
export async function skipExam(req, res, next) {
  try {
    await run(
      `UPDATE users SET entrance_exam_completed = 1, vocab_level = 'A1' WHERE id = ?`,
      [req.user.id]
    );
    res.json({ skipped: true, estimated_level: 'A1' });
  } catch (err) {
    next(err);
  }
}
