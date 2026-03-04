import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore.js';
import { useEffect } from 'react';
import i18n from './i18n/index.js';

// Layouts
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Public pages
import Landing from './pages/Landing.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import EntranceExam from './pages/auth/EntranceExam.jsx';

// Student pages
import StudentDashboard from './pages/student/Dashboard.jsx';
import Study from './pages/student/Study.jsx';
import DailyQuiz from './pages/student/DailyQuiz.jsx';
import JoinClassroom from './pages/student/JoinClassroom.jsx';
import Progress from './pages/student/Progress.jsx';
import LiveTest from './pages/student/LiveTest.jsx';
import StudentFeedback from './pages/student/Feedback.jsx';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard.jsx';
import ClassroomManagement from './pages/teacher/Classroom.jsx';
import Students from './pages/teacher/Students.jsx';
import VocabManager from './pages/teacher/VocabManager.jsx';
import LiveTestControl from './pages/teacher/LiveTestControl.jsx';
import Feedback from './pages/teacher/Feedback.jsx';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminUsers from './pages/admin/Users.jsx';
import AdminClassrooms from './pages/admin/Classrooms.jsx';
import AdminTeachers from './pages/admin/Teachers.jsx';
import AdminStudents from './pages/admin/Students.jsx';

export default function App() {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();

  // Sync dark mode class on <html> — runs immediately on mount and on every toggle
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDark]);

  // Sync i18n language with user preference
  useEffect(() => {
    if (user?.ui_language) {
      i18n.changeLanguage(user.ui_language);
    }
  }, [user?.ui_language]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Entrance exam — accessible only to authenticated students who haven't taken it */}
        <Route path="/entrance-exam" element={<EntranceExam />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route element={<AppLayout role="student" />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/study" element={<Study />} />
            <Route path="/student/daily-quiz" element={<DailyQuiz />} />
            <Route path="/student/join-classroom" element={<JoinClassroom />} />
            <Route path="/student/progress" element={<Progress />} />
            <Route path="/student/feedback" element={<StudentFeedback />} />
            <Route path="/student/test/:testId" element={<LiveTest />} />
          </Route>
        </Route>

        {/* Teacher */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route element={<AppLayout role="teacher" />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/classroom" element={<ClassroomManagement />} />
            <Route path="/teacher/students" element={<Students />} />
            <Route path="/teacher/vocab" element={<VocabManager />} />
            <Route path="/teacher/tests" element={<LiveTestControl />} />
            <Route path="/teacher/feedback" element={<Feedback />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<AppLayout role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/classrooms" element={<AdminClassrooms />} />
            <Route path="/admin/teachers" element={<AdminTeachers />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
