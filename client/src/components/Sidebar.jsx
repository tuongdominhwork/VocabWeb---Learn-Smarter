import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  LayoutDashboard, BookOpen, PenLine, DoorOpen, BarChart2,
  School, Users, BookMarked, Zap, MessageSquare,
  User, Building2, BookText, GraduationCap,
} from 'lucide-react';

const STUDENT_LINKS = [
  { to: '/student', label: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { to: '/student/study', label: 'nav.study', icon: BookOpen },
  { to: '/student/daily-quiz', label: 'nav.quiz', icon: PenLine },
  { to: '/student/join-classroom', label: 'nav.classroom', icon: DoorOpen },
  { to: '/student/progress', label: 'nav.progress', icon: BarChart2 },
  { to: '/student/feedback', label: 'nav.feedback', icon: MessageSquare },
];

const TEACHER_LINKS = [
  { to: '/teacher', label: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { to: '/teacher/classroom', label: 'nav.classroom', icon: School },
  { to: '/teacher/students', label: 'nav.students', icon: Users },
  { to: '/teacher/vocab', label: 'nav.vocab', icon: BookMarked },
  { to: '/teacher/tests', label: 'nav.tests', icon: Zap },
  { to: '/teacher/feedback', label: 'nav.feedback', icon: MessageSquare },
];

const ADMIN_LINKS = [
  { to: '/admin', label: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'nav.users', icon: User },
  { to: '/admin/students', label: 'nav.students', icon: Users },
  { to: '/admin/classrooms', label: 'nav.classrooms', icon: Building2 },
  { to: '/admin/teachers', label: 'nav.teachers', icon: GraduationCap },
];

const LINKS_BY_ROLE = { student: STUDENT_LINKS, teacher: TEACHER_LINKS, admin: ADMIN_LINKS };

function SidebarContent({ role, onClose }) {
  const { t } = useTranslation();
  const links = LINKS_BY_ROLE[role] || [];

  return (
    <div className="flex flex-col h-full py-6 px-3">
      {/* Logo + close button */}
      <div className="px-3 mb-8 flex items-center justify-between">
        <Link
          to={`/${role}`}
          onClick={onClose}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
        >
          <BookText size={20} className="text-primary-600 shrink-0" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent truncate">
            VocabWeb
          </span>
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const IconComp = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`
              }
            >
              <IconComp size={17} strokeWidth={1.8} className="shrink-0" />
              <span className="truncate">{t(link.label)}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Role badge */}
      <div className="px-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{role}</span>
      </div>
    </div>
  );
}

export default function Sidebar({ role, isOpen, onClose }) {
  return (
    <>
      {/* Desktop: always-visible sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex w-56 shrink-0 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800/80 transition-colors duration-200"
      >
        <SidebarContent role={role} onClose={() => {}} />
      </motion.aside>

      {/* Mobile: slide-over */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800/80 md:hidden shadow-2xl"
          >
            <SidebarContent role={role} onClose={onClose} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
