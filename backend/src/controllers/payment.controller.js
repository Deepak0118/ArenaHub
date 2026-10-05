import prisma from '../config/prisma.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

export async function createRazorpayOrder(req, res) {
  const payment = await prisma.payment.findUnique({ 
    where: { id: req.params.id },
    include: { user: true }
  });

  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }
  if (payment.userId !== req.user.id && req.user.role !== 'AUTHORITY') {
    return res.status(403).json({ success: false, message: 'This payment is not yours' });
  }
  if (payment.status !== 'PENDING') {
    return res.status(400).json({ success: false, message: `Payment is already ${payment.status}` });
  }

  try {
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = Math.round(parseFloat(payment.amount) * 100);

    const order = await rzp.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${payment.id}`,
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      user: {
        name: payment.user.name,
        email: payment.user.email,
        contact: "9999999999" // Required by Razorpay UI, mock data
      }
    });
  } catch (err) {
    console.error("Razorpay Error:", err);
    res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
  }
}

export async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const paymentId = req.params.id;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest('hex');

  if (generatedSignature === razorpay_signature) {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        method: 'RAZORPAY',
        paidAt: new Date(),
      },
      include: {
        user: true,
        fine: {
          include: { booking: { include: { gameConfig: true } } }
        },
        booking: { include: { gameConfig: true } }
      }
    });

    // Determine the item name for the receipt
    let itemName = 'Unknown Payment';
    if (updated.type === 'FINE' && updated.fine) {
      itemName = `Fine: ${updated.fine.reason} (${updated.fine.booking?.gameConfig?.name})`;
    } else if (updated.type === 'BOOKING_FEE' && updated.booking) {
      itemName = `Booking Fee: ${updated.booking.gameConfig?.name}`;
    }

    // Fire and forget email receipt
    import('../utils/email.js').then(({ sendPaymentReceipt }) => {
      sendPaymentReceipt(updated.user.email, updated.user.name, updated.amount, updated.id, itemName);
    }).catch(err => console.error('Failed to load email utility:', err));

    return res.json({ success: true, payment: updated });
  } else {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
}

export async function myPayments(req, res) {
  const payments = await prisma.payment.findMany({
    where: { userId: req.user.id },
    include: {
      fine: {
        select: {
          reason: true,
          booking: {
            select: { gameConfig: { select: { name: true } } },
          },
        },
      },
      booking: { select: { gameConfig: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, payments });
}

export async function getReceipt(req, res) {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { name: true, username: true, email: true } },
      fine: {
        select: {
          reason: true,
          booking: {
            select: {
              id: true,
              gameConfig: { select: { name: true } },
              returnedAt: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  // Only the payer or authority can view a receipt
  if (payment.userId !== req.user.id && req.user.role !== 'AUTHORITY') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (payment.status !== 'PAID') {
    return res.status(400).json({ success: false, message: 'Receipt only available for completed payments' });
  }

  const receipt = {
    receiptId: payment.id,
    payer: payment.user,
    type: payment.type,
    amount: payment.amount,
    method: payment.method,
    paidAt: payment.paidAt,
    description: payment.fine
      ? `Fine: ${payment.fine.reason} (${payment.fine.booking.gameConfig.name})`
      : `Activity fee`,
  };

  res.json({ success: true, receipt });
}

export async function allPayments(req, res) {
  const { status } = req.query;

  const where = {};
  if (status) where.status = status.toUpperCase();

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: { select: { username: true, name: true } },
      fine: {
        select: {
          reason: true,
          booking: { select: { id: true, gameConfig: { select: { name: true } } } },
        },
      },
      booking: { select: { id: true, gameConfig: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, payments });
}
