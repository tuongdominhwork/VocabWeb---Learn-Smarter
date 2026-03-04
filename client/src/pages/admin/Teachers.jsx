import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, School, Trash2 } from 'lucide-react';
import api from '../../api/axios.js';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function AdminTeachers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['admin-teachers', search],
    queryFn: () => api.get(`/me/teachers?search=${encodeURIComponent(search)}`).then(r => r.data),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/me/teachers', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); reset(); setShowCreate(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/me/teachers/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); setConfirmDeleteId(null); },
  });

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const levelColor = (level) => ({
    A1: 'bg-green-100 text-green-700',
    A2: 'bg-teal-100 text-teal-700',
    B1: 'bg-blue-100 text-blue-700',
    B2: 'bg-indigo-100 text-indigo-700',
    C1: 'bg-purple-100 text-purple-700',
    C2: 'bg-pink-100 text-pink-700',
  }[level] || 'bg-gray-100 text-gray-500');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Teachers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{teachers.length} teacher account{teachers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="btn-primary">
          {showCreate ? 'Cancel' : '+ New Teacher'}
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div key="create" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card border border-primary-100">
            <h2 className="font-semibold mb-4">Create Teacher Account</h2>
            {createMutation.isError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {createMutation.error?.response?.data?.error || 'Something went wrong'}
              </div>
            )}
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Full Name</label>
                <input {...register('name')} className="input" placeholder="Jane Smith" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="teacher@school.vn" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input {...register('password')} type="password" className="input" placeholder="Min 8 characters" />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div className="sm:col-span-3">
                <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
                  {createMutation.isPending ? 'Creating...' : 'Create Teacher Account'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <input
        type="text" className="input max-w-sm" placeholder="🔍 Search by name or email..."
        value={search} onChange={e => setSearch(e.target.value)}
      />

      {/* Teacher list */}
      {isLoading ? (
        <p className="text-center text-gray-400">Loading...</p>
      ) : teachers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">👩‍🏫</div>
          <p>No teacher accounts yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map((teacher, i) => (
            <motion.div key={teacher.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card">
              {/* Teacher header */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {teacher.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{teacher.name}</p>
                    <p className="text-sm text-gray-400">{teacher.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <School size={14} />
                    <span>{teacher.classroom_count} class{teacher.classroom_count !== 1 ? 'es' : ''}</span>
                    <span className="text-gray-300">·</span>
                    <span>{teacher.student_count} student{teacher.student_count !== 1 ? 's' : ''}</span>
                  </div>
                  <span className={`badge text-xs ${teacher.is_locked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {teacher.is_locked ? '🔒 Locked' : '✓ Active'}
                  </span>
                  <button
                    onClick={() => toggleExpand(teacher.id)}
                    className="btn-secondary text-xs px-3 py-1 flex items-center gap-1"
                  >
                    {expandedId === teacher.id ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Classes</>}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(teacher.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete teacher"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Classrooms expansion */}
              <AnimatePresence>
                {expandedId === teacher.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      {teacher.classrooms.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">No classrooms yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {teacher.classrooms.map(cls => (
                            <div key={cls.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm">{cls.name}</p>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cls.level ? levelColor(cls.level) : 'bg-gray-100 text-gray-400'}`}>
                                  {cls.level || 'All'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">
                                {cls.student_count} student{cls.student_count !== 1 ? 's' : ''} ·{' '}
                                <span className="font-mono">{cls.join_code}</span>
                              </p>
                              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md ${cls.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                {cls.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delete confirmation */}
              <AnimatePresence>
                {confirmDeleteId === teacher.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200">
                      <p className="text-sm text-red-700 font-medium mb-2">
                        ⚠️ Delete <strong>{teacher.name}</strong>? This will permanently remove their account, all {teacher.classroom_count} classroom{teacher.classroom_count !== 1 ? 's' : ''}, and reset {teacher.student_count} enrolled student{teacher.student_count !== 1 ? 's' : ''} to individual accounts.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteMutation.mutate(teacher.id)}
                          disabled={deleteMutation.isPending}
                          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                        </button>
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
