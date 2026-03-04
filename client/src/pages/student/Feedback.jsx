import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../api/axios.js';

const typeColor = (type) => ({
  encouragement: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  suggestion: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}[type] || 'bg-gray-100 text-gray-600');

const typeIcon = (type) => ({ encouragement: '🌟', warning: '⚠️', suggestion: '💡', general: '💬' }[type] || '💬');

export default function StudentFeedback() {
  const { t } = useTranslation();

  const { data: feedbackList = [], isLoading } = useQuery({
    queryKey: ['student-feedback'],
    queryFn: () => api.get('/feedback').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('feedback.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">Messages from your teacher</p>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-12">{t('common.loading')}</p>
      ) : feedbackList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">💬</div>
          <p className="font-medium">No feedback yet</p>
          <p className="text-sm mt-1">Your teacher hasn't sent any feedback yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbackList.map((fb, i) => (
            <motion.div
              key={fb.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{typeIcon(fb.feedback_type)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`badge text-xs capitalize ${typeColor(fb.feedback_type)}`}>
                      {fb.feedback_type}
                    </span>
                    {fb.student_id === null && (
                      <span className="text-xs text-gray-400 italic">Class-wide</span>
                    )}
                    {fb.classroom_name && (
                      <span className="text-xs text-gray-500">📚 {fb.classroom_name}</span>
                    )}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200">{fb.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {fb.teacher_name && (
                      <span className="text-xs text-gray-400">From: <strong>{fb.teacher_name}</strong></span>
                    )}
                    <span className="text-xs text-gray-400">{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
