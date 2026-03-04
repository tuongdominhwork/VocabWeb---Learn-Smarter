import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios.js';

export default function DailyQuiz() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['daily-quiz'],
    queryFn: () => api.get('/daily-quiz/today').then(r => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post('/daily-quiz/submit', payload).then(r => r.data),
    onSuccess: (res) => {
      setResults(res);
      setSubmitted(true);
      qc.invalidateQueries(['daily-quiz']);
    },
  });

  const handleSubmit = () => {
    if (!data) return;
    const answerArray = (data.items || []).map(item => ({
      item_id: item.id,
      user_answer: answers[item.id] || '',
    }));
    submitMutation.mutate({ quiz_id: data.quiz.id, answers: answerArray });
  };

  if (isLoading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  if (!data) return (
    <div className="card text-center py-16">
      <p className="text-4xl mb-4">📚</p>
      <p className="text-gray-500">{t('quiz.no_quiz')}</p>
    </div>
  );

  // No studied words yet
  if (data?.error === 'no_studied_words') {
    return (
      <div className="max-w-md mx-auto text-center card py-16 space-y-4">
        <div className="text-5xl">📖</div>
        <h2 className="text-xl font-bold">Study First!</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Your daily quiz is generated from vocabulary you've already studied. Complete at least one study session to unlock your daily quiz.
        </p>
        <a href="/student/study" className="btn-primary inline-flex justify-center py-3 px-6">
          Start Studying →
        </a>
      </div>
    );
  }

  if (data.already_completed || submitted) {
    const score = results?.score ?? data.quiz?.score;
    const total = results?.total ?? data.quiz?.total_questions;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto text-center space-y-6">
        <div className="text-6xl">{score >= total * 0.8 ? '🎉' : '👏'}</div>
        <h1 className="text-2xl font-bold">{t('quiz.already_done')}</h1>
        <p className="text-gray-600">{t('quiz.score', { score: score ?? '?', total: total ?? '?' })}</p>
        <p className="text-sm text-gray-400 italic">{t('quiz.streak_message')}</p>
      </motion.div>
    );
  }

  const items = data.items || [];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('quiz.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('quiz.subtitle')} — {items.length} questions</p>
      </div>

      <AnimatePresence>
        {items.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">#{i + 1}</span>
              <span className="badge bg-primary-100 text-primary-700 capitalize">{item.question_type.replace('_', ' ')}</span>
            </div>

            {/* MCQ */}
            {item.question_type === 'mcq' && (
              <div className="space-y-2">
                <p className="font-semibold">{item.question_data?.prompt}</p>
                {(item.question_data?.options || []).map((opt, j) => (
                  <label key={j} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${answers[item.id] === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}>
                    <input type="radio" name={item.id} value={opt.value} onChange={() => setAnswers(a => ({ ...a, [item.id]: opt.value }))} className="sr-only" />
                    <span className="text-sm">{opt.value}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Typing / Fill blank / Spelling */}
            {(item.question_type === 'typing' || item.question_type === 'fill_blank' || item.question_type === 'spelling') && (
              <div className="space-y-3">
                <p className="font-semibold">{item.question_data?.prompt || item.question_data?.sentence_with_blank}</p>
                {/* Show meaning_vi only for fill_blank, not for typing or spelling (would give away answer) */}
                {item.question_type === 'fill_blank' && item.question_data?.meaning_vi && (
                  <p className="text-sm text-gray-400">{item.question_data.meaning_vi}</p>
                )}
                <input
                  type="text"
                  className="input"
                  placeholder={t('study.type_answer')}
                  value={answers[item.id] || ''}
                  onChange={(e) => setAnswers(a => ({ ...a, [item.id]: e.target.value }))}
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <button onClick={handleSubmit} disabled={submitMutation.isPending} className="btn-primary w-full justify-center py-3">
        {submitMutation.isPending ? t('common.loading') : t('quiz.submit_quiz')}
      </button>
    </div>
  );
}
