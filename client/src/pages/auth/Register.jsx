import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Eye, EyeOff, BookText, School, User, KeyRound, ArrowLeft } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuthStore } from '../../store/authStore.js';
import { CharactersScene } from '../../components/ui/animated-characters.jsx';

// Step 1: basic info
const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  // Step management: 'info' | 'type' (individual vs classroom)
  const [step, setStep] = useState('info');
  const [step1Data, setStep1Data] = useState(null);
  const [studentType, setStudentType] = useState('individual');
  const [classroomCode, setClassroomCode] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
  });


  // Step 1 submit — validate and move to step 2
  const onStep1 = (data) => {
    setStep1Data({ ...data, role: 'student' });
    setStep('type');
  };

  const handleFinalSubmit = async (infoData, type, code) => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: infoData.name,
        email: infoData.email,
        password: infoData.password,
        role: infoData.role,
        student_type: type,
        ...(code && { classroom_code: code.toUpperCase().trim() }),
      };
      const res = await api.post('/auth/register', payload);
      setAuth(res.data.user, res.data.token);
      navigate('/entrance-exam', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
      setStep('info');
    } finally {
      setLoading(false);
    }
  };

  const onTypeSubmit = () => {
    if (studentType === 'classroom' && !classroomCode.trim()) {
      setError('Please enter a classroom code');
      return;
    }
    handleFinalSubmit(step1Data, studentType, classroomCode);
  };

  const { ref: passRef, onChange: passOnChange, ...passRest } = register('password');

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-end justify-center bg-gradient-to-br from-violet-900 via-indigo-900 to-purple-950 relative overflow-hidden pb-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.3)_0%,_transparent_60%)]" />
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <BookText className="text-white/80" size={22} />
          <span className="text-white/90 font-bold text-xl tracking-tight">VocabWeb</span>
        </div>
        <div className="relative z-10">
          <CharactersScene isTyping={isTyping} showPassword={showPassword} password={passwordValue} />
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm py-8"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <BookText className="text-primary-600" size={22} />
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent">VocabWeb</span>
          </Link>

          <AnimatePresence mode="wait">
            {/* ── STEP 1: Basic info ──────────────────────────────────── */}
            {step === 'info' && (
              <motion.div key="step-info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="card shadow-xl shadow-gray-100/60 dark:shadow-none">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-1">{t('auth.register_title')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('auth.register_sub')}</p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">{error}</div>
                  )}

                  <form onSubmit={handleSubmit(onStep1)} className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="label">{t('auth.name')}</label>
                      <input type="text" className="input" placeholder="John Doe" {...register('name')} />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="label">{t('auth.email')}</label>
                      <input
                        type="email" className="input" placeholder="you@example.com"
                        onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)}
                        {...register('email')}
                      />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="label">{t('auth.password')}</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="input pr-10" placeholder="Min 8 characters"
                          ref={passRef}
                          onChange={(e) => { passOnChange(e); setPasswordValue(e.target.value); }}
                          {...passRest}
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                    </div>

                    <button type="submit" className="btn-primary w-full justify-center py-3">
                      Continue
                    </button>
                  </form>

                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    {t('auth.have_account')}{' '}
                    <Link to="/login" className="text-primary-600 font-medium hover:underline">{t('auth.login_btn')}</Link>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Individual vs Classroom (students only) ──── */}
            {step === 'type' && (
              <motion.div key="step-type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="card shadow-xl shadow-gray-100/60 dark:shadow-none">
                  <button onClick={() => { setStep('info'); setError(''); }}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-5 transition-colors">
                    <ArrowLeft size={15} /> Back
                  </button>

                  <h2 className="text-xl font-bold mb-1">How will you study?</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Choose how you'd like to use VocabWeb.</p>

                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">{error}</div>
                  )}

                  {/* Type picker */}
                  <div className="flex gap-3 mb-6">
                    {[
                      { value: 'individual', icon: User, label: 'Individual', desc: 'Study any level at your own pace' },
                      { value: 'classroom', icon: School, label: 'Classroom', desc: 'Study vocab assigned by teacher' },
                    ].map(({ value, icon: Icon, label, desc }) => (
                      <button key={value} type="button" onClick={() => { setStudentType(value); setError(''); }}
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all
                          ${studentType === value
                            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-600'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}>
                        <Icon size={22} />
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs text-center leading-tight text-gray-500 dark:text-gray-400 font-normal">{desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Classroom code input */}
                  <AnimatePresence>
                    {studentType === 'classroom' && (
                      <motion.div key="code-input" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                        <label className="label">Classroom Code</label>
                        <div className="relative">
                          <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            className="input pl-9 uppercase tracking-widest font-mono"
                            placeholder="e.g. APPLE-1234"
                            value={classroomCode}
                            onChange={e => { setClassroomCode(e.target.value); setError(''); }}
                            maxLength={12}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Enter the code given to you by your teacher.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={onTypeSubmit} disabled={loading} className="btn-primary w-full justify-center py-3">
                    {loading ? t('common.loading') : 'Create Account'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
