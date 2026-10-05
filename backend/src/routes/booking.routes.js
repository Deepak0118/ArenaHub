import { Router } from 'express';
import {
  createBooking, acceptBooking, declineBooking, cancelBooking,
  issueBooking, returnBooking, myBookings, myInvites,
  activeBookings, awaitingCollection, addParticipant, removeParticipant, submitBooking,
  rejectBooking
} from '../controllers/booking.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Student endpoints
router.post('/', protect, authorize('STUDENT'), createBooking);
router.post('/:id/accept', protect, authorize('STUDENT'), acceptBooking);
router.post('/:id/decline', protect, authorize('STUDENT'), declineBooking);
router.post('/:id/cancel', protect, authorize('STUDENT'), cancelBooking);
router.post('/:id/submit', protect, authorize('STUDENT'), submitBooking);
router.post('/:id/participants', protect, authorize('STUDENT'), addParticipant);
router.delete('/:id/participants/:userId', protect, authorize('STUDENT'), removeParticipant);
router.get('/my', protect, authorize('STUDENT'), myBookings);
router.get('/invites', protect, authorize('STUDENT'), myInvites);

// Authority endpoints
router.post('/:id/issue', protect, authorize('AUTHORITY'), issueBooking);
router.post('/:id/reject', protect, authorize('AUTHORITY'), rejectBooking);
router.post('/:id/return', protect, authorize('AUTHORITY'), returnBooking);
router.get('/active', protect, authorize('AUTHORITY'), activeBookings);
router.get('/awaiting-collection', protect, authorize('AUTHORITY'), awaitingCollection);

export default router;
