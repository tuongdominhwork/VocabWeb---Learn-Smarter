/**
 * FeedbackEngine — deterministic rule-based feedback.
 * Never generates content outside of vocab database fields.
 */
export class FeedbackEngine {
  /**
   * Evaluate a student's answer.
   * @param {string} questionType
   * @param {object} questionData – the stored question_data object
   * @param {string|null} userAnswer
   * @param {object} vocab – the vocab record
   * @returns {{ is_correct: boolean, feedback_vi: string, feedback_en: string }}
   */
  static evaluate(questionType, questionData, userAnswer, vocab) {
    const ua = (userAnswer ?? '').trim();

    switch (questionType) {
      case 'flashcard':
        return this._flashcardFeedback(questionData, ua, vocab);
      case 'mcq':
        return this._mcqFeedback(questionData, ua, vocab);
      case 'typing':
        return this._typingFeedback(questionData, ua, vocab);
      case 'spelling':
        return this._spellingFeedback(questionData, ua, vocab);
      case 'fill_blank':
        return this._fillBlankFeedback(questionData, ua, vocab);
      case 'matching':
        return this._matchingFeedback(questionData, ua, vocab);
      default:
        return { is_correct: false, feedback_vi: 'Loại câu hỏi không hợp lệ.', feedback_en: 'Invalid question type.' };
    }
  }

  static _flashcardFeedback(_questionData, _userAnswer, vocab) {
    // Flashcard is self-assessed (student marks correct/incorrect)
    return {
      is_correct: true,
      feedback_vi: `"${vocab.headword}" có nghĩa là "${vocab.meaning_vi}".`,
      feedback_en: `"${vocab.headword}" means "${vocab.meaning_en}".`,
    };
  }

  static _mcqFeedback(questionData, userAnswer, vocab) {
    const correct = questionData.correct_answer;
    const is_correct = userAnswer.toLowerCase() === correct.toLowerCase();

    if (is_correct) {
      return {
        is_correct: true,
        feedback_vi: `Chính xác! "${vocab.headword}" có nghĩa là "${vocab.meaning_vi}".`,
        feedback_en: `Correct! "${vocab.headword}" means "${vocab.meaning_en}".`,
      };
    }

    return {
      is_correct: false,
      feedback_vi: `Sai. "${vocab.headword}" có nghĩa là "${vocab.meaning_vi}", không phải "${userAnswer}".`,
      feedback_en: `Incorrect. "${vocab.headword}" means "${vocab.meaning_en}", not "${userAnswer}".`,
    };
  }

  static _typingFeedback(_questionData, userAnswer, vocab) {
    const is_correct = normalize(userAnswer) === normalize(vocab.headword);

    if (is_correct) {
      return {
        is_correct: true,
        feedback_vi: `Chính xác! Từ đúng là "${vocab.headword}".`,
        feedback_en: `Correct! The word is "${vocab.headword}".`,
      };
    }

    return {
      is_correct: false,
      feedback_vi: `Sai. Từ đúng là "${vocab.headword}" (${vocab.part_of_speech}): ${vocab.meaning_vi}.`,
      feedback_en: `Incorrect. The correct word is "${vocab.headword}" (${vocab.part_of_speech}): ${vocab.meaning_en}.`,
    };
  }

  static _spellingFeedback(_questionData, userAnswer, vocab) {
    const is_correct = normalize(userAnswer) === normalize(vocab.headword);
    const distance = levenshtein(userAnswer.toLowerCase(), vocab.headword.toLowerCase());
    const almostRight = !is_correct && distance <= 2;

    if (is_correct) {
      return {
        is_correct: true,
        feedback_vi: `Đúng rồi! Bạn viết đúng từ "${vocab.headword}".`,
        feedback_en: `Well done! You spelled "${vocab.headword}" correctly.`,
      };
    }

    if (almostRight) {
      return {
        is_correct: false,
        feedback_vi: `Gần đúng! Chính tả đúng là "${vocab.headword}".`,
        feedback_en: `Almost! The correct spelling is "${vocab.headword}".`,
      };
    }

    return {
      is_correct: false,
      feedback_vi: `Sai chính tả. Từ đúng là "${vocab.headword}" — ${vocab.meaning_vi}.`,
      feedback_en: `Incorrect spelling. The correct word is "${vocab.headword}" — ${vocab.meaning_en}.`,
    };
  }

  static _fillBlankFeedback(questionData, userAnswer, vocab) {
    const is_correct = normalize(userAnswer) === normalize(vocab.headword);

    if (is_correct) {
      const completeSentence = questionData.sentence_with_blank
        ? questionData.sentence_with_blank.replace('_____', vocab.headword)
        : '';
      return {
        is_correct: true,
        feedback_vi: `Chính xác! Câu hoàn chỉnh: "${completeSentence}"`,
        feedback_en: `Correct! Complete sentence: "${completeSentence}"`,
      };
    }

    return {
      is_correct: false,
      feedback_vi: `Sai. Từ cần điền là "${vocab.headword}": ${vocab.meaning_vi}.`,
      feedback_en: `Incorrect. The missing word is "${vocab.headword}": ${vocab.meaning_en}.`,
    };
  }

  static _matchingFeedback(questionData, userAnswer, vocab) {
    // userAnswer should be a JSON string: [{ headword, meaning }]
    try {
      const submitted = typeof userAnswer === 'string' ? JSON.parse(userAnswer) : userAnswer;
      const correct = typeof questionData.correct_answer === 'string'
        ? JSON.parse(questionData.correct_answer)
        : questionData.correct_answer;

      if (!Array.isArray(submitted) || !Array.isArray(correct)) {
        return { is_correct: false, feedback_vi: 'Định dạng không hợp lệ.', feedback_en: 'Invalid answer format.' };
      }

      const correctPairs = new Set(correct.map(p => `${p.headword}|${p.meaning}`));
      let correctCount = 0;
      for (const pair of submitted) {
        if (correctPairs.has(`${pair.headword}|${pair.meaning}`)) correctCount++;
      }

      const allCorrect = correctCount === correct.length;

      return {
        is_correct: allCorrect,
        feedback_vi: allCorrect
          ? `Xuất sắc! Bạn ghép đúng tất cả ${correctCount} cặp từ.`
          : `Bạn ghép đúng ${correctCount}/${correct.length} cặp. "${vocab.headword}" có nghĩa là "${vocab.meaning_en}".`,
        feedback_en: allCorrect
          ? `Excellent! You matched all ${correctCount} pairs correctly.`
          : `You matched ${correctCount}/${correct.length} pairs. "${vocab.headword}" means "${vocab.meaning_en}".`,
      };
    } catch {
      return {
        is_correct: false,
        feedback_vi: 'Đáp án không hợp lệ.',
        feedback_en: 'Invalid answer format.',
      };
    }
  }
}

/** Case-insensitive normalization */
function normalize(str) {
  return (str || '').trim().toLowerCase();
}

/** Levenshtein distance for "almost correct" spelling detection */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
