import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { Users, Building2, Lock, GraduationCap } from 'lucide-react';
import { BentoGrid, BentoCard } from '../../components/ui/bento-grid.jsx';

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data: users } = useQuery({
    queryKey: ['admin-users', 1],
    queryFn: () => api.get('/me/all?page=1&limit=1').then(r => r.data),
  });

  const { data: classrooms } = useQuery({
    queryKey: ['admin-classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  });

  const usersByRole = users?.breakdown || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">System-wide overview</p>
      </div>

      <BentoGrid className="lg:grid-rows-2 auto-rows-[14rem]">
        <BentoCard
          name="Total Users"
          description={`${users?.total ?? 0} registered users · ${usersByRole.student ?? 0} students, ${usersByRole.teacher ?? 0} teachers`}
          href="/admin/users"
          cta="Manage Users"
          className="lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3"
          Icon={Users}
          background={<div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-blue-100 dark:from-blue-900/50 dark:to-indigo-900/50" />}
        />
        <BentoCard
          name="Classrooms"
          description={`${Array.isArray(classrooms) ? classrooms.length : 0} classrooms across all teachers`}
          href="/admin/classrooms"
          cta="View Classrooms"
          className="lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2"
          Icon={Building2}
          background={<div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/50 dark:to-violet-900/50" />}
        />
        <BentoCard
          name="Students"
          description={`${usersByRole.student ?? 0} student account${usersByRole.student !== 1 ? 's' : ''} registered on the platform`}
          href="/admin/students"
          cta="Manage Students"
          className="lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3"
          Icon={Users}
          background={<div className="absolute inset-0 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/50 dark:to-teal-900/50" />}
        />
        <BentoCard
          name="Locked Accounts"
          description={`${users?.locked_count ?? 0} account${users?.locked_count !== 1 ? 's' : ''} currently locked. Review and unlock if needed.`}
          href="/admin/users"
          cta="Review Accounts"
          className="lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2"
          Icon={Lock}
          background={<div className="absolute inset-0 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/50 dark:to-pink-900/50" />}
        />
        <BentoCard
          name="Teachers"
          description={`${usersByRole.teacher ?? 0} teacher account${usersByRole.teacher !== 1 ? 's' : ''} · ${usersByRole.admin ?? 0} admin${usersByRole.admin !== 1 ? 's' : ''}`}
          href="/admin/teachers"
          cta="Manage Teachers"
          className="lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3"
          Icon={GraduationCap}
          background={<div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-amber-900/50 dark:to-orange-900/50" />}
        />
      </BentoGrid>
    </div>
  );
}
