import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  level: z.string().optional(),
});

export default function TeacherClassroom() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);   // which classroom is being edited
  const [editLevel, setEditLevel] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: classrooms = [], isLoading } = useQuery({
    queryKey: ['teacher-classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/classrooms', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-classrooms'] }); reset(); setShowCreate(false); },
  });

  const updateLevelMutation = useMutation({
    mutationFn: ({ id, level }) => api.patch(`/classrooms/${id}`, { level: level || null }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-classrooms'] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/classrooms/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-classrooms'] }); setConfirmDeleteId(null); },
  });

  const copyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (cls) => {
    setEditingId(cls.id);
    setEditLevel(cls.level || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('classroom.title')}</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">{showCreate ? 'Cancel' : '+ Create'}</button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div key="create" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card">
            <h2 className="font-semibold mb-4">Create Classroom</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Classroom Name</label>
                <input {...register('name')} className="input" placeholder="e.g. English A1 Morning" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Vocabulary Level</label>
                <select {...register('level')} className="input">
                  <option value="">All levels (mixed)</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
                {createMutation.isPending ? t('common.loading') : 'Create Classroom'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <p className="text-center text-gray-400">{t('common.loading')}</p>
      ) : classrooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🏫</div>
          <p>No classrooms yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classrooms.map(cls => (
            <motion.div key={cls.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-semibold text-lg">{cls.name}</h3>
                  <p className="text-sm text-gray-500">{cls.student_count || 0} students enrolled</p>
                  <p className="text-xs text-gray-400 mt-1">Created: {new Date(cls.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${cls.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{cls.is_active ? 'Active' : 'Inactive'}</span>
                  <button onClick={() => startEdit(cls)} className="btn-secondary text-xs px-3 py-1">✏️ Edit Level</button>
                  <button onClick={() => setConfirmDeleteId(cls.id)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">🗑 Delete</button>
                </div>
              </div>

              {/* Inline level editor */}
              <AnimatePresence>
                {editingId === cls.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                      <label className="text-sm font-medium text-blue-700 dark:text-blue-300 shrink-0">Vocabulary Level:</label>
                      <select value={editLevel} onChange={e => setEditLevel(e.target.value)} className="input flex-1 text-sm py-1">
                        <option value="">All levels (mixed)</option>
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <button
                        onClick={() => updateLevelMutation.mutate({ id: cls.id, level: editLevel })}
                        disabled={updateLevelMutation.isPending}
                        className="btn-primary text-sm px-4 py-1 shrink-0"
                      >Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary text-sm px-3 py-1 shrink-0">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Level badge */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Level:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  cls.level ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}>{cls.level || 'All'}</span>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Join Code</p>
                  <p className="text-xl font-bold font-mono tracking-widest text-primary-700">{cls.join_code}</p>
                </div>
                <button onClick={() => copyCode(cls.id, cls.join_code)} className="btn-secondary text-sm">
                  {copied === cls.id ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>

              {/* Delete confirmation */}
              <AnimatePresence>
                {confirmDeleteId === cls.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200">
                      <p className="text-sm text-red-700 font-medium mb-2">⚠️ Delete <strong>{cls.name}</strong>? This will remove all {cls.student_count || 0} students and reset them to individual accounts. This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteMutation.mutate(cls.id)}
                          disabled={deleteMutation.isPending}
                          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >{deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary text-sm">Cancel</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
