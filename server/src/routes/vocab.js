import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listVocab, getVocab, createVocab, updateVocab, deleteVocab,
  approveVocab, importVocab, upload, listTopics, createTopic, downloadTemplate,
} from '../controllers/vocabController.js';

const router = Router();
router.use(authenticate);

router.get('/template', downloadTemplate);
router.get('/topics', listTopics);
router.post('/topics', requireRole('teacher', 'admin'), createTopic);
router.post('/import', requireRole('teacher', 'admin'), upload.single('file'), importVocab);
router.get('/', listVocab);
router.post('/', requireRole('teacher', 'admin'), createVocab);
router.get('/:id', getVocab);
router.patch('/:id', requireRole('teacher', 'admin'), updateVocab);
router.delete('/:id', requireRole('teacher', 'admin'), deleteVocab);
router.patch('/:id/approve', requireRole('teacher', 'admin'), approveVocab);

export default router;
