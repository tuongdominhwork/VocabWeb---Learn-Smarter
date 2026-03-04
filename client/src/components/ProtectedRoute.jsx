import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ROLE_HOME = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin',
};

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their appropriate home
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }

  // Students must complete entrance exam before accessing any protected route
  if (user.role === 'student' && !user.entrance_exam_completed) {
    return <Navigate to="/entrance-exam" replace />;
  }

  return <Outlet />;
}
