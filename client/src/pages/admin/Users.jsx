import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../api/axios.js';

const ROLES = ['', 'student', 'teacher', 'admin'];

export default function AdminUsers() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [confirmLock, setConfirmLock] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () => api.get(`/me/all?page=${page}&limit=20&search=${encodeURIComponent(search)}&role=${roleFilter}`).then(r => r.data),
    keepPreviousData: true,
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, locked }) => api.patch(`/me/all/${id}/lock`, { is_locked: locked }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setConfirmLock(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/me/all/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setConfirmDelete(null); },
  });

  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const roleColor = (role) => ({
    student: 'bg-blue-100 text-blue-700',
    teacher: 'bg-yellow-100 text-yellow-700',
    admin: 'bg-red-100 text-red-600',
  }[role] || 'bg-gray-100 text-gray-500');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" className="input flex-1 min-w-40" placeholder="🔍 Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-32" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {ROLES.filter(Boolean).map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {/* Confirm Lock Dialog */}
      {confirmLock && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-2">{confirmLock.is_locked ? 'Unlock User?' : 'Lock User?'}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {confirmLock.is_locked ? `Unlock ${confirmLock.full_name}? They will be able to log in again.` : `Lock ${confirmLock.full_name}? They will not be able to log in.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLock(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={() => lockMutation.mutate({ id: confirmLock.id, locked: !confirmLock.is_locked })}
                className={`flex-1 justify-center rounded-xl px-4 py-2.5 font-medium transition-colors text-sm ${confirmLock.is_locked ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                {lockMutation.isPending ? t('common.loading') : confirmLock.is_locked ? '🔓 Unlock' : '🔒 Lock'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-2">Delete Account?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Permanently delete <strong>{confirmDelete.full_name}</strong> ({confirmDelete.role})? This cannot be undone.
              {confirmDelete.role === 'teacher' && ' Their classrooms will be deleted and students reset to individual.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 justify-center rounded-xl px-4 py-2.5 font-medium transition-colors text-sm bg-red-600 text-white hover:bg-red-700">
                {deleteMutation.isPending ? 'Deleting...' : '🗑 Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Users Table */}
      {isLoading ? (
        <p className="text-center text-gray-400">{t('common.loading')}</p>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">👤</div><p>No users found.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['User', 'Role', 'Language', 'Status', 'Joined', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                        {u.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`badge text-xs capitalize ${roleColor(u.role)}`}>{u.role}</span></td>
                  <td className="px-4 py-3 text-gray-500 uppercase text-xs">{u.ui_language || 'en'}</td>
                  <td className="px-4 py-3">
                    {u.is_locked ? (
                      <span className="badge bg-red-100 text-red-600 text-xs">🔒 Locked</span>
                    ) : (
                      <span className="badge bg-green-100 text-green-700 text-xs">✓ Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.role !== 'admin' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setConfirmLock(u)}
                          className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${u.is_locked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                          {u.is_locked ? '🔓 Unlock' : '🔒 Lock'}
                        </button>
                        <button onClick={() => setConfirmDelete(u)}
                          className="px-3 py-1 text-xs rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors">
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
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
