import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PARTS = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'];

const schema = z.object({
  headword: z.string().min(1, 'Required'),
  level: z.string().min(1),
  part_of_speech: z.string().min(1),
  meaning_vi: z.string().min(1, 'Required'),
  meaning_en: z.string().optional(),
  example_sentence: z.string().optional(),
  notes: z.string().optional(),
  topic_id: z.string().optional(),
});

export default function VocabManager() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState(null);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef();

  const { data: vocabData, isLoading } = useQuery({
    queryKey: ['vocab', page, search, levelFilter],
    queryFn: () => api.get(`/vocab?page=${page}&limit=20&search=${search}&level=${levelFilter}`).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['vocab-topics'],
    queryFn: () => api.get('/vocab/topics').then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { level: 'A1', part_of_speech: 'noun' } });

  const createMutation = useMutation({
    mutationFn: (data) => editingWord
      ? api.put(`/vocab/${editingWord.id}`, data)
      : api.post('/vocab', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vocab'] }); reset(); setShowForm(false); setEditingWord(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/vocab/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.patch(`/vocab/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const handleEdit = (word) => {
    setEditingWord(word);
    Object.entries(word).forEach(([k, v]) => setValue(k, v ?? ''));
    setShowForm(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/vocab/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportMsg(`✅ Imported ${res.data.imported} words`);
      qc.invalidateQueries({ queryKey: ['vocab'] });
    } catch (err) {
      setImportMsg('❌ Import failed. Check file format.');
    }
    e.target.value = '';
    setTimeout(() => setImportMsg(''), 4000);
  };

  const handleTemplateDownload = async () => {
    try {
      const res = await api.get('/vocab/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vocab_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download failed', err);
    }
  };

  const words = vocabData?.data || [];
  const total = vocabData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('vocab.title')}</h1>
        <div className="flex gap-2">
          <button onClick={handleTemplateDownload} className="btn-secondary text-sm">⬇ Template</button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-sm">📥 Import Excel</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button onClick={() => { setShowForm(!showForm); setEditingWord(null); reset(); }} className="btn-primary">{showForm ? 'Cancel' : '+ Add Word'}</button>
        </div>
      </div>

      {importMsg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">{importMsg}</div>}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="card overflow-hidden">
            <h2 className="font-semibold mb-4">{editingWord ? 'Edit Word' : 'Add New Word'}</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Headword *</label><input {...register('headword')} className="input" /></div>
              <div><label className="label">Level *</label>
                <select {...register('level')} className="input">{LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
              <div><label className="label">Part of Speech *</label>
                <select {...register('part_of_speech')} className="input">{PARTS.map(p => <option key={p}>{p}</option>)}</select></div>
              <div><label className="label">Meaning (Vietnamese) *</label><input {...register('meaning_vi')} className="input" /></div>
              <div><label className="label">Meaning (English)</label><input {...register('meaning_en')} className="input" /></div>
              <div className="sm:col-span-2"><label className="label">Example Sentence</label><input {...register('example_sentence')} className="input" /></div>
              <div className="sm:col-span-2"><label className="label">Notes</label><input {...register('notes')} className="input" /></div>
              <div><label className="label">Topic</label>
                <select {...register('topic_id')} className="input">
                  <option value="">No topic</option>
                  {topics.map(tp => <option key={tp.id} value={tp.id}>{tp.name_vi} / {tp.name_en}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
                  {createMutation.isPending ? t('common.loading') : editingWord ? 'Save Changes' : 'Add Word'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" className="input flex-1 min-w-40" placeholder="🔍 Search words..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-28" value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(1); }}>
          <option value="">All Levels</option>
          {LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-center text-gray-400">{t('common.loading')}</p>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">📚</div><p>No words found.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Word', 'Level', 'POS', 'Meaning (VI)', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {words.map(w => (
                <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{w.headword}</td>
                  <td className="px-4 py-3"><span className="badge bg-primary-100 text-primary-700">{w.level}</span></td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{w.part_of_speech}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-48 truncate">{w.meaning_vi}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${w.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{w.is_approved ? 'Approved' : 'Pending'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!w.is_approved && (
                        <button onClick={() => approveMutation.mutate(w.id)} className="px-2 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200">✓ Approve</button>
                      )}
                      <button onClick={() => handleEdit(w)} className="px-2 py-1 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">✏</button>
                      <button onClick={() => { if (confirm('Delete this word?')) deleteMutation.mutate(w.id); }} className="px-2 py-1 text-xs rounded-lg bg-red-100 text-red-600 hover:bg-red-200">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-3 py-1 text-sm">← Prev</button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-3 py-1 text-sm">Next →</button>
        </div>
      )}
    </div>
  );
}
