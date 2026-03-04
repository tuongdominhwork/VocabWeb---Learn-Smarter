import 'dotenv/config';
import { getDb } from './index.js';

const SCHEMA = `
-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  ui_language TEXT NOT NULL DEFAULT 'vi',
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Password Reset Tokens ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Classrooms ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Student ↔ Classroom (one classroom per student) ─────────────────────────
CREATE TABLE IF NOT EXISTS student_classroom (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Teacher Targets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_targets (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  target_level TEXT NOT NULL,
  target_words_per_week INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Vocabulary Topics ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_topics (
  id TEXT PRIMARY KEY,
  name_vi TEXT NOT NULL,
  name_en TEXT NOT NULL,
  level TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Vocabulary ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab (
  id TEXT PRIMARY KEY,
  headword TEXT NOT NULL,
  level TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  meaning_vi TEXT NOT NULL,
  meaning_en TEXT NOT NULL,
  ipa TEXT,
  example_sentence TEXT,
  notes TEXT,
  topic_id TEXT REFERENCES vocab_topics(id),
  created_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Study Sessions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_size INTEGER NOT NULL,
  level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- ─── Study Questions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_questions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  vocab_id TEXT NOT NULL REFERENCES vocab(id),
  question_type TEXT NOT NULL,
  question_data TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Study Answers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES study_questions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  time_spent_ms INTEGER,
  hint_level_used INTEGER DEFAULT 0,
  answered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Study Attempts (per question, tracks retries for hint system) ────────────
CREATE TABLE IF NOT EXISTS study_attempts (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES study_questions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  user_answer TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Student Vocab Mastery ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_vocab_mastery (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocab_id TEXT NOT NULL REFERENCES vocab(id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0.0,
  last_reviewed_at TEXT,
  UNIQUE(student_id, vocab_id)
);

-- ─── Daily Quizzes ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_quizzes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER,
  total_questions INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE(student_id, quiz_date)
);

-- ─── Daily Quiz Items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_quiz_items (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES daily_quizzes(id) ON DELETE CASCADE,
  vocab_id TEXT NOT NULL REFERENCES vocab(id),
  question_type TEXT NOT NULL,
  question_data TEXT NOT NULL,
  user_answer TEXT,
  is_correct INTEGER,
  order_index INTEGER NOT NULL
);

-- ─── Live Tests ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  num_questions INTEGER NOT NULL DEFAULT 10,
  allowed_types TEXT NOT NULL,
  time_limit_minutes INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'pending',
  questions TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Test Participants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_participants (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined',
  score INTEGER,
  answers TEXT,
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE(test_id, student_id)
);

-- ─── Test Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_events (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Teacher Feedback ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_feedback (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id),
  content TEXT NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Teacher Feedback History ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_feedback_history (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL REFERENCES teacher_feedback(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL REFERENCES users(id),
  old_content TEXT,
  new_content TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Classroom Vocab Assignment ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classroom_vocab (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  vocab_id TEXT NOT NULL REFERENCES vocab(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(classroom_id, vocab_id)
);
`;

// ALTER TABLE migrations — idempotent (ignores "duplicate column" errors)
const ALTER_MIGRATIONS = [
  `ALTER TABLE users ADD COLUMN entrance_exam_completed INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN vocab_level TEXT DEFAULT NULL`,
  `ALTER TABLE users ADD COLUMN student_type TEXT NOT NULL DEFAULT 'individual'`,
  `ALTER TABLE classrooms ADD COLUMN level TEXT DEFAULT NULL`,
];

async function migrate() {
  console.log('🗄️  Running migrations...');
  const db = getDb();

  // Split and run each CREATE TABLE separately (Turso handles one statement at a time)
  // Strip inline/block comments first, then filter empty segments
  const statements = SCHEMA
    .split(';')
    .map(s => s.replace(/--[^\n]*/g, '').trim())  // remove comment lines
    .filter(s => s.length > 0);

  for (const sql of statements) {
    await db.execute(sql);
  }

  // Run ALTER TABLE statements — ignore errors if column already exists
  for (const sql of ALTER_MIGRATIONS) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists — skip silently
    }
  }

  console.log('✅ Migrations complete.');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
