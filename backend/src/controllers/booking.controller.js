import prisma from '../config/prisma.js';
import * as bookingService from '../services/booking.service.js';

export async function createBooking(req, res, next) {
  try {
    const booking = await bookingService.createBooking(req.user.id, req.body);
    res.status(201).json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function acceptBooking(req, res, next) {
  try {
    const booking = await bookingService.acceptBooking(req.params.id, req.user.id);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function declineBooking(req, res, next) {
  try {
    const booking = await bookingService.declineBooking(req.params.id, req.user.id);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req, res, next) {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user.id);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function addParticipant(req, res, next) {
  try {
    const booking = await bookingService.addParticipant(req.params.id, req.user.id, req.body.username);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function removeParticipant(req, res, next) {
  try {
    const booking = await bookingService.removeParticipant(req.params.id, req.user.id, req.params.userId);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function submitBooking(req, res, next) {
  try {
    const booking = await bookingService.submitBooking(req.params.id, req.user.id);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function issueBooking(req, res, next) {
  try {
    const booking = await bookingService.issueBooking(req.params.id);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function rejectBooking(req, res, next) {
  try {
    const booking = await bookingService.rejectBooking(req.params.id);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function returnBooking(req, res, next) {
  try {
    const booking = await bookingService.returnBooking(req.params.id);
    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
}

export async function myBookings(req, res) {
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { createdById: req.user.id },
        { participants: { some: { userId: req.user.id } } },
      ],
    },
    include: {
      gameConfig: { select: { name: true, slotDurationMinutes: true, gracePeriodMinutes: true, collectionWindowMinutes: true, requiresPayment: true } },
      resource: { select: { label: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
      fines: { where: { userId: req.user.id }, select: { amount: true, reason: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const booking of bookings) {
    if (booking.gameConfig.requiresPayment) {
      booking.activityFeePayment = await prisma.payment.findFirst({
        where: { bookingId: booking.id, type: 'ACTIVITY_FEE' },
        orderBy: { createdAt: 'desc' }
      });
    }
  }

  res.json({ success: true, bookings });
}

export async function myInvites(req, res) {
  const invites = await prisma.booking.findMany({
    where: {
      status: 'DRAFT',
      participants: {
        some: { userId: req.user.id, status: 'INVITED' },
      },
    },
    include: {
      gameConfig: { select: { name: true, minPlayers: true, maxPlayers: true } },
      createdBy: { select: { username: true, name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, invites });
}

export async function activeBookings(req, res) {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['DRAFT', 'CONFIRMED_PENDING_COLLECTION', 'ACTIVE'] },
    },
    include: {
      gameConfig: { select: { name: true, slotDurationMinutes: true, gracePeriodMinutes: true } },
      resource: { select: { label: true } },
      createdBy: { select: { username: true, name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, bookings });
}

export async function awaitingCollection(req, res) {
  const bookings = await prisma.booking.findMany({
    where: { status: 'CONFIRMED_PENDING_COLLECTION' },
    include: {
      gameConfig: { select: { name: true, collectionWindowMinutes: true, requiresPayment: true } },
      resource: { select: { label: true } },
      createdBy: { select: { username: true, name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
      fines: { include: { payments: true } },
    },
    orderBy: { collectionDeadline: 'asc' },
  });

  // Since Payment isn't directly related to Booking in our Prisma queries (wait, we query Payment via prisma.payment),
  // Actually, we can just fetch Payments separately and attach them, because the relation from Booking to Payment is missing.
  // Wait, I didn't add the relation. I will fetch it manually.
  for (const booking of bookings) {
    if (booking.gameConfig.requiresPayment) {
      booking.activityFeePayment = await prisma.payment.findFirst({
        where: { bookingId: booking.id, type: 'ACTIVITY_FEE' },
        orderBy: { createdAt: 'desc' }
      });
    }
  }

  res.json({ success: true, bookings });
}
