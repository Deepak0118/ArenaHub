import { Router } from 'express';
import { googleLogin, localLogin, completeRegistration, getMe, resolveUsername } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/login', localLogin);
router.post('/google', googleLogin);
router.post('/complete-registration', completeRegistration);
router.get('/me', protect, getMe);
router.get('/resolve/:username', protect, resolveUsername);

export default router;
