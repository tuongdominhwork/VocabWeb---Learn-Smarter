import { Router } from 'express';
import { register, login, logout, requestReset, resetPassword } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/request-reset', requestReset);
router.post('/reset', resetPassword);

export default router;
