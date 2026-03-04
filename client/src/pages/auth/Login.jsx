import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Eye, EyeOff, BookText } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { CharactersScene } from '../../components/ui/animated-characters.jsx';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.token);
      const role = res.data.user.role;
      navigate(role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const { ref: passRef, onChange: passOnChange, ...passRest } = register('password');

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* ── Left panel: animated characters ─────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-end justify-center bg-gradient-to-br from-violet-900 via-indigo-900 to-purple-950 relative overflow-hidden pb-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.3)_0%,_transparent_60%)]" />
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BookText className="text-white/80" size={22} />
            <span className="text-white/90 font-bold text-xl tracking-tight">VocabWeb</span>
          </Link>
        </div>
        <div className="relative z-10">
          <CharactersScene isTyping={isTyping} showPassword={showPassword} password={passwordValue} />
        </div>
      </div>

      {/* ── Right panel: form ────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <BookText className="text-primary-600" size={22} />
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent">VocabWeb</span>
          </Link>

          <div className="card shadow-xl shadow-gray-100/60 dark:shadow-none">
            <h1 className="text-2xl font-bold mb-1">{t('auth.login_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t('auth.login_sub')}</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label className="label">{t('auth.email')}</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="label mb-0">{t('auth.password')}</label>
                  <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                    {t('auth.forgot_password')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    ref={passRef}
                    onChange={(e) => { passOnChange(e); setPasswordValue(e.target.value); }}
                    {...passRest}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? t('common.loading') : t('auth.login_btn')}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              {t('auth.no_account')}{' '}
              <Link to="/register" className="text-primary-600 font-medium hover:underline">
                {t('landing.get_started')}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
