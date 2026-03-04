import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getTodayQuiz, submitDailyQuiz } from '../controllers/dailyQuizController.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('student'));

router.get('/today', getTodayQuiz);
router.post('/submit', submitDailyQuiz);

export default router;
