import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';

export default function LiveTest() {
  const { testId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [joined, setJoined] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const timerRef = useRef(null);
  const sseRef = useRef(null);

  const { data: test } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => api.get(`/tests/${testId}`).then(r => r.data),
  });

  // Join the test
  const joinMutation = useMutation({
    mutationFn: () => api.post(`/tests/${testId}/join`).then(r => r.data),
    onSuccess: (data) => {
      setJoined(true);
      setQuestions(data.questions || []);
      if (test?.time_limit_minutes) {
        setTimeLeft(test.time_limit_minutes * 60);
      }
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/tests/${testId}/submit`, {
      answers: Object.entries(answers).map(([idx, ans]) => ({
        question_index: Number(idx), user_answer: ans,
      })),
    }).then(r => r.data),
    onSuccess: (data) => {
      setSubmitted(true);
      clearInterval(timerRef.current);
    },
  });

  // SSE connection
  useEffect(() => {
    if (!joined || !token) return;
    const url = `${import.meta.env.VITE_API_URL || '/api'}/tests/${testId}/stream`;
    const es = new EventSource(`${url}?token=${token}`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'TEST_ENDED') {
          submitMutation.mutate();
        }
      } catch (_) {}
    };
    return () => es.close();
  }, [joined, token]);

  // Tab visibility tracking
  useEffect(() => {
    if (!joined || submitted) return;

    const logEvent = (type) => {
      api.post(`/tests/${testId}/events`, { event_type: type }).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.hidden) {
        setTabWarnings(w => w + 1);
        logEvent('tab_switch');
      } else {
        logEvent('focus');
      }
    };
    const handleBlur = () => { setTabWarnings(w => w + 1); logEvent('blur'); };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [joined, submitted, testId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { submitMutation.mutate(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!test) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm mx-auto text-center space-y-6 pt-16">
        <div className="text-6xl">🎓</div>
        <h1 className="text-2xl font-bold">Test Submitted!</h1>
        <p className="text-gray-500">Your answers have been submitted. Wait for the teacher to share results.</p>
        <button onClick={() => navigate('/student')} className="btn-primary w-full justify-center">Back to Dashboard</button>
      </motion.div>
    );
  }

  if (!joined) {
    return (
      <div className="max-w-sm mx-auto space-y-6 pt-8">
        <div className="card space-y-4">
          <h1 className="text-xl font-bold">{test.title}</h1>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Level: <strong>{test.level}</strong></p>
            <p>Questions: <strong>{test.num_questions}</strong></p>
            <p>Time: <strong>{test.time_limit_minutes} min</strong></p>
            <p>Status: <span className={`badge ${test.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{test.status}</span></p>
          </div>
          {test.status === 'active' ? (
            <button onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} className="btn-primary w-full justify-center">
              {joinMutation.isPending ? t('common.loading') : t('test.join_test')}
            </button>
          ) : (
            <p className="text-center text-yellow-600 text-sm">Waiting for the teacher to start...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{test.title}</h1>
        <div className="flex items-center gap-3">
          {tabWarnings > 0 && (
            <span className="badge bg-red-100 text-red-700">⚠️ {tabWarnings} tab switch{tabWarnings > 1 ? 'es' : ''}</span>
          )}
          {timeLeft !== null && (
            <span className={`font-mono font-bold text-lg ${timeLeft < 60 ? 'text-red-600' : 'text-gray-800'}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
        {t('test.tab_warning')}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={i} className="card">
            <div className="flex justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">#{i + 1}</span>
              <span className="badge bg-primary-100 text-primary-700 capitalize">{q.question_type?.replace('_', ' ')}</span>
            </div>

            {q.question_type === 'mcq' && (
              <div className="space-y-2">
                <p className="font-semibold">{q.question_data?.prompt}</p>
                {(q.question_data?.options || []).map((opt, j) => (
                  <label key={j} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${answers[i] === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}>
                    <input type="radio" name={`q-${i}`} value={opt.value} onChange={() => setAnswers(a => ({ ...a, [i]: opt.value }))} className="sr-only" />
                    <span className="text-sm">{opt.value}</span>
                  </label>
                ))}
              </div>
            )}

            {(q.question_type === 'typing' || q.question_type === 'spelling' || q.question_type === 'fill_blank') && (
              <div className="space-y-2">
                <p className="font-semibold">{q.question_data?.prompt || q.question_data?.sentence_with_blank}</p>
                {q.question_data?.meaning_vi && <p className="text-sm text-gray-400">{q.question_data.meaning_vi}</p>}
                <input
                  type="text" className="input"
                  placeholder={t('study.type_answer')}
                  value={answers[i] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="btn-primary w-full justify-center py-3">
        {submitMutation.isPending ? t('common.loading') : t('test.submit_test')}
      </button>
    </div>
  );
}
