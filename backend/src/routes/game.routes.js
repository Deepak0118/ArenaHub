import { Router } from 'express';
import { listGames, getGame, updateGame, getAvailability, addResource, deleteResource, updateResourceStatus } from '../controllers/game.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, listGames);
router.get('/:id', protect, getGame);
router.put('/:id', protect, authorize('AUTHORITY'), updateGame);
router.get('/:id/availability', protect, getAvailability);

// Resource Management
router.post('/:id/resources', protect, authorize('AUTHORITY'), addResource);
router.delete('/:id/resources/:resourceId', protect, authorize('AUTHORITY'), deleteResource);
router.patch('/:id/resources/:resourceId/status', protect, authorize('AUTHORITY'), updateResourceStatus);

export default router;
