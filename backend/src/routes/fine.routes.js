import { Router } from 'express';
import { myFines, allFines } from '../controllers/fine.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/my', protect, authorize('STUDENT'), myFines);
router.get('/', protect, authorize('AUTHORITY'), allFines);

export default router;
