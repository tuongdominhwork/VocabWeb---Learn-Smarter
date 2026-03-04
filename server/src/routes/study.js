import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createSession, submitAnswer, completeSession, getStudyStats } from '../controllers/studyController.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('student'));

router.post('/session/create', createSession);
router.post('/answer', submitAnswer);
router.post('/session/:id/complete', completeSession);
router.get('/stats', getStudyStats);

export default router;
