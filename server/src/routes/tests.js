import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listTests, createTest, getTest, startTest, endTest,
  joinTest, submitTest, logEvent, getResults, streamTestEvents,
} from '../controllers/testController.js';

const router = Router();
router.use(authenticate);

router.get('/', listTests);
router.post('/', requireRole('teacher'), createTest);
router.get('/:id', getTest);
router.post('/:id/start', requireRole('teacher'), startTest);
router.post('/:id/end', requireRole('teacher'), endTest);
router.post('/:id/join', requireRole('student'), joinTest);
router.post('/:id/submit', requireRole('student'), submitTest);
router.post('/:id/events', requireRole('student'), logEvent);
router.get('/:id/results', requireRole('teacher', 'admin'), getResults);
router.get('/:id/stream', streamTestEvents); // SSE

export default router;
