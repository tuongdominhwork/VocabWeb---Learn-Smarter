/**
 * HintService — deterministic hints using only database vocabulary data.
 * Level 1 (3rd wrong attempt): first letter + word length
 * Level 2 (4th wrong attempt): example sentence with blank + part of speech
 */
export function getHint(vocab, questionType, hintLevel) {
  if (!vocab || !hintLevel) return null;

  const word = vocab.headword || '';
  const first = word[0] || '';
  const len = word.length;
  const example = vocab.example_sentence || '';
  const pos = vocab.part_of_speech || '';
  const meaningPart = vocab.meaning_en ? vocab.meaning_en.split(' ').slice(0, 3).join(' ') + '…' : '';

  if (hintLevel === 1) {
    // Level 1: first letter, word length, partial meaning
    return {
      level: 1,
      hint_en: `The word starts with "${first.toUpperCase()}" and has ${len} letter${len !== 1 ? 's' : ''}. (${pos})`,
      hint_vi: `Từ bắt đầu bằng "${first.toUpperCase()}" và có ${len} chữ cái. (${pos})`,
      first_letter: first.toUpperCase(),
      word_length: len,
      part_of_speech: pos,
    };
  }

  if (hintLevel >= 2) {
    // Level 2: example sentence with blank + partial meaning
    const blankSentence = example
      ? example.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, 'i'), '_____')
      : null;

    return {
      level: 2,
      hint_en: `It's a ${pos}. Meaning hint: "${meaningPart}". ${blankSentence ? `Example: "${blankSentence}"` : ''}`,
      hint_vi: `Đây là ${pos}. Gợi ý nghĩa: "${vocab.meaning_vi?.split(' ').slice(0, 3).join(' ')}…". ${blankSentence ? `Ví dụ: "${blankSentence}"` : ''}`,
      first_letter: first.toUpperCase(),
      word_length: len,
      part_of_speech: pos,
      meaning_partial: meaningPart,
      example_with_blank: blankSentence,
    };
  }

  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
