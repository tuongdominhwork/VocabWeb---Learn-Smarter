import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const schema = z.object({
  title: z.string().min(2, 'Required'),
  level: z.string().min(1),
  num_questions: z.coerce.number().min(1).max(50),
  time_limit_minutes: z.coerce.number().min(1).max(120),
  classroom_id: z.string().optional(),
});

export default function LiveTestControl() {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [activeTestId, setActiveTestId] = useState(null);
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState(null);
  const sseRef = useRef(null);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests-list'],
    queryFn: () => api.get('/tests').then(r => r.data),
  });

  const { data: classrooms = [] } = useQuery({
    queryKey: ['teacher-classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(schema), defaultValues: { level: 'A1', num_questions: 10, time_limit_minutes: 15 } });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/tests', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tests-list'] }); reset(); },
  });

  const startMutation = useMutation({
    mutationFn: (id) => api.post(`/tests/${id}/start`).then(r => r.data),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ['tests-list'] }); setActiveTestId(id); connectSSE(id); },
  });

  const endMutation = useMutation({
    mutationFn: (id) => api.post(`/tests/${id}/end`).then(r => r.data),
    onSuccess: async (_, id) => {
      qc.invalidateQueries({ queryKey: ['tests-list'] });
      const res = await api.get(`/tests/${id}/results`);
      setResults(res.data);
      sseRef.current?.close();
      setActiveTestId(null);
    },
  });

  const connectSSE = (testId) => {
    if (sseRef.current) sseRef.current.close();
    const url = `${import.meta.env.VITE_API_URL || '/api'}/tests/${testId}/stream?token=${token}`;
    const es = new EventSource(url);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type !== 'heartbeat') {
          setEvents(prev => [{ ...data, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
        }
      } catch (_) {}
    };
  };

  useEffect(() => () => sseRef.current?.close(), []);

  const eventIcon = (type) => ({ STUDENT_JOINED: '🟢', STUDENT_SUBMITTED: '✅', STUDENT_EVENT: '⚠️', TEST_STARTED: '🚀', TEST_ENDED: '🏁' }[type] || '📡');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('test.title')}</h1>

      {/* Create Form */}
      <div className="card">
        <h2 className="font-semibold mb-4">Create New Test</h2>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Title *</label><input {...register('title')} className="input" placeholder="Midterm Test A1" /></div>
          <div><label className="label">Level *</label>
            <select {...register('level')} className="input">{LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
          <div><label className="label">Classroom</label>
            <select {...register('classroom_id')} className="input">
              <option value="">All students</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className="label">Questions</label><input type="number" {...register('num_questions')} className="input" /></div>
          <div><label className="label">Time Limit (min)</label><input type="number" {...register('time_limit_minutes')} className="input" /></div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
              {createMutation.isPending ? t('common.loading') : 'Create Test'}
            </button>
          </div>
        </form>
      </div>

      {/* Tests List */}
      {isLoading ? <p className="text-center text-gray-400">{t('common.loading')}</p> : (
        <div className="space-y-3">
          {tests.map(test => (
            <motion.div key={test.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold">{test.title}</h3>
                  <p className="text-sm text-gray-500">{test.level} · {test.num_questions} Qs · {test.time_limit_minutes} min · {new Date(test.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${test.status === 'active' ? 'bg-green-100 text-green-700' : test.status === 'ended' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>{test.status}</span>
                  {test.status === 'pending' && (
                    <button onClick={() => startMutation.mutate(test.id)} className="btn-primary text-sm px-4 py-2">🚀 Start</button>
                  )}
                  {test.status === 'active' && (
                    <button onClick={() => endMutation.mutate(test.id)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">🏁 End Test</button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* SSE Event Feed */}
      {activeTestId && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Live Feed</h2>
            <span className="flex items-center gap-2 text-xs text-green-600"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span>Live</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {events.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Waiting for events...</p> : events.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-gray-50">
                <span>{eventIcon(ev.type)}</span>
                <span className="flex-1 text-gray-700">{ev.type}: {ev.student_name || ev.message || JSON.stringify(ev.data || {})}</span>
                <span className="text-xs text-gray-400">{ev.ts}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="card">
          <h2 className="font-semibold mb-4">Test Results</h2>
          {results.length === 0 ? <p className="text-gray-400 text-sm">No submissions yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr>{['Student', 'Score', 'Tab Switches', 'Submitted At'].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {results.map(r => (
                  <tr key={r.student_id}>
                    <td className="px-3 py-2 font-medium">{r.full_name}</td>
                    <td className="px-3 py-2"><span className={`badge ${r.score >= 80 ? 'bg-green-100 text-green-700' : r.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>{r.score ?? '—'}%</span></td>
                    <td className="px-3 py-2">{r.tab_switch_count > 0 ? <span className="text-red-600 font-medium">⚠️ {r.tab_switch_count}</span> : '—'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString() : 'Not submitted'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
