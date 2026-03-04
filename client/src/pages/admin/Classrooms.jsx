import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../api/axios.js';

export default function AdminClassrooms() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data: classrooms = [], isLoading } = useQuery({
    queryKey: ['admin-classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  });

  const filtered = classrooms.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.join_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Classrooms</h1>
        <span className="text-sm text-gray-500">{classrooms.length} total</span>
      </div>

      <input type="text" className="input" placeholder="🔍 Search by name, code, or teacher..." value={search} onChange={e => setSearch(e.target.value)} />

      {isLoading ? (
        <p className="text-center text-gray-400">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">🏫</div><p>No classrooms found.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Classroom', 'Join Code', 'Teacher', 'Students', 'Level', 'Status', 'Created'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cls, i) => (
                <motion.tr key={cls.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cls.name}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg">{cls.join_code}</span></td>
                  <td className="px-4 py-3 text-gray-600">{cls.teacher_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-primary-100 text-primary-700">{cls.student_count ?? 0}</span>
                  </td>
                  <td className="px-4 py-3">{cls.level ? <span className="badge bg-yellow-100 text-yellow-700">{cls.level}</span> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${cls.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{cls.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(cls.created_at).toLocaleDateString()}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
