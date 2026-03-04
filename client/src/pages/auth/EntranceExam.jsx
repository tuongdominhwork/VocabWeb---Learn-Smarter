import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BookText, ChevronRight, SkipForward, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';

const LEVEL_COLORS = {
  A1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  A2: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  B1: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  B2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  C1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  C2: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function EntranceExam() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [answers, setAnswers] = useState({}); // vocab_id -> option value
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState('intro'); // intro | exam | result

  const { data, isLoading } = useQuery({
    queryKey: ['entrance-exam-questions'],
    queryFn: () => api.get('/entrance-exam/questions').then(r => r.data),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post('/entrance-exam/submit', payload).then(r => r.data),
    onSuccess: (res) => {
      updateUser({ entrance_exam_completed: 1, vocab_level: res.estimated_level });
      setPhase('result');
    },
  });

  const skipMutation = useMutation({
    mutationFn: () => api.post('/entrance-exam/skip').then(r => r.data),
    onSuccess: () => {
      updateUser({ entrance_exam_completed: 1, vocab_level: 'A1' });
      navigate('/student', { replace: true });
    },
  });

  // Already completed
  if (data?.already_completed) {
    navigate('/student', { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-400">Loading exam…</div>
      </div>
    );
  }

  const questions = data?.questions || [];
  const noVocab = data?.no_vocab || questions.length === 0;

  const handleAnswer = (vocabId, value) => {
    setAnswers(prev => ({ ...prev, [vocabId]: value }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      // Submit
      const payload = {
        answers: questions.map(q => ({
          vocab_id: q.id,
          user_answer: answers[q.id] || '',
        })),
      };
      submitMutation.mutate(payload);
    }
  };

  const q = questions[current];
  const isLastQ = current === questions.length - 1;

  // ── Intro screen ────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg">
              <BookText size={32} className="text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Entrance Exam</h1>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Welcome, <span className="font-semibold text-gray-800 dark:text-gray-200">{user?.name}</span>! 👋
              <br /><br />
              We have a short <strong>{noVocab ? 0 : questions.length}-question</strong> assessment to figure out your current vocabulary level. It takes about 3–5 minutes.
              <br /><br />
              Your result will help us personalise your learning journey.
            </p>
          </div>

          {noVocab ? (
            <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-300 p-4">
              No vocabulary is in the system yet. You'll start at A1 and can change it later.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-sm">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                <div key={l} className={`py-2 px-3 rounded-xl font-semibold text-center ${LEVEL_COLORS[l]}`}>{l}</div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => skipMutation.mutate()}
              disabled={skipMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 transition-all text-sm font-medium"
            >
              <SkipForward size={15} />
              {skipMutation.isPending ? 'Skipping…' : 'Skip for now'}
            </button>
            {!noVocab && (
              <button onClick={() => setPhase('exam')} className="flex-1 btn-primary justify-center py-3">
                Start Exam
              </button>
            )}
            {noVocab && (
              <button onClick={() => skipMutation.mutate()} disabled={skipMutation.isPending} className="flex-1 btn-primary justify-center py-3">
                {skipMutation.isPending ? 'Loading…' : 'Continue →'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (phase === 'result') {
    const res = submitMutation.data;
    const level = res?.estimated_level || 'A1';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 size={64} className="text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Exam Complete!</h1>
            <p className="text-gray-500 dark:text-gray-400">Based on your answers, your estimated vocabulary level is:</p>
          </div>
          <div className={`text-6xl font-black py-8 rounded-2xl ${LEVEL_COLORS[level]}`}>{level}</div>
          {res?.level_scores && (
            <div className="card text-left space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Score by level</p>
              {Object.entries(res.level_scores).filter(([, s]) => s.total > 0).map(([lvl, s]) => (
                <div key={lvl} className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${LEVEL_COLORS[lvl]}`}>{lvl}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${(s.correct / s.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{s.correct}/{s.total}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/student', { replace: true })} className="btn-primary w-full justify-center py-3">
            Start Learning →
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Exam screen ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookText size={18} className="text-primary-600" />
          <span className="font-bold text-sm">Entrance Exam</span>
        </div>
        <span className="text-sm text-gray-500">{current + 1} / {questions.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-800">
        <motion.div
          className="h-full bg-primary-500"
          animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${LEVEL_COLORS[q.level]}`}>{q.level}</span>
                </div>

                <p className="text-lg font-semibold mb-5">{q.prompt}</p>

                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(q.id, opt.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 text-sm transition-all ${
                        answers[q.id] === opt.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                      }`}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={!answers[q.id] || submitMutation.isPending}
                  className="btn-primary w-full justify-center py-3 mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitMutation.isPending ? 'Submitting…' : isLastQ ? 'Submit' : (
                    <span className="flex items-center gap-2">Next <ChevronRight size={16} /></span>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
