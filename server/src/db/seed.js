import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { run, query } from './index.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // ─── Users ───────────────────────────────────────────────────────────────
  const SALT_ROUNDS = 12;
  const passwordHash = await bcrypt.hash('Password123', SALT_ROUNDS);

  const adminId = uuidv4();
  const teacherId = uuidv4();
  const studentId = uuidv4();
  const classroomId = uuidv4();
  const topicId = uuidv4();

  // Upsert users
  await run(
    `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, ui_language) VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, 'admin@test.com', passwordHash, 'Admin User', 'admin', 'en']
  );
  await run(
    `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, ui_language) VALUES (?, ?, ?, ?, ?, ?)`,
    [teacherId, 'teacher@test.com', passwordHash, 'Demo Teacher', 'teacher', 'en']
  );
  await run(
    `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, ui_language) VALUES (?, ?, ?, ?, ?, ?)`,
    [studentId, 'student@test.com', passwordHash, 'Demo Student', 'student', 'en']
  );

  // ─── Classroom ────────────────────────────────────────────────────────────
  await run(
    `INSERT OR IGNORE INTO classrooms (id, name, description, teacher_id, join_code) VALUES (?, ?, ?, ?, ?)`,
    [classroomId, 'Demo Class A1', 'Beginner English vocabulary for new learners.', teacherId, 'APPLE-1234']
  );

  // ─── Enroll student ───────────────────────────────────────────────────────
  await run(
    `INSERT OR IGNORE INTO student_classroom (id, student_id, classroom_id) VALUES (?, ?, ?)`,
    [uuidv4(), studentId, classroomId]
  );

  // ─── Vocab Topic ──────────────────────────────────────────────────────────
  await run(
    `INSERT OR IGNORE INTO vocab_topics (id, name_vi, name_en, level) VALUES (?, ?, ?, ?)`,
    [topicId, 'Gia đình', 'Family', 'A1']
  );

  // ─── A1 Vocabulary ────────────────────────────────────────────────────────
  const a1Words = [
    { headword: 'apple', pos: 'noun', vi: 'táo', en: 'a round fruit, typically red, yellow, or green', ipa: '/ˈæp.əl/', ex: 'She ate an apple for breakfast.' },
    { headword: 'book', pos: 'noun', vi: 'cuốn sách', en: 'a written or printed work consisting of pages', ipa: '/bʊk/', ex: 'He reads a book every week.' },
    { headword: 'cat', pos: 'noun', vi: 'con mèo', en: 'a small domesticated carnivorous mammal', ipa: '/kæt/', ex: 'The cat sits on the mat.' },
    { headword: 'dog', pos: 'noun', vi: 'con chó', en: 'a domesticated carnivorous mammal', ipa: '/dɒɡ/', ex: 'My dog likes to play in the garden.' },
    { headword: 'eat', pos: 'verb', vi: 'ăn', en: 'to put food into the mouth and swallow it', ipa: '/iːt/', ex: 'We eat dinner at seven o\'clock.' },
    { headword: 'family', pos: 'noun', vi: 'gia đình', en: 'a group of people related by blood or marriage', ipa: '/ˈfæm.ɪ.li/', ex: 'My family lives in the city.' },
    { headword: 'go', pos: 'verb', vi: 'đi', en: 'to move or travel from one place to another', ipa: '/ɡəʊ/', ex: 'I go to school every day.' },
    { headword: 'happy', pos: 'adjective', vi: 'vui vẻ, hạnh phúc', en: 'feeling or showing pleasure or contentment', ipa: '/ˈhæp.i/', ex: 'She is happy to see her friends.' },
    { headword: 'house', pos: 'noun', vi: 'ngôi nhà', en: 'a building for human habitation', ipa: '/haʊs/', ex: 'They live in a big house.' },
    { headword: 'learn', pos: 'verb', vi: 'học', en: 'to gain knowledge or skill by studying', ipa: '/lɜːn/', ex: 'Children learn new words every day.' },
    { headword: 'mother', pos: 'noun', vi: 'mẹ', en: 'a woman in relation to her children', ipa: '/ˈmʌð.ər/', ex: 'My mother cooks delicious food.' },
    { headword: 'new', pos: 'adjective', vi: 'mới', en: 'not existing before; recently created', ipa: '/njuː/', ex: 'I have a new bag for school.' },
    { headword: 'open', pos: 'verb', vi: 'mở', en: 'to move so as to allow access', ipa: '/ˈəʊ.pən/', ex: 'Please open the window.' },
    { headword: 'pen', pos: 'noun', vi: 'cái bút', en: 'an instrument for writing or drawing with ink', ipa: '/pen/', ex: 'Can I borrow your pen?' },
    { headword: 'run', pos: 'verb', vi: 'chạy', en: 'to move at a speed faster than a walk', ipa: '/rʌn/', ex: 'The children run in the park.' },
    { headword: 'school', pos: 'noun', vi: 'trường học', en: 'an institution for educating children', ipa: '/skuːl/', ex: 'She goes to school at eight.' },
    { headword: 'time', pos: 'noun', vi: 'thời gian', en: 'the indefinite continued progress of existence', ipa: '/taɪm/', ex: 'What time is it now?' },
    { headword: 'water', pos: 'noun', vi: 'nước', en: 'a colorless liquid essential for life', ipa: '/ˈwɔː.tər/', ex: 'Please drink more water.' },
    { headword: 'year', pos: 'noun', vi: 'năm', en: 'the time taken by the earth to orbit the sun', ipa: '/jɪər/', ex: 'I have studied English for one year.' },
    { headword: 'big', pos: 'adjective', vi: 'to, lớn', en: 'of considerable size or extent', ipa: '/bɪɡ/', ex: 'That is a very big building.' },
  ];

  for (const w of a1Words) {
    const vocabId = uuidv4();
    await run(
      `INSERT OR IGNORE INTO vocab (id, headword, level, part_of_speech, meaning_vi, meaning_en, ipa, example_sentence, topic_id, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vocabId, w.headword, 'A1', w.pos, w.vi, w.en, w.ipa, w.ex, topicId, teacherId, 'approved']
    );
  }

  // ─── A2 Words (for distractor variety) ────────────────────────────────────
  const a2Words = [
    { headword: 'arrive', pos: 'verb', vi: 'đến', en: 'to reach a destination', ipa: '/əˈraɪv/', ex: 'The train will arrive at noon.' },
    { headword: 'beautiful', pos: 'adjective', vi: 'đẹp', en: 'pleasing to the senses or mind', ipa: '/ˈbjuː.tɪ.fəl/', ex: 'What a beautiful sunset!' },
    { headword: 'careful', pos: 'adjective', vi: 'cẩn thận', en: 'making sure to avoid mistakes or danger', ipa: '/ˈkeə.fəl/', ex: 'Be careful when crossing the street.' },
    { headword: 'decide', pos: 'verb', vi: 'quyết định', en: 'to make a choice or come to a resolution', ipa: '/dɪˈsaɪd/', ex: 'I decided to study abroad.' },
    { headword: 'enjoy', pos: 'verb', vi: 'thích, tận hưởng', en: 'to take pleasure in something', ipa: '/ɪnˈdʒɔɪ/', ex: 'I enjoy reading books.' },
    { headword: 'forget', pos: 'verb', vi: 'quên', en: 'to fail to remember', ipa: '/fəˈɡet/', ex: 'Don\'t forget your homework.' },
    { headword: 'garden', pos: 'noun', vi: 'khu vườn', en: 'a piece of ground for growing plants', ipa: '/ˈɡɑː.dən/', ex: 'She grows flowers in her garden.' },
    { headword: 'healthy', pos: 'adjective', vi: 'khỏe mạnh', en: 'in good health; beneficial to health', ipa: '/ˈhel.θi/', ex: 'Eating vegetables keeps you healthy.' },
    { headword: 'journey', pos: 'noun', vi: 'chuyến đi', en: 'an act of traveling from one place to another', ipa: '/ˈdʒɜː.ni/', ex: 'The journey took three hours.' },
    { headword: 'kind', pos: 'adjective', vi: 'tốt bụng, thân thiện', en: 'having a friendly, generous, or considerate nature', ipa: '/kaɪnd/', ex: 'She is very kind to everyone.' },
  ];

  for (const w of a2Words) {
    const vocabId = uuidv4();
    await run(
      `INSERT OR IGNORE INTO vocab (id, headword, level, part_of_speech, meaning_vi, meaning_en, ipa, example_sentence, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vocabId, w.headword, 'A2', w.pos, w.vi, w.en, w.ipa, w.ex, teacherId, 'approved']
    );
  }

  console.log('✅ Seed complete.');
  console.log('');
  console.log('📋 Demo Accounts:');
  console.log('   admin@test.com   / Password123  (admin)');
  console.log('   teacher@test.com / Password123  (teacher)');
  console.log('   student@test.com / Password123  (student)');
  console.log('');
  console.log('🏫 Demo Classroom: "Demo Class A1"');
  console.log('   Join code: APPLE-1234');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
