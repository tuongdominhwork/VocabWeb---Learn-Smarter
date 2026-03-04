import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { BookMarked, Target, PenLine, CheckCircle2, UserPlus } from 'lucide-react';
import { BentoGrid, BentoCard } from '../../components/ui/bento-grid.jsx';

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['study-stats'],
    queryFn: () => api.get('/study/stats').then(r => r.data),
  });

  const { data: classroom } = useQuery({
    queryKey: ['my-classroom'],
    queryFn: () => api.get('/classrooms').then(r => r.data[0] || null),
  });

  const accuracy = stats?.overall?.avg_accuracy
    ? `${Math.round(stats.overall.avg_accuracy)}%`
    : '—';
  const wordsStudied = stats?.overall?.words_studied ?? '—';
  const totalCorrect = stats?.overall?.total_correct ?? '—';

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {user?.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {classroom ? `${t('classroom.joined')}: ${classroom.name}` : t('classroom.not_joined')}
        </p>
      </motion.div>

      <BentoGrid className="lg:grid-rows-2 auto-rows-[14rem]">
        <BentoCard
          name={t('dashboard.words_studied')}
          description={`${wordsStudied} words reviewed so far`}
          href="/student/study"
          cta={t('dashboard.start_study')}
          className="lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2"
          Icon={BookMarked}
          background={<div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/50 dark:to-indigo-900/50" />}
        />
        <BentoCard
          name={t('dashboard.avg_accuracy')}
          description={`Your average accuracy: ${accuracy}`}
          href="/student/progress"
          cta="View Progress"
          className="lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
          Icon={Target}
          background={<div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-violet-50 dark:from-indigo-900/50 dark:to-violet-900/50" />}
        />
        <BentoCard
          name={t('dashboard.take_quiz')}
          description="Complete today's daily quiz to keep your streak going"
          href="/student/daily-quiz"
          cta="Start Quiz"
          className="lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-3"
          Icon={PenLine}
          background={<div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-amber-900/50 dark:to-orange-900/50" />}
        />
        <BentoCard
          name={t('progress.total_correct')}
          description={`${totalCorrect} correct answers total`}
          href="/student/progress"
          cta="Full Progress"
          className="lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3"
          Icon={CheckCircle2}
          background={<div className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/50 dark:to-teal-900/50" />}
        />
        <BentoCard
          name={t('classroom.join_btn')}
          description={classroom ? `You're in: ${classroom.name}` : 'Enter a join code to join your classroom'}
          href="/student/join-classroom"
          cta="Manage Classroom"
          className="lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3"
          Icon={UserPlus}
          background={<div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/50" />}
        />
      </BentoGrid>

      {/* Recent Sessions */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-4">{t('dashboard.recent_sessions')}</h2>
        {stats?.recentSessions?.length ? (
          <div className="space-y-3">
            {stats.recentSessions.map((s) => (
              <div key={s.id} className="card flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{s.level} — {s.session_size} words</p>
                  <p className="text-xs text-gray-500">{new Date(s.started_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{s.correct_count ?? 0}/{s.total_questions} ✓</p>
                  <span className={`badge ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-gray-400 py-10">
            {t('dashboard.no_sessions')}
          </div>
        )}
      </div>
    </div>
  );
}
