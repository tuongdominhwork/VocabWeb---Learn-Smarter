import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createFeedback, listFeedback, getFeedbackHistory, updateFeedback } from '../controllers/feedbackController.js';

const router = Router();
router.use(authenticate);

router.get('/', listFeedback);
router.post('/', requireRole('teacher'), createFeedback);
router.get('/history', requireRole('teacher'), getFeedbackHistory);
router.patch('/:id', requireRole('teacher'), updateFeedback);

export default router;
