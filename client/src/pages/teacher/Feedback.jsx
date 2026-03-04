import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios.js';

const FEEDBACK_TYPES = ['encouragement', 'warning', 'suggestion', 'general'];

const schema = z.object({
  type: z.string().min(1),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  student_id: z.string().optional(),
});

export default function TeacherFeedback() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: classrooms = [] } = useQuery({
    queryKey: ['teacher-classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  });

  const [selectedClassroom, setSelectedClassroom] = useState(null);

  const { data: students = [] } = useQuery({
    queryKey: ['classroom-students', selectedClassroom],
    queryFn: () => api.get(`/classrooms/${selectedClassroom}/students`).then(r => r.data),
    enabled: !!selectedClassroom,
  });

  const { data: feedbackList = [], isLoading } = useQuery({
    queryKey: ['feedback-list'],
    queryFn: () => api.get('/feedback').then(r => r.data),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['feedback-history', selectedFeedbackId],
    queryFn: () => api.get(`/feedback/${selectedFeedbackId}/history`).then(r => r.data),
    enabled: !!selectedFeedbackId && showHistory,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'general' },
  });

  const createMutation = useMutation({
    mutationFn: ({ type, message, student_id }) => api.post('/feedback', {
      feedback_type: type,
      content: message,
      student_id: student_id || undefined,
      classroom_id: selectedClassroom || undefined,
    }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feedback-list'] }); reset(); },
  });

  const typeColor = (type) => ({
    encouragement: 'bg-green-100 text-green-700',
    warning: 'bg-red-100 text-red-600',
    suggestion: 'bg-blue-100 text-blue-700',
    general: 'bg-gray-100 text-gray-600',
  }[type] || 'bg-gray-100 text-gray-600');

  const typeIcon = (type) => ({ encouragement: '🌟', warning: '⚠️', suggestion: '💡', general: '💬' }[type] || '💬');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('feedback.title')}</h1>

      {/* Send Feedback Form */}
      <div className="card">
        <h2 className="font-semibold mb-4">Send Feedback</h2>
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Classroom (optional)</label>
              <select className="input" value={selectedClassroom || ''} onChange={e => setSelectedClassroom(e.target.value || null)}>
                <option value="">Select classroom...</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Student (leave blank for class-wide)</label>
              <select {...register('student_id')} className="input" disabled={!selectedClassroom}>
                <option value="">All students</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type *</label>
              <select {...register('type')} className="input">
                {FEEDBACK_TYPES.map(tp => <option key={tp} value={tp} className="capitalize">{tp.charAt(0).toUpperCase() + tp.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea {...register('message')} className="input min-h-24 resize-none" rows={4} placeholder="Write your feedback here..." />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full sm:w-auto justify-center">
            {createMutation.isPending ? t('common.loading') : '📨 Send Feedback'}
          </button>
        </form>
      </div>

      {/* Feedback History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Sent Feedback</h2>
        {isLoading ? (
          <p className="text-center text-gray-400">{t('common.loading')}</p>
        ) : feedbackList.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">💬</div><p>No feedback sent yet.</p></div>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((fb, i) => (
              <motion.div key={fb.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl mt-0.5">{typeIcon(fb.feedback_type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`badge text-xs ${typeColor(fb.feedback_type)} capitalize`}>{fb.feedback_type}</span>
                        {fb.student_name ? (
                          <span className="text-xs text-gray-500">To: <strong>{fb.student_name}</strong></span>
                        ) : (
                          <span className="text-xs text-gray-400">Class-wide</span>
                        )}
                      </div>
                      <p className="text-gray-800 text-sm">{fb.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(fb.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedFeedbackId(fb.id); setShowHistory(h => !h || selectedFeedbackId !== fb.id); }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    📋 History
                  </button>
                </div>

                {selectedFeedbackId === fb.id && showHistory && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {history.length === 0 ? (
                      <p className="text-xs text-gray-400">No edit history.</p>
                    ) : history.map((h, j) => (
                      <div key={j} className="text-xs text-gray-500 p-2 bg-gray-50 rounded-lg">
                        <p className="text-gray-700">{h.previous_message}</p>
                        <p className="text-gray-400 mt-1">{new Date(h.changed_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
