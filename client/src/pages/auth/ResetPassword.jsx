import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import api from '../../api/axios.js';

const schema = z.object({ password: z.string().min(8) });

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }) => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset', { token, password });
      navigate('/login', { state: { message: t('auth.reset_success') } });
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card text-center">
        <p className="text-red-500 mb-4">Invalid or missing token.</p>
        <Link to="/forgot-password" className="btn-primary">Request new link</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/" className="block text-center text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent mb-8">VocabWeb</Link>
        <div className="card shadow-xl">
          <h1 className="text-2xl font-bold mb-1">{t('auth.reset_title')}</h1>
          <p className="text-gray-500 text-sm mb-6">{t('auth.reset_sub')}</p>
          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">{t('auth.new_password')}</label>
              <input type="password" className="input" placeholder="Min 8 characters" {...register('password')} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? t('common.loading') : t('auth.reset_btn')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-primary-600 hover:underline">{t('auth.back_to_login')}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
