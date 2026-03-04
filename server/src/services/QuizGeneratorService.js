import { query } from '../db/index.js';

const ALL_TYPES = ['flashcard', 'mcq', 'typing', 'spelling', 'fill_blank', 'matching'];

export class QuizGeneratorService {
  /**
   * Generate quiz questions.
   * @param {string|null} student_id – null for live tests
   * @param {string} level – CEFR level
   * @param {number} session_size – 10, 20, 50
   * @param {string[]} [allowedTypes] – optional override
   */
  static async generate(student_id, level, session_size, allowedTypes) {
    const types = allowedTypes || ALL_TYPES;

    // Fetch approved vocab at the given level
    const vocab = await query(
      `SELECT * FROM vocab WHERE level = ? AND status = 'approved' ORDER BY RANDOM()`,
      [level]
    );

    if (!vocab.length) return [];

    // Select up to session_size words
    const selected = vocab.slice(0, Math.min(session_size, vocab.length));

    // Fetch distractors (other approved words at same level)
    const distractors = vocab.filter(v => !selected.find(s => s.id === v.id));

    const questions = [];
    for (let i = 0; i < selected.length; i++) {
      const word = selected[i];
      const questionType = types[i % types.length];

      const questionData = this.buildQuestion(questionType, word, distractors);
      questions.push({
        vocab_id: word.id,
        question_type: questionType,
        question_data: questionData,
        vocab: word,
      });
    }

    return questions;
  }

  /**
   * Build question data for a specific type.
   * @param {string} type
   * @param {object} vocab
   * @param {object[]} distractors
   */
  static buildQuestion(type, vocab, distractors = []) {
    switch (type) {
      case 'flashcard':
        return {
          headword: vocab.headword,
          part_of_speech: vocab.part_of_speech,
          meaning_vi: vocab.meaning_vi,
          meaning_en: vocab.meaning_en,
          example_sentence: vocab.example_sentence || null,
          correct_answer: vocab.headword,
        };

      case 'mcq': {
        // Distractors: 3 words from same level, wrong answers (use meaning_en)
        const pool = distractors.filter(d => d.id !== vocab.id);
        const picked = shuffleArray(pool).slice(0, 3);
        const options = shuffleArray([
          { value: vocab.meaning_en, is_correct: true },
          ...picked.map(d => ({ value: d.meaning_en, is_correct: false })),
        ]);
        return {
          prompt: `What is the meaning of "${vocab.headword}"?`,
          headword: vocab.headword,
          options,
          correct_answer: vocab.meaning_en,
        };
      }

      case 'typing':
        return {
          prompt: `Type the word that means: "${vocab.meaning_en}"`,
          meaning_en: vocab.meaning_en,
          meaning_vi: vocab.meaning_vi,
          part_of_speech: vocab.part_of_speech,
          correct_answer: vocab.headword,
        };

      case 'spelling': {
        // Show meaning + IPA, student types the exact spelling
        const scrambled = scrambleWord(vocab.headword);
        return {
          prompt: `Spell the word correctly:`,
          meaning_en: vocab.meaning_en,
          meaning_vi: vocab.meaning_vi,
          scrambled,
          correct_answer: vocab.headword,
        };
      }

      case 'fill_blank': {
        const sentence = vocab.example_sentence || `The word is "${vocab.headword}".`;
        // Replace the headword in example sentence with ___
        const blank = sentence.replace(
          new RegExp(`\\b${escapeRegex(vocab.headword)}\\b`, 'i'),
          '_____'
        );
        return {
          prompt: 'Fill in the blank:',
          sentence_with_blank: blank,
          meaning_vi: vocab.meaning_vi,
          meaning_en: vocab.meaning_en,
          correct_answer: vocab.headword,
        };
      }

      case 'matching': {
        // Provide pairs: headword ↔ meaning_en for current word + 3 distractors
        const pool = distractors.filter(d => d.id !== vocab.id);
        const extras = shuffleArray(pool).slice(0, 3);
        const allWords = [vocab, ...extras];
        const pairs = allWords.map(w => ({
          headword: w.headword,
          meaning: w.meaning_en,
        }));
        const leftItems = shuffleArray(pairs.map(p => p.headword));
        const rightItems = shuffleArray(pairs.map(p => p.meaning));
        return {
          prompt: 'Match the words with their meanings:',
          pairs,
          left_items: leftItems,
          right_items: rightItems,
          correct_answer: JSON.stringify(pairs.map(p => ({ headword: p.headword, meaning: p.meaning }))),
        };
      }

      default:
        return {
          prompt: `What is the meaning of "${vocab.headword}"?`,
          correct_answer: vocab.meaning_en,
        };
    }
  }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word) {
  if (word.length <= 2) return word;
  const chars = word.split('');
  const first = chars[0];
  const last = chars[chars.length - 1];
  const middle = shuffleArray(chars.slice(1, -1));
  return [first, ...middle, last].join('');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
