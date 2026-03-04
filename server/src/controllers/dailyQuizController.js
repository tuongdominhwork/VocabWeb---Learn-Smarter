import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/index.js';
import { QuizGeneratorService } from '../services/QuizGeneratorService.js';
import { FeedbackEngine } from '../services/FeedbackEngine.js';

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

// GET /daily-quiz/today
export async function getTodayQuiz(req, res, next) {
  try {
    const today = todayDate();

    // Check if quiz already created
    let quiz = await queryOne(
      `SELECT * FROM daily_quizzes WHERE student_id = ? AND quiz_date = ?`,
      [req.user.id, today]
    );

    if (quiz && quiz.status === 'completed') {
      const items = await query(
        `SELECT dqi.*, v.headword, v.meaning_vi, v.meaning_en, v.example_sentence
         FROM daily_quiz_items dqi
         JOIN vocab v ON dqi.vocab_id = v.id
         WHERE dqi.quiz_id = ? ORDER BY dqi.order_index`,
        [quiz.id]
      );
      return res.json({ quiz, items, already_completed: true });
    }

    if (!quiz) {
      // Generate quiz ONLY from words the student has already studied
      // Priority: least recently reviewed, so they reinforce older knowledge
      const studiedWords = await query(
        `SELECT svm.vocab_id, v.headword, v.level, v.part_of_speech, v.meaning_vi, v.meaning_en, v.example_sentence,
                svm.accuracy, svm.correct_count
         FROM student_vocab_mastery svm
         JOIN vocab v ON v.id = svm.vocab_id
         WHERE svm.student_id = ? AND v.status = 'approved'
         ORDER BY svm.last_reviewed_at ASC
         LIMIT 20`,
        [req.user.id]
      );

      if (!studiedWords.length) {
        return res.status(400).json({
          error: 'no_studied_words',
          message: 'Study some vocabulary first to unlock your daily quiz!',
        });
      }

      const quizId = uuidv4();
      const selectedWords = studiedWords.slice(0, Math.min(10, studiedWords.length));
      const TYPES = ['mcq', 'typing', 'fill_blank'];

      await run(
        `INSERT INTO daily_quizzes (id, student_id, quiz_date, total_questions) VALUES (?, ?, ?, ?)`,
        [quizId, req.user.id, today, selectedWords.length]
      );

      const items = [];
      for (let i = 0; i < selectedWords.length; i++) {
        const vocab = selectedWords[i];
        const questionType = TYPES[i % TYPES.length];

        // Get distractors for MCQ from other studied words
        let allVocab = [];
        if (questionType === 'mcq') {
          allVocab = await query(
            `SELECT id as vocab_id, headword, meaning_vi, meaning_en FROM vocab
             WHERE status = 'approved' AND id != ? ORDER BY RANDOM() LIMIT 3`,
            [vocab.vocab_id]
          );
        }

        const questionData = QuizGeneratorService.buildQuestion(questionType, vocab, allVocab);
        const itemId = uuidv4();

        await run(
          `INSERT INTO daily_quiz_items (id, quiz_id, vocab_id, question_type, question_data, order_index)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [itemId, quizId, vocab.vocab_id, questionType, JSON.stringify(questionData), i]
        );

        items.push({ id: itemId, vocab_id: vocab.vocab_id, question_type: questionType, question_data: questionData, order_index: i });
      }

      quiz = await queryOne(`SELECT * FROM daily_quizzes WHERE id = ?`, [quizId]);
      return res.json({ quiz, items, already_completed: false });
    }

    // In progress
    const items = await query(
      `SELECT dqi.*, v.headword, v.meaning_vi, v.meaning_en, v.example_sentence
       FROM daily_quiz_items dqi
       JOIN vocab v ON dqi.vocab_id = v.id
       WHERE dqi.quiz_id = ? ORDER BY dqi.order_index`,
      [quiz.id]
    );
    res.json({ quiz, items, already_completed: false });
  } catch (err) {
    next(err);
  }
}

// POST /daily-quiz/submit
export async function submitDailyQuiz(req, res, next) {
  try {
    const { quiz_id, answers } = req.body;
    // answers: [{ item_id, user_answer }]

    if (!quiz_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'quiz_id and answers[] are required' });
    }

    const quiz = await queryOne(
      `SELECT * FROM daily_quizzes WHERE id = ? AND student_id = ?`,
      [quiz_id, req.user.id]
    );
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.status === 'completed') return res.status(409).json({ error: 'Quiz already submitted' });

    let score = 0;
    const results = [];

    for (const ans of answers) {
      const item = await queryOne(
        `SELECT dqi.*, v.headword, v.level, v.part_of_speech, v.meaning_vi, v.meaning_en, v.example_sentence
         FROM daily_quiz_items dqi
         JOIN vocab v ON dqi.vocab_id = v.id
         WHERE dqi.id = ? AND dqi.quiz_id = ?`,
        [ans.item_id, quiz_id]
      );

      if (!item) continue;

      const questionData = JSON.parse(item.question_data);
      const vocab = {
        headword: item.headword, level: item.level, part_of_speech: item.part_of_speech,
        meaning_vi: item.meaning_vi, meaning_en: item.meaning_en,
        example_sentence: item.example_sentence,
      };

      const { is_correct, feedback_vi, feedback_en } = FeedbackEngine.evaluate(
        item.question_type, questionData, ans.user_answer, vocab
      );

      if (is_correct) score++;

      await run(
        `UPDATE daily_quiz_items SET user_answer = ?, is_correct = ? WHERE id = ?`,
        [ans.user_answer ?? '', is_correct ? 1 : 0, item.id]
      );

      results.push({ item_id: item.id, is_correct, feedback_vi, feedback_en });
    }

    await run(
      `UPDATE daily_quizzes SET status = 'completed', score = ?, completed_at = datetime('now') WHERE id = ?`,
      [score, quiz_id]
    );

    res.json({ score, total: quiz.total_questions, results });
  } catch (err) {
    next(err);
  }
}
