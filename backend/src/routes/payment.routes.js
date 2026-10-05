import { Router } from 'express';
import { createRazorpayOrder, verifyPayment, myPayments, getReceipt, allPayments } from '../controllers/payment.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/:id/razorpay-order', protect, createRazorpayOrder);
router.post('/:id/verify', protect, verifyPayment);
router.get('/my', protect, authorize('STUDENT'), myPayments);
router.get('/:id/receipt', protect, getReceipt);
router.get('/', protect, authorize('AUTHORITY'), allPayments);

export default router;
