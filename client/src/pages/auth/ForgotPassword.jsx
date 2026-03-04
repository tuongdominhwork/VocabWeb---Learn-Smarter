import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import api from '../../api/axios.js';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/request-reset', { email });
      setSent(true);
    } catch { setError(t('common.error')); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-violet-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link to="/" className="block text-center text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent mb-8">VocabWeb</Link>
        <div className="card shadow-xl">
          <h1 className="text-2xl font-bold mb-1">{t('auth.forgot_title')}</h1>
          <p className="text-gray-500 text-sm mb-6">{t('auth.forgot_sub')}</p>
          {sent ? (
            <div className="p-4 rounded-xl bg-green-50 text-green-700 text-sm text-center">{t('auth.email_sent')}</div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
              <div>
                <label className="label">{t('auth.email')}</label>
                <input type="email" className="input" placeholder="you@example.com" {...register('email', { required: true })} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? t('common.loading') : t('auth.forgot_btn')}
              </button>
            </form>
          )}
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-primary-600 hover:underline">{t('auth.back_to_login')}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
