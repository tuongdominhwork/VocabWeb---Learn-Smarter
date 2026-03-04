import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { query, queryOne, run } from '../db/index.js';

const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Multer — memory storage for xlsx parsing
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.includes('spreadsheet') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx/.xls) are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// GET /vocab
export async function listVocab(req, res, next) {
  try {
    const { level, status, topic_id, q, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions = [];
    let args = [];

    if (level) { conditions.push('v.level = ?'); args.push(level); }
    if (status) { conditions.push('v.status = ?'); args.push(status); }
    else if (req.user.role === 'student') { conditions.push("v.status = 'approved'"); }
    if (topic_id) { conditions.push('v.topic_id = ?'); args.push(topic_id); }
    if (q) { conditions.push('(v.headword LIKE ? OR v.meaning_en LIKE ? OR v.meaning_vi LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT v.*, vt.name_en as topic_name_en, vt.name_vi as topic_name_vi, u.name as created_by_name
       FROM vocab v
       LEFT JOIN vocab_topics vt ON v.topic_id = vt.id
       LEFT JOIN users u ON v.created_by = u.id
       ${where}
       ORDER BY v.level, v.headword
       LIMIT ? OFFSET ?`,
      [...args, Number(limit), offset]
    );

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM vocab v ${where}`,
      args
    );

    res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /vocab/:id
export async function getVocab(req, res, next) {
  try {
    const vocab = await queryOne(`SELECT * FROM vocab WHERE id = ?`, [req.params.id]);
    if (!vocab) return res.status(404).json({ error: 'Vocabulary not found' });
    res.json(vocab);
  } catch (err) {
    next(err);
  }
}

// POST /vocab (teacher / admin)
export async function createVocab(req, res, next) {
  try {
    const { headword, level, part_of_speech, meaning_vi, meaning_en, example_sentence, notes, topic_id } = req.body;

    if (!headword || !level || !part_of_speech || !meaning_vi || !meaning_en) {
      return res.status(400).json({ error: 'headword, level, part_of_speech, meaning_vi, meaning_en are required' });
    }
    if (!VALID_LEVELS.includes(level)) {
      return res.status(400).json({ error: `level must be one of ${VALID_LEVELS.join(', ')}` });
    }

    const id = uuidv4();
    await run(
      `INSERT INTO vocab (id, headword, level, part_of_speech, meaning_vi, meaning_en, example_sentence, notes, topic_id, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, headword.trim(), level, part_of_speech, meaning_vi.trim(), meaning_en.trim(),
       example_sentence || null, notes || null, topic_id || null, req.user.id, 'draft']
    );

    const vocab = await queryOne(`SELECT * FROM vocab WHERE id = ?`, [id]);
    res.status(201).json(vocab);
  } catch (err) {
    next(err);
  }
}

// PATCH /vocab/:id
export async function updateVocab(req, res, next) {
  try {
    const { id } = req.params;
    const vocab = await queryOne(`SELECT * FROM vocab WHERE id = ?`, [id]);
    if (!vocab) return res.status(404).json({ error: 'Vocabulary not found' });

    if (req.user.role === 'teacher' && vocab.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own vocabulary' });
    }

    const fields = ['headword', 'level', 'part_of_speech', 'meaning_vi', 'meaning_en', 'example_sentence', 'notes', 'topic_id', 'status'];
    const updates = [];
    const args = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        args.push(req.body[f]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    args.push(id);
    await run(`UPDATE vocab SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`, args);

    const updated = await queryOne(`SELECT * FROM vocab WHERE id = ?`, [id]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /vocab/:id
export async function deleteVocab(req, res, next) {
  try {
    const { id } = req.params;
    const vocab = await queryOne(`SELECT * FROM vocab WHERE id = ?`, [id]);
    if (!vocab) return res.status(404).json({ error: 'Vocabulary not found' });

    if (req.user.role === 'teacher' && vocab.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own vocabulary' });
    }

    await run(`DELETE FROM vocab WHERE id = ?`, [id]);
    res.json({ message: 'Vocabulary deleted' });
  } catch (err) {
    next(err);
  }
}

// PATCH /vocab/:id/approve (teacher / admin)
export async function approveVocab(req, res, next) {
  try {
    const { id } = req.params;
    const vocab = await queryOne(`SELECT * FROM vocab WHERE id = ?`, [id]);
    if (!vocab) return res.status(404).json({ error: 'Vocabulary not found' });

    await run(`UPDATE vocab SET status = 'approved', updated_at = datetime('now') WHERE id = ?`, [id]);
    res.json({ message: 'Vocabulary approved' });
  } catch (err) {
    next(err);
  }
}

// POST /vocab/import (teacher) — multipart/form-data with Excel file
export async function importVocab(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) return res.status(400).json({ error: 'Excel file is empty' });

    const results = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1 for header, 1 for 0-index

      const headword = String(row.headword || row.Headword || '').trim();
      const level = String(row.level || row.Level || '').trim().toUpperCase();
      const part_of_speech = String(row.part_of_speech || row['Part of Speech'] || '').trim();
      const meaning_vi = String(row.meaning_vi || row['Meaning (VI)'] || '').trim();
      const meaning_en = String(row.meaning_en || row['Meaning (EN)'] || '').trim();
      const example_sentence = String(row.example_sentence || row['Example Sentence'] || '').trim() || null;
      const notes = String(row.notes || row.Notes || '').trim() || null;

      if (!headword || !level || !part_of_speech || !meaning_vi || !meaning_en) {
        results.errors.push(`Row ${rowNum}: missing required fields`);
        results.skipped++;
        continue;
      }

      if (!VALID_LEVELS.includes(level)) {
        results.errors.push(`Row ${rowNum}: invalid level "${level}"`);
        results.skipped++;
        continue;
      }

      try {
        await run(
          `INSERT OR IGNORE INTO vocab (id, headword, level, part_of_speech, meaning_vi, meaning_en, example_sentence, notes, created_by, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
          [uuidv4(), headword, level, part_of_speech, meaning_vi, meaning_en, example_sentence, notes, req.user.id]
        );
        results.imported++;
      } catch (err) {
        results.errors.push(`Row ${rowNum}: ${err.message}`);
        results.skipped++;
      }
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
}

// GET /vocab/topics
export async function listTopics(req, res, next) {
  try {
    const topics = await query(`SELECT * FROM vocab_topics ORDER BY level, name_en`);
    res.json(topics);
  } catch (err) {
    next(err);
  }
}

// POST /vocab/topics (teacher/admin)
export async function createTopic(req, res, next) {
  try {
    const { name_vi, name_en, level } = req.body;
    if (!name_vi || !name_en || !level) {
      return res.status(400).json({ error: 'name_vi, name_en, level are required' });
    }
    const id = uuidv4();
    await run(`INSERT INTO vocab_topics (id, name_vi, name_en, level) VALUES (?, ?, ?, ?)`, [id, name_vi, name_en, level]);
    const topic = await queryOne(`SELECT * FROM vocab_topics WHERE id = ?`, [id]);
    res.status(201).json(topic);
  } catch (err) {
    next(err);
  }
}

// GET /vocab/template — download Excel template
export async function downloadTemplate(req, res, next) {
  try {
    const headers = ['headword', 'level', 'part_of_speech', 'meaning_vi', 'meaning_en', 'example_sentence', 'notes'];
    const example = ['apple', 'A1', 'noun', 'táo', 'a round fruit', 'She ate an apple.', 'Also: Apple Inc.'];

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vocabulary');

    // Column widths
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="vocab_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
