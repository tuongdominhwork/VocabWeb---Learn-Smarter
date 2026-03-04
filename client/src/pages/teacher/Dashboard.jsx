import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { Users, School, BookOpen, MessageSquare, Zap } from 'lucide-react';
import { BentoGrid, BentoCard } from '../../components/ui/bento-grid.jsx';

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: classrooms } = useQuery({ queryKey: ['teacher-classrooms'], queryFn: () => api.get('/classrooms').then(r => r.data) });
  const { data: vocab } = useQuery({ queryKey: ['vocab-count'], queryFn: () => api.get('/vocab?limit=1').then(r => r.data) });
  const { data: tests } = useQuery({ queryKey: ['tests-list'], queryFn: () => api.get('/tests').then(r => r.data) });

  const activeTests = Array.isArray(tests) ? tests.filter(t => t.status === 'active').length : 0;
  const totalStudents = Array.isArray(classrooms) ? classrooms.reduce((s, c) => s + (c.student_count || 0), 0) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {user?.name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here's your class overview</p>
      </div>

      <BentoGrid className="lg:grid-rows-2 auto-rows-[14rem]">
        <BentoCard
          name="Total Students"
          description={`${totalStudents} students enrolled across your classrooms`}
          href="/teacher/students"
          cta="View Students"
          className="lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-2"
          Icon={Users}
          background={<div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-blue-900/50 dark:to-indigo-900/50" />}
        />
        <BentoCard
          name="Classrooms"
          description={`${classrooms?.length ?? 0} active classroom${classrooms?.length !== 1 ? 's' : ''}`}
          href="/teacher/classroom"
          cta="Manage Classrooms"
          className="lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
          Icon={School}
          background={<div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/50 dark:to-violet-900/50" />}
        />
        <BentoCard
          name="Vocab Manager"
          description={`${vocab?.total ?? 0} words in the library. Add, approve and import words.`}
          href="/teacher/vocab"
          cta="Manage Vocab"
          className="lg:col-start-1 lg:col-end-2 lg:row-start-2 lg:row-end-3"
          Icon={BookOpen}
          background={<div className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/50 dark:to-teal-900/50" />}
        />
        <BentoCard
          name="Student Feedback"
          description="Send encouragement, warnings or suggestions to your students"
          href="/teacher/feedback"
          cta="Write Feedback"
          className="lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3"
          Icon={MessageSquare}
          background={<div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-amber-900/50 dark:to-orange-900/50" />}
        />
        <BentoCard
          name="Live Test"
          description={`${activeTests} test${activeTests !== 1 ? 's' : ''} active now. Start, monitor and end live tests.`}
          href="/teacher/tests"
          cta="Control Tests"
          className="lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-3"
          Icon={Zap}
          background={<div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/50 dark:to-pink-900/50" />}
        />
      </BentoGrid>
    </div>
  );
}
