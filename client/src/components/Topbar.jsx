import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore.js';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu } from 'lucide-react';
import api from '../api/axios.js';

export default function Topbar({ onMenuClick }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { isDark, toggle: toggleDark } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    logout();
    navigate('/');
  };

  const toggleLang = () => {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
    localStorage.setItem('vocabweb_lang', next);
  };

  return (
    <header className="h-14 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 gap-2 transition-colors duration-200">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Spacer on desktop */}
      <div className="hidden md:block flex-1" />

      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={toggleLang}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          {i18n.language === 'vi' ? 'EN' : 'VI'}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium hidden sm:block truncate max-w-[120px]">{user?.name}</span>
        </div>
        <button onClick={handleLogout} className="btn-ghost text-xs shrink-0">
          {t('nav.logout')}
        </button>
      </div>
    </header>
  );
}
