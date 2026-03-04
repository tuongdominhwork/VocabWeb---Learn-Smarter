import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getExamQuestions, submitExam, skipExam } from '../controllers/entranceExamController.js';

const router = Router();
router.use(authenticate);

router.get('/questions', getExamQuestions);
router.post('/submit', submitExam);
router.post('/skip', skipExam);

export default router;
