import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore.js';
import { AuroraBackground } from '../components/ui/aurora-background.jsx';
import { GraduationCap, Layers, Languages, Radio, BarChart3, Sun, Moon } from 'lucide-react';
import { BentoGrid, BentoCard } from '../components/ui/bento-grid.jsx';
import { useThemeStore } from '../store/themeStore.js';
import { ContainerScroll } from '../components/ui/container-scroll-animation.jsx';
import { StaggerTestimonials } from '../components/ui/stagger-testimonials.jsx';

const HOW_STEPS = ['step1', 'step2', 'step3'];

function FadeUp({ children, delay = 0, className = '' }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 28 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const { isDark, toggle: toggleDark } = useThemeStore();
  const reduced = useReducedMotion();

  const dashPath = user ? `/${user.role}` : '/student';

  const toggleLang = () => {
    const next = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-x-hidden transition-colors duration-200">
      {/* ─── Navbar ─────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 glass dark:!bg-gray-900/90 dark:!border-gray-800/60 border-b border-gray-100/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent select-none">
            VocabWeb
          </span>
          <nav className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {i18n.language === 'vi' ? 'EN' : 'VI'}
            </button>
            {isAuthenticated ? (
              <Link to={dashPath} className="btn-primary text-sm">
                {t('nav.dashboard')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">
                  {t('landing.login')}
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  {t('landing.get_started')}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <AuroraBackground className="pt-36 pb-28 px-6 text-center min-h-0 w-full">
        <div className="max-w-3xl mx-auto w-full relative z-10">
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8">
              🎓 CEFR A1 – C2
            </span>
          </motion.div>

          <motion.h1
            initial={reduced ? {} : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-3"
          >
            {t('landing.hero_headline')}
          </motion.h1>
          <motion.h1
            initial={reduced ? {} : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight bg-gradient-to-r from-primary-600 to-violet-500 bg-clip-text text-transparent mb-8"
          >
            {t('landing.hero_headline2')}
          </motion.h1>

          <motion.p
            initial={reduced ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed"
          >
            {t('landing.hero_sub')}
          </motion.p>

          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.38 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="btn-primary text-base px-7 py-3 shadow-lg shadow-primary-200">
              {t('landing.get_started')} →
            </Link>
            <Link to="/login" className="btn-secondary text-base px-7 py-3">
              {t('landing.login')}
            </Link>
          </motion.div>
        </div>
      </AuroraBackground>

      {/* ─── Scroll Preview ───────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-950 overflow-hidden">
        <ContainerScroll
          titleComponent={
            <FadeUp>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary-500 mb-2">See it in action</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                Everything you need,<br />
                <span className="bg-gradient-to-r from-primary-600 to-violet-500 bg-clip-text text-transparent">
                  in one dashboard
                </span>
              </h2>
            </FadeUp>
          }
        >
          <img
            src="/preview.png"
            alt="VocabWeb app preview"
            className="w-full h-full object-cover object-top rounded-2xl"
            draggable={false}
          />
        </ContainerScroll>
      </section>
      <section className="py-24 px-6 bg-gray-50/60 dark:bg-gray-900/60">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.features_title')}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('landing.features_sub')}</p>
          </FadeUp>

          <BentoGrid className="lg:grid-rows-3">
            {/* Large tall card — CEFR levels */}
            <BentoCard
              name={t('landing.feature_cefr')}
              description={t('landing.feature_cefr_desc')}
              href="/register"
              cta={t('landing.get_started')}
              className="lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3"
              Icon={GraduationCap}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-violet-50 dark:from-indigo-900/50 dark:via-gray-900 dark:to-violet-900/50 opacity-80" />
              }
            />
            {/* Top-left wide */}
            <BentoCard
              name={t('landing.feature_modes')}
              description={t('landing.feature_modes_desc')}
              href="/register"
              cta={t('landing.get_started')}
              className="lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3"
              Icon={Layers}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/50 dark:to-indigo-900/50 opacity-80" />
              }
            />
            {/* Bottom-left */}
            <BentoCard
              name={t('landing.feature_bilingual')}
              description={t('landing.feature_bilingual_desc')}
              href="/register"
              cta={t('landing.get_started')}
              className="lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4"
              Icon={Languages}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/50 dark:to-green-900/50 opacity-80" />
              }
            />
            {/* Top-right */}
            <BentoCard
              name={t('landing.feature_live')}
              description={t('landing.feature_live_desc')}
              href="/register"
              cta={t('landing.get_started')}
              className="lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2"
              Icon={Radio}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-amber-900/50 dark:to-orange-900/50 opacity-80" />
              }
            />
            {/* Bottom-right tall */}
            <BentoCard
              name={t('landing.feature_progress')}
              description={t('landing.feature_progress_desc')}
              href="/register"
              cta={t('landing.get_started')}
              className="lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-4"
              Icon={BarChart3}
              background={
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/50 dark:to-purple-900/50 opacity-80" />
              }
            />
          </BentoGrid>
        </div>
      </section>
      <section className="py-24 px-6 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">{t('landing.how_title')}</h2>
          </FadeUp>

          <div className="flex flex-col md:flex-row gap-8">
            {HOW_STEPS.map((step, i) => (
              <FadeUp key={step} delay={i * 0.12} className="flex-1">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xl mx-auto mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t(`landing.how_${step}_title`)}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{t(`landing.how_${step}_desc`)}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Loved by learners & educators</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Real words from real people using VocabWeb every day.</p>
          </FadeUp>
        </div>
        <StaggerTestimonials />
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6 text-center dark:bg-gray-950">
        <FadeUp>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.cta_title')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-10">{t('landing.cta_sub')}</p>
          <Link to="/register" className="btn-primary text-base px-8 py-3.5 shadow-xl shadow-primary-100">
            {t('landing.get_started')} →
          </Link>
        </FadeUp>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 dark:border-gray-800 dark:bg-gray-950 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        <p>© {new Date().getFullYear()} VocabWeb. {t('landing.footer_rights')}</p>
      </footer>
    </div>
  );
}
