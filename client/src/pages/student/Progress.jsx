import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../api/axios.js';

function LevelBar({ level, studied, accuracy }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{level}</span>
        <span className="text-gray-500">{studied} words · {Math.round(accuracy || 0)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full">
        <motion.div
          className="h-2 bg-primary-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(accuracy || 0, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function Progress() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['study-stats'],
    queryFn: () => api.get('/study/stats').then(r => r.data),
  });

  if (isLoading) return <div className="text-center py-20 text-gray-400">{t('common.loading')}</div>;

  const overall = data?.overall;
  const byLevel = data?.byLevel || [];
  const recent = data?.recentSessions || [];

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold">{t('progress.title')}</h1>
      </motion.div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: t('progress.words_studied'), value: overall?.words_studied ?? 0, icon: '📚' },
          { label: t('progress.avg_accuracy'), value: `${Math.round(overall?.avg_accuracy || 0)}%`, icon: '🎯' },
          { label: t('progress.total_correct'), value: overall?.total_correct ?? 0, icon: '✅' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card">
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* By Level */}
      {byLevel.length > 0 && (
        <div className="card space-y-4">
          <h2 className="font-semibold">{t('progress.by_level')}</h2>
          {byLevel.map((l, i) => (
            <motion.div key={l.level} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
              <LevelBar level={l.level} studied={l.words_studied} accuracy={l.avg_accuracy} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent Sessions */}
      <div>
        <h2 className="font-semibold mb-4">{t('progress.recent')}</h2>
        {recent.length ? (
          <div className="space-y-3">
            {recent.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium text-sm">{s.level} · {s.session_size} words</p>
                  <p className="text-xs text-gray-400">{new Date(s.started_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{s.correct_count ?? 0}/{s.total_questions}</p>
                  <span className={`badge text-xs ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-gray-400 py-12">{t('progress.no_data')}</div>
        )}
      </div>
    </div>
  );
}
