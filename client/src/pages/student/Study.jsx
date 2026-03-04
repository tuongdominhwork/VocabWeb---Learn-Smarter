import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore.js';
import api from '../../api/axios.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SIZES = [10, 20, 50];
const SHAKE = { x: [0, -9, 9, -7, 7, -4, 4, 0], transition: { duration: 0.38 } };

function HintBox({ hint }) {
  if (!hint) return null;
  const text = typeof hint === 'string' ? hint : hint.hint_en;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">💡 Hint</p>
      <p className="text-sm text-yellow-800 dark:text-yellow-300">{text}</p>
    </motion.div>
  );
}

// ── Question type components ─────────────────────────────────────────────────

function Flashcard({ question, onAnswer }) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-gray-500">{t('study.flashcard_instruction')}</p>
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer mx-auto max-w-sm h-52 relative"
        style={{ perspective: 1000 }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-0 card flex flex-col items-center justify-center shadow-md backface-hidden">
            <p className="text-3xl font-bold mb-2">{question.question_data.headword}</p>
            <p className="text-gray-400 text-xs mt-1 italic">{question.question_data.part_of_speech}</p>
          </div>
          <div
            className="absolute inset-0 card flex flex-col items-center justify-center shadow-md bg-primary-50"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <p className="text-lg font-semibold text-primary-700">{question.question_data.meaning_en}</p>
            <p className="text-gray-500 text-sm mt-1">{question.question_data.meaning_vi}</p>
            {question.question_data.example_sentence && (
              <p className="text-xs text-gray-400 mt-3 italic">"{question.question_data.example_sentence}"</p>
            )}
          </div>
        </motion.div>
      </div>
      {flipped && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 justify-center">
          <button onClick={() => onAnswer('0', true)} className="btn-primary">{t('study.i_knew_it')}</button>
          <button onClick={() => onAnswer('1', false)} className="btn-secondary">{t('study.i_didnt')}</button>
        </motion.div>
      )}
    </div>
  );
}

function MCQ({ question, onAnswer, shakeTrigger, hint, isLocked }) {
  const [selected, setSelected] = useState(null);
  const [wrongOpt, setWrongOpt] = useState(null);
  const controls = useAnimation();
  const opts = question.question_data.options || [];

  useEffect(() => {
    if (shakeTrigger > 0) {
      controls.start(SHAKE);
      const t = setTimeout(() => { setSelected(null); setWrongOpt(null); }, 620);
      return () => clearTimeout(t);
    }
  }, [shakeTrigger]);

  const handleSelect = (opt) => {
    if (selected !== null || isLocked) return;
    setSelected(opt.value);
    if (!opt.is_correct) setWrongOpt(opt.value);
    onAnswer(opt.value);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-center">{question.question_data.prompt}</p>
      <motion.div animate={controls} className="grid grid-cols-1 gap-3">
        {opts.map((opt, i) => {
          const isWrong = wrongOpt === opt.value;
          const showCorrect = isLocked && opt.is_correct;
          return (
            <button key={i} onClick={() => handleSelect(opt)}
              disabled={isLocked || selected !== null}
              className={`p-4 rounded-xl border-2 text-left text-sm font-medium transition-all duration-200 ${
                showCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700'
                : isWrong ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600'
                : isLocked ? 'border-gray-200 dark:border-gray-700 text-gray-400 opacity-50'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
            >{opt.value}</button>
          );
        })}
      </motion.div>
      <HintBox hint={hint} />
    </div>
  );
}

function TypingQuestion({ question, onAnswer, shakeTrigger, hint, isLocked }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (shakeTrigger > 0) {
      setHasError(true);
      setValue('');
      controls.start(SHAKE);
    }
  }, [shakeTrigger]);

  const submit = () => {
    if (!value.trim() || isLocked) return;
    onAnswer(value.trim());
  };

  return (
    <div className="space-y-5 text-center">
      <p className="text-lg font-semibold">{question.question_data.prompt}</p>
      <motion.div animate={controls}>
        <input
          type="text" value={value}
          onChange={e => { setValue(e.target.value); setHasError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className={`input text-center text-lg max-w-xs mx-auto transition-colors ${
            hasError ? 'border-red-400 focus:border-red-400' : ''
          }`}
          placeholder={t('study.type_answer')}
          disabled={isLocked}
          autoFocus
        />
      </motion.div>
      <HintBox hint={hint} />
      <button onClick={submit} disabled={isLocked || !value.trim()} className="btn-primary">
        {t('study.submit')}
      </button>
    </div>
  );
}

function SpellingQuestion({ question, onAnswer, shakeTrigger, hint, isLocked }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (shakeTrigger > 0) {
      setHasError(true);
      setValue('');
      controls.start(SHAKE);
    }
  }, [shakeTrigger]);

  const submit = () => {
    if (!value.trim() || isLocked) return;
    onAnswer(value.trim());
  };

  return (
    <div className="space-y-5 text-center">
      <p className="text-lg font-semibold">{question.question_data.prompt}</p>
      <div className="space-y-1">
        <p className="text-base text-gray-600 dark:text-gray-300 font-medium">{question.question_data.meaning_en}</p>
      </div>
      <motion.div animate={controls}>
        <input
          type="text" value={value}
          onChange={e => { setValue(e.target.value); setHasError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className={`input text-center text-lg max-w-xs mx-auto transition-colors ${
            hasError ? 'border-red-400 focus:border-red-400' : ''
          }`}
          placeholder={t('study.type_answer')}
          disabled={isLocked}
          autoFocus
        />
      </motion.div>
      <HintBox hint={hint} />
      <button onClick={submit} disabled={isLocked || !value.trim()} className="btn-primary">
        {t('study.submit')}
      </button>
    </div>
  );
}

function FillBlank({ question, onAnswer, shakeTrigger, hint, isLocked }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (shakeTrigger > 0) {
      setHasError(true);
      setValue('');
      controls.start(SHAKE);
    }
  }, [shakeTrigger]);

  const submit = () => {
    if (!value.trim() || isLocked) return;
    onAnswer(value.trim());
  };

  return (
    <div className="space-y-5 text-center">
      <p className="text-sm font-medium text-gray-500">{t('study.fill_blank')}</p>
      <p className="text-xl font-semibold leading-relaxed">{question.question_data.sentence_with_blank}</p>
      <p className="text-sm text-gray-400">{question.question_data.meaning_vi}</p>
      <motion.div animate={controls}>
        <input
          type="text" value={value}
          onChange={e => { setValue(e.target.value); setHasError(false); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className={`input text-center max-w-xs mx-auto transition-colors ${
            hasError ? 'border-red-400 focus:border-red-400' : ''
          }`}
          placeholder={t('study.type_answer')}
          disabled={isLocked}
        />
      </motion.div>
      <HintBox hint={hint} />
      <button onClick={submit} disabled={isLocked || !value.trim()} className="btn-primary">
        {t('study.submit')}
      </button>
    </div>
  );
}

function Matching({ question, onAnswer }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState({ left: null, right: null });
  const [matched, setMatched] = useState([]);

  const left = question.question_data.left_items || [];
  const right = question.question_data.right_items || [];

  const handleLeft = (item) => setSelected(s => ({ ...s, left: item }));
  const handleRight = (item) => {
    if (!selected.left) return;
    const newMatch = { headword: selected.left, meaning: item };
    const updated = [...matched, newMatch];
    setMatched(updated);
    setSelected({ left: null, right: null });
    if (updated.length === left.length) {
      onAnswer(JSON.stringify(updated), null);
    }
  };

  const isMatchedLeft = (item) => matched.some(m => m.headword === item);
  const isMatchedRight = (item) => matched.some(m => m.meaning === item);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">{t('study.matching_instruction')}</p>
      <div className="flex gap-6 justify-center">
        <div className="space-y-2 flex-1">
          {left.map((item, i) => (
            <button key={i} onClick={() => !isMatchedLeft(item) && handleLeft(item)}
              className={`w-full p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                isMatchedLeft(item) ? 'border-green-400 bg-green-50 text-green-700'
                : selected.left === item ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
              }`}
            >{item}</button>
          ))}
        </div>
        <div className="space-y-2 flex-1">
          {right.map((item, i) => (
            <button key={i} onClick={() => !isMatchedRight(item) && handleRight(item)}
              className={`w-full p-3 rounded-xl border-2 text-sm transition-all ${
                isMatchedRight(item) ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-primary-300'
              }`}
            >{item}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Study Component ─────────────────────────────────────────────────────

export default function Study() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isClassroom = user?.student_type === 'classroom';

  const [phase, setPhase] = useState('setup'); // setup | session | complete
  const [level, setLevel] = useState('A1');
  const [size, setSize] = useState(10);
  const [session, setSession] = useState(null);
  const [current, setCurrent] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState(null);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const createMutation = useMutation({
    mutationFn: () => api.post('/study/session/create', { level, session_size: size }).then(r => r.data),
    onSuccess: (data) => { setSession(data); setPhase('session'); setCurrent(0); setScore(0); },
  });

  const answerMutation = useMutation({
    mutationFn: ({ question_id, user_answer }) =>
      api.post('/study/answer', { question_id, user_answer }).then(r => r.data),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/study/session/${session.session_id}/complete`).then(r => r.data),
  });

  const handleAnswer = async (userAnswer) => {
    if (!session || answerMutation.isPending || !!feedback) return;
    const q = session.questions[current];
    const data = await answerMutation.mutateAsync({ question_id: q.id, user_answer: userAnswer });

    if (data.is_correct) {
      setFeedback(data);
      setScore(s => s + 1);
    } else if (q.question_type === 'flashcard' || q.question_type === 'matching') {
      // Self-reported / no retry: just show feedback and let them continue
      setFeedback(data);
    } else {
      const newCount = wrongCount + 1;
      setWrongCount(newCount);
      setShakeTrigger(t => t + 1);
      if (newCount >= 3 && data.hint) setHint(data.hint);
      if (newCount >= 4) setFeedback(data); // reveal answer
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setHint(null);
    setWrongCount(0);
    setShakeTrigger(0);
    if (current + 1 >= session.questions.length) {
      completeMutation.mutate();
      setPhase('complete');
    } else {
      setCurrent(c => c + 1);
    }
  };

  if (phase === 'setup') {
    return (
      <div className="max-w-md mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">{t('study.title')}</h1>
          <p className="text-gray-500 text-sm">
            {isClassroom ? 'Study vocabulary assigned by your teacher.' : t('study.choose_level')}
          </p>
        </motion.div>
        <div className="card space-y-6">
          {/* Level selector — only for individual students */}
          {!isClassroom && (
            <div>
              <label className="label">{t('study.choose_level')}</label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${level === l ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}
                  >{l}</button>
                ))}
              </div>
            </div>
          )}
          {isClassroom && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
              🏫 You're in a classroom. You'll practice vocabulary assigned by your teacher.
            </div>
          )}
          <div>
            <label className="label">{t('study.choose_size')}</label>
            <div className="flex gap-3">
              {SIZES.map(s => (
                <button key={s} onClick={() => setSize(s)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${size === s ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}
                >{s} {t('study.words')}</button>
              ))}
            </div>
          </div>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary w-full justify-center py-3">
            {createMutation.isPending ? t('common.loading') : t('study.start')}
          </button>
          {createMutation.isError && <p className="text-sm text-red-500 text-center">{createMutation.error?.response?.data?.error}</p>}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const total = session?.questions?.length || 0;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="max-w-sm mx-auto text-center space-y-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
          <h1 className="text-2xl font-bold">{t('study.session_complete')}</h1>
          <p className="text-gray-500 mt-2">{t('study.your_score')}: {score}/{total} ({pct}%)</p>
        </motion.div>
        <button onClick={() => { setPhase('setup'); setSession(null); setFeedback(null); }} className="btn-primary w-full justify-center py-3">
          {t('study.study_more')}
        </button>
      </div>
    );
  }

  const q = session?.questions?.[current];
  if (!q) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{t('study.question_of', { current: current + 1, total: session.questions.length })}</span>
          <span>✓ {score}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full">
          <motion.div
            className="h-2 bg-primary-500 rounded-full"
            animate={{ width: `${((current + 1) / session.questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="card"
        >
          <div className="mb-4">
            <span className="badge bg-primary-100 text-primary-700 capitalize">{q.question_type.replace('_', ' ')}</span>
          </div>

          {q.question_type === 'flashcard' && <Flashcard question={q} onAnswer={(ans) => { handleAnswer(ans); }} />}
          {q.question_type === 'mcq' && <MCQ question={q} onAnswer={handleAnswer} shakeTrigger={shakeTrigger} hint={hint} isLocked={!!feedback} />}
          {q.question_type === 'typing' && <TypingQuestion question={q} onAnswer={handleAnswer} shakeTrigger={shakeTrigger} hint={hint} isLocked={!!feedback} />}
          {q.question_type === 'spelling' && <SpellingQuestion question={q} onAnswer={handleAnswer} shakeTrigger={shakeTrigger} hint={hint} isLocked={!!feedback} />}
          {q.question_type === 'fill_blank' && <FillBlank question={q} onAnswer={handleAnswer} shakeTrigger={shakeTrigger} hint={hint} isLocked={!!feedback} />}
          {q.question_type === 'matching' && <Matching question={q} onAnswer={(ans) => handleAnswer(ans)} />}
        </motion.div>
      </AnimatePresence>

      {/* Feedback */}
      {feedback && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className={`card border ${
            feedback.is_correct
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <p className={`font-semibold mb-1 ${
            feedback.is_correct ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {feedback.is_correct ? `✓ ${t('study.correct')}` : `✗ ${t('study.incorrect')}`}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{feedback.feedback_en}</p>
          {!feedback.is_correct && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
              {t('study.hint') ? '(answer revealed after 4 attempts)' : 'Answer revealed.'}
            </p>
          )}
          <button onClick={handleNext} className={`mt-4 ${
            feedback.is_correct ? 'btn-primary' : 'btn-secondary'
          }`}>
            {t('study.next')} →
          </button>
        </motion.div>
      )}

      {/* Wrong attempt counter (visible while retrying) */}
      {!feedback && wrongCount > 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center text-xs text-red-400 dark:text-red-500">
          {wrongCount === 1 && 'Incorrect — try again!'}
          {wrongCount === 2 && 'Still wrong — one more try before a hint appears.'}
          {wrongCount >= 3 && `${wrongCount} incorrect attempts — hint shown above.`}
        </motion.p>
      )}
    </div>
  );
}
