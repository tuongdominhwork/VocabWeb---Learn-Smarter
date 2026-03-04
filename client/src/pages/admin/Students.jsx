import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axios.js';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const levelColor = (level) => ({
  A1: 'bg-green-100 text-green-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-purple-100 text-purple-700',
  C2: 'bg-pink-100 text-pink-700',
}[level] || 'bg-gray-100 text-gray-500');

export default function AdminStudents() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmLock, setConfirmLock] = useState(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin-students', search],
    queryFn: () => api.get(`/me/students?search=${encodeURIComponent(search)}`).then(r => r.data),
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/me/students', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-students'] }); reset(); setShowCreate(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/me/all/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-students'] }); setConfirmDelete(null); },
  });

  const lockMutation = useMutation({
    mutationFn: (id) => api.patch(`/me/all/${id}/lock`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-students'] }); setConfirmLock(null); },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students.length} student account{students.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="btn-primary">
          {showCreate ? 'Cancel' : '+ New Student'}
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card border border-primary-100"
          >
            <h2 className="font-semibold mb-4">Create Student Account</h2>
            {createMutation.isError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {createMutation.error?.response?.data?.error || 'Something went wrong'}
              </div>
            )}
            <form
              onSubmit={handleSubmit(d => createMutation.mutate(d))}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div>
                <label className="label">Full Name</label>
                <input {...register('name')} className="input" placeholder="John Doe" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="john@school.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input {...register('password')} type="password" className="input" placeholder="Min. 8 characters" />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <input
        type="text"
        className="input w-full"
        placeholder="🔍 Search by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Lock Confirmation */}
      {confirmLock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
          >
            <h3 className="font-semibold text-lg mb-2">
              {confirmLock.is_locked ? 'Unlock Student?' : 'Lock Student?'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {confirmLock.is_locked
                ? `Unlock ${confirmLock.name}? They will be able to log in again.`
                : `Lock ${confirmLock.name}? They won't be able to log in.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLock(null)} className="btn-ghost flex-1 justify-center">
                Cancel
              </button>
              <button
                onClick={() => lockMutation.mutate(confirmLock.id)}
                disabled={lockMutation.isPending}
                className={`flex-1 justify-center rounded-xl px-4 py-2.5 font-medium text-sm transition-colors ${
                  confirmLock.is_locked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {lockMutation.isPending ? 'Working...' : confirmLock.is_locked ? '🔓 Unlock' : '🔒 Lock'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl"
          >
            <h3 className="font-semibold text-lg mb-2">Delete Student?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete <strong>{confirmDelete.name}</strong>? All their study progress
              will be lost. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 justify-center">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 justify-center rounded-xl px-4 py-2.5 font-medium text-sm bg-red-600 text-white hover:bg-red-700"
              >
                {deleteMutation.isPending ? 'Deleting...' : '🗑 Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Loading...</p>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🎓</div>
          <p>No students found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Student', 'Classroom', 'Teacher', 'Level', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.classroom_name || <span className="text-gray-300 italic text-xs">No classroom</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {s.teacher_name || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.classroom_level ? (
                      <span className={`badge text-xs ${levelColor(s.classroom_level)}`}>
                        {s.classroom_level}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_locked ? (
                      <span className="badge bg-red-100 text-red-600 text-xs">🔒 Locked</span>
                    ) : (
                      <span className="badge bg-green-100 text-green-700 text-xs">✓ Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirmLock(s)}
                        className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                          s.is_locked
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {s.is_locked ? '🔓 Unlock' : '🔒 Lock'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s)}
                        className="px-3 py-1 text-xs rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
