import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../api/axios.js';

export default function TeacherStudents() {
  const { t } = useTranslation();
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [search, setSearch] = useState('');

  const { data: classrooms = [] } = useQuery({
    queryKey: ['teacher-classrooms'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
    onSuccess: (data) => { if (data.length > 0 && !selectedClassroom) setSelectedClassroom(data[0].id); },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['classroom-students', selectedClassroom],
    queryFn: () => api.get(`/classrooms/${selectedClassroom}/students`).then(r => r.data),
    enabled: !!selectedClassroom,
  });

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const levelColor = (acc) => {
    if (acc >= 80) return 'text-green-600 bg-green-100';
    if (acc >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('classroom.students')}</h1>

      <div className="flex gap-3 flex-wrap">
        {classrooms.map(cls => (
          <button key={cls.id} onClick={() => setSelectedClassroom(cls.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedClassroom === cls.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cls.name}
          </button>
        ))}
      </div>

      {selectedClassroom && (
        <input type="text" className="input" placeholder="🔍 Search students..." value={search} onChange={e => setSearch(e.target.value)} />
      )}

      {isLoading ? (
        <p className="text-center text-gray-400">{t('common.loading')}</p>
      ) : !selectedClassroom ? (
        <p className="text-center text-gray-400 py-12">Select a classroom to view students.</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">👩‍🎓</div>
          <p>No students found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="card flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                  {s.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {s.mastery_count != null && (
                  <span className="text-xs text-gray-500">{s.mastery_count} mastered</span>
                )}
                {s.accuracy != null && (
                  <span className={`badge text-xs ${levelColor(s.accuracy)}`}>{Math.round(s.accuracy)}% acc</span>
                )}
                <span className="badge bg-gray-100 text-gray-500 text-xs">{s.ui_language?.toUpperCase() || 'EN'}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
