import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listClassrooms, createClassroom, joinClassroom, leaveClassroom,
  getClassroom, getClassroomStudents, updateClassroom, deleteClassroom,
  getClassroomVocab, assignVocabToClassroom, removeVocabFromClassroom,
} from '../controllers/classroomController.js';

const router = Router();
router.use(authenticate);

router.get('/', listClassrooms);
router.post('/', requireRole('teacher', 'admin'), createClassroom);
router.post('/join', requireRole('student'), joinClassroom);
router.delete('/leave', requireRole('student'), leaveClassroom);
router.get('/:id', getClassroom);
router.patch('/:id', requireRole('teacher', 'admin'), updateClassroom);
router.delete('/:id', requireRole('teacher', 'admin'), deleteClassroom);
router.get('/:id/students', requireRole('teacher', 'admin'), getClassroomStudents);
router.get('/:id/vocab', getClassroomVocab);
router.post('/:id/vocab', requireRole('teacher', 'admin'), assignVocabToClassroom);
router.delete('/:id/vocab/:vocab_id', requireRole('teacher', 'admin'), removeVocabFromClassroom);

export default router;
