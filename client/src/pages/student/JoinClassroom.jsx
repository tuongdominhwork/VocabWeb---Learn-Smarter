import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../api/axios.js';

export default function JoinClassroom() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: classrooms } = useQuery({
    queryKey: ['my-classroom'],
    queryFn: () => api.get('/classrooms').then(r => r.data),
  });

  const myClassroom = classrooms?.[0];

  const joinMutation = useMutation({
    mutationFn: () => api.post('/classrooms/join', { join_code: code.trim().toUpperCase() }).then(r => r.data),
    onSuccess: (data) => {
      setSuccess(data.message);
      setCode('');
      qc.invalidateQueries(['my-classroom']);
    },
    onError: (err) => setError(err.response?.data?.error || t('common.error')),
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.delete('/classrooms/leave').then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['my-classroom']),
  });

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">{t('classroom.title')}</h1>
      </motion.div>

      {myClassroom ? (
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">🏫</div>
            <div>
              <p className="font-semibold text-gray-900">{myClassroom.name}</p>
              <p className="text-sm text-gray-500">Teacher: {myClassroom.teacher_name}</p>
            </div>
          </div>
          {myClassroom.description && <p className="text-sm text-gray-600">{myClassroom.description}</p>}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-mono font-medium text-gray-700">{myClassroom.join_code}</span>
            <span className="text-xs text-gray-400">join code</span>
          </div>
          <button
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
            className="btn-secondary text-red-600 hover:text-red-700"
          >
            Leave Classroom
          </button>
        </div>
      ) : (
        <div className="card space-y-4">
          <h2 className="font-semibold">{t('classroom.join_title')}</h2>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <div>
            <label className="label">{t('classroom.enter_code')}</label>
            <input
              type="text"
              className="input font-mono uppercase tracking-widest"
              placeholder="APPLE-1234"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); setSuccess(''); }}
            />
          </div>
          <button
            onClick={() => joinMutation.mutate()}
            disabled={!code.trim() || joinMutation.isPending}
            className="btn-primary w-full justify-center"
          >
            {joinMutation.isPending ? t('common.loading') : t('classroom.join_btn')}
          </button>
        </div>
      )}
    </div>
  );
}
