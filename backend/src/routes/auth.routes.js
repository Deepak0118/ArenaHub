import { Router } from 'express';
import { googleLogin, localLogin, completeRegistration, getMe, resolveUsername } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/login', authRateLimiter, localLogin);
router.post('/google', authRateLimiter, googleLogin);
router.post('/complete-registration', completeRegistration);
router.get('/me', protect, getMe);
router.get('/resolve/:username', protect, resolveUsername);

export default router;
