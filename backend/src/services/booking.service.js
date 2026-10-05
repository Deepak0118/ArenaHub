import prisma from '../config/prisma.js';
// Trigger restart
import { getIO } from '../config/socket.js';
import { createNotification } from '../controllers/notification.controller.js';

// ─── State Machine Transitions ──────────────────────────
// Every valid transition is listed here. No transition not in this map is allowed.
const VALID_TRANSITIONS = {
  DRAFT: ['CONFIRMED_PENDING_COLLECTION', 'CANCELLED'],
  CONFIRMED_PENDING_COLLECTION: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'REJECTED'],
  ACTIVE: ['COMPLETED', 'LATE_RETURNED'],
  // Terminal states — no transitions out
  COMPLETED: [],
  LATE_RETURNED: [],
  EXPIRED: [],
  CANCELLED: [],
  REJECTED: [],
};

function assertTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    const err = new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
    err.statusCode = 400;
    throw err;
  }
}

// ─── Helpers ────────────────────────────────────────────

async function freezeResource(gameConfigId) {
  // Find any available resource for this game
  const available = await prisma.resource.findFirst({
    where: { gameConfigId, status: 'AVAILABLE' },
  });

  if (!available) {
    const err = new Error('No resources available — all are currently in use');
    err.statusCode = 409;
    throw err;
  }

  // Optimistic lock: only succeeds if status AND version still match
  const result = await prisma.resource.updateMany({
    where: {
      id: available.id,
      status: 'AVAILABLE',
      version: available.version,
    },
    data: {
      status: 'FROZEN',
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    // Another request froze it between our read and write — retry once
    return freezeResource(gameConfigId);
  }

  emitAvailabilityUpdate(gameConfigId);
  return available;
}

async function releaseResource(resourceId) {
  const resource = await prisma.resource.update({
    where: { id: resourceId },
    data: { status: 'AVAILABLE', version: { increment: 1 } },
  });
  emitAvailabilityUpdate(resource.gameConfigId);
}

async function markResourceIssued(resourceId) {
  await prisma.resource.update({
    where: { id: resourceId },
    data: { status: 'ISSUED', version: { increment: 1 } },
  });
}

async function emitAvailabilityUpdate(gameConfigId) {
  const io = getIO();
  if (!io) return;

  const resources = await prisma.resource.findMany({
    where: { gameConfigId },
    select: { id: true, label: true, status: true },
    orderBy: { label: 'asc' },
  });

  io.emit('availability_update', { gameConfigId, resources });
}

async function checkNoActiveBooking(userId, excludeBookingId = null, username = null) {
  const where = {
    OR: [
      { createdById: userId },
      { participants: { some: { userId, status: { not: 'DECLINED' } } } },
    ],
    status: { in: ['DRAFT', 'CONFIRMED_PENDING_COLLECTION', 'ACTIVE'] },
  };

  if (excludeBookingId) {
    where.id = { not: excludeBookingId };
  }

  const existing = await prisma.booking.findFirst({
    where,
    include: { gameConfig: { select: { name: true } } },
  });

  if (existing) {
    const err = new Error(
      username
        ? `Player @${username} already has an active/pending booking for ${existing.gameConfig.name}.`
        : `You already have an active/pending booking for ${existing.gameConfig.name}. Return the equipment first.`
    );
    err.statusCode = 400;
    throw err;
  }
}

async function checkCooldown(userId, gameConfig, username = null) {
  if (gameConfig.cooldownMinutes === 0) return;

  const cutoff = new Date(Date.now() - gameConfig.cooldownMinutes * 60 * 1000);
  const recent = await prisma.booking.findFirst({
    where: {
      gameConfigId: gameConfig.id,
      OR: [
        { createdById: userId },
        { participants: { some: { userId } } },
      ],
      status: { in: ['COMPLETED', 'LATE_RETURNED'] },
      returnedAt: { gte: cutoff },
    },
  });

  if (recent) {
    const err = new Error(
      username
        ? `Player @${username} is on a ${gameConfig.cooldownMinutes}-minute cooldown for ${gameConfig.name}.`
        : `Cooldown active: you must wait ${gameConfig.cooldownMinutes} minutes between ${gameConfig.name} sessions.`
    );
    err.statusCode = 400;
    throw err;
  }
}

// ─── Core Booking Operations ────────────────────────────

export async function createBooking(userId, { gameConfigId, participantUsernames = [] }) {
  const now = new Date();
  const gameConfig = await prisma.gameConfig.findUnique({ 
    where: { id: gameConfigId },
    include: {
      disabledForEvents: {
        where: {
          startDate: { lte: now },
          endDate: { gte: now }
        }
      }
    }
  });

  if (!gameConfig) {
    const err = new Error('Game not found');
    err.statusCode = 404;
    throw err;
  }

  if (gameConfig.disabledForEvents.length > 0) {
    const event = gameConfig.disabledForEvents[0];
    const err = new Error(`${gameConfig.name} is currently unavailable due to an ongoing event: ${event.title}`);
    err.statusCode = 400;
    throw err;
  }

  // Validate based on participation type
  const isGroup = gameConfig.participationType === 'FIXED_GROUP';

  // Pre-check if any resources are actually available before creating a booking (even DRAFT)
  const availableCount = await prisma.resource.count({
    where: { gameConfigId, status: 'AVAILABLE' }
  });

  if (availableCount === 0) {
    const err = new Error(`All resources for ${gameConfig.name} are currently in use or disabled.`);
    err.statusCode = 400;
    throw err;
  }

  if (isGroup) {
    // Resolve usernames to user IDs
    const requiredParticipants = gameConfig.minPlayers - 1; // minus the creator
    if (participantUsernames.length < requiredParticipants) {
      const err = new Error(
        `${gameConfig.name} requires ${gameConfig.minPlayers} players. Add ${requiredParticipants} teammate(s).`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // Check creator has no active booking and is not in cooldown
  await checkNoActiveBooking(userId);
  await checkCooldown(userId, gameConfig);

  // Check for duplicate usernames in the input
  if (isGroup && participantUsernames.length > 0) {
    const trimmedNames = participantUsernames.map(uname => uname.trim().toLowerCase());
    const uniqueNames = new Set(trimmedNames);
    if (uniqueNames.size !== trimmedNames.length) {
      const err = new Error("You cannot add the same player multiple times");
      err.statusCode = 400;
      throw err;
    }
  }

  // Resolve participant usernames (for group bookings)
  const participantUsers = [];
  if (isGroup && participantUsernames.length > 0) {
    for (const uname of participantUsernames) {
      const trimmed = uname.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { usernameLower: trimmed },
        select: { id: true, username: true, name: true },
      });
      if (!user) {
        const err = new Error(`User "@${uname}" not found`);
        err.statusCode = 404;
        throw err;
      }
      if (user.id === userId) {
        const err = new Error("You can't add yourself as a participant");
        err.statusCode = 400;
        throw err;
      }
      // Check each participant too
      await checkNoActiveBooking(user.id, null, user.username);
      await checkCooldown(user.id, gameConfig, user.username);
      participantUsers.push(user);
    }
  }

  // For non-group games: freeze resource immediately
  if (!isGroup) {
    const resource = await freezeResource(gameConfigId);
    const now = new Date();
    const collectionDeadline = new Date(now.getTime() + gameConfig.collectionWindowMinutes * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        gameConfigId,
        resourceId: resource.id,
        createdById: userId,
        status: 'CONFIRMED_PENDING_COLLECTION',
        confirmedAt: now,
        collectionDeadline,
        participants: {
          create: { userId, status: 'ACCEPTED' },
        },
      },
      include: {
        gameConfig: { select: { name: true, slotDurationMinutes: true, collectionWindowMinutes: true, requiresPayment: true, activityFee: true } },
        resource: { select: { label: true } },
        participants: { include: { user: { select: { username: true, name: true } } } },
      },
    });

    if (gameConfig.requiresPayment && gameConfig.activityFee > 0) {
      await prisma.payment.create({
        data: {
          userId: booking.createdById,
          type: 'ACTIVITY_FEE',
          bookingId: booking.id,
          amount: Number(gameConfig.activityFee),
          status: 'PENDING',
        }
      });
    }

    return booking;
  }

  // For group games: create in DRAFT, add participants as INVITED
  const booking = await prisma.booking.create({
    data: {
      gameConfigId,
      createdById: userId,
      status: 'DRAFT',
      teamSize: participantUsers.length + 1,
      participants: {
        create: [
          { userId, status: 'ACCEPTED' }, // Creator auto-accepts
          ...participantUsers.map((u) => ({ userId: u.id, status: 'INVITED' })),
        ],
      },
    },
    include: {
      gameConfig: { select: { name: true, slotDurationMinutes: true, collectionWindowMinutes: true, minPlayers: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });

  return booking;
}

export async function acceptBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      gameConfig: true,
      participants: true,
    },
  });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.status !== 'DRAFT') {
    const err = new Error('This booking is no longer accepting responses');
    err.statusCode = 400;
    throw err;
  }

  const participant = booking.participants.find((p) => p.userId === userId);
  if (!participant) {
    const err = new Error('You are not invited to this booking');
    err.statusCode = 403;
    throw err;
  }
  if (participant.status === 'ACCEPTED') {
    const err = new Error('You have already accepted');
    err.statusCode = 400;
    throw err;
  }

  // Check this participant has no other active booking
  // (excluding the current booking they're accepting)
  await checkNoActiveBooking(userId, bookingId);

  // Update participant status
  await prisma.bookingParticipant.update({
    where: { id: participant.id },
    data: { status: 'ACCEPTED' },
  });

  // Check if ALL participants have now accepted (just for UI state, no auto-submission)
  const allParticipants = await prisma.bookingParticipant.findMany({
    where: { bookingId },
  });

  const allAccepted = allParticipants.every((p) => p.status === 'ACCEPTED');

  // Return fresh booking with all relations
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      gameConfig: { select: { name: true, slotDurationMinutes: true, collectionWindowMinutes: true } },
      resource: { select: { label: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });
}

export async function declineBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { participants: true, gameConfig: { select: { name: true } } },
  });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.status !== 'DRAFT') {
    const err = new Error('This booking is no longer accepting responses');
    err.statusCode = 400;
    throw err;
  }

  const participant = booking.participants.find((p) => p.userId === userId);
  if (!participant) {
    const err = new Error('You are not invited to this booking');
    err.statusCode = 403;
    throw err;
  }

  // Update participant to DECLINED
  await prisma.bookingParticipant.update({
    where: { id: participant.id },
    data: { status: 'DECLINED' },
  });

  // We no longer cancel the booking automatically. It stays in DRAFT.
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      gameConfig: { select: { name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });
}

export async function addParticipant(bookingId, userId, usernameToAdd) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { participants: true, gameConfig: true },
  });

  if (!booking) {
    const err = new Error('Booking not found'); err.statusCode = 404; throw err;
  }
  if (booking.createdById !== userId) {
    const err = new Error('Only the creator can add participants'); err.statusCode = 403; throw err;
  }
  if (booking.status !== 'DRAFT') {
    const err = new Error('Cannot modify roster after booking is submitted'); err.statusCode = 400; throw err;
  }
  if (booking.participants.length >= (booking.teamSize || booking.gameConfig.maxPlayers)) {
    const err = new Error('Lobby is full'); err.statusCode = 400; throw err;
  }

  const trimmed = usernameToAdd.trim().toLowerCase();
  const userToAdd = await prisma.user.findUnique({ where: { usernameLower: trimmed } });
  if (!userToAdd) {
    const err = new Error(`User "@${usernameToAdd}" not found`); err.statusCode = 404; throw err;
  }
  if (userToAdd.id === userId) {
    const err = new Error("You are already in the lobby"); err.statusCode = 400; throw err;
  }
  if (booking.participants.some(p => p.userId === userToAdd.id)) {
    const err = new Error("User is already in the lobby"); err.statusCode = 400; throw err;
  }

  await checkNoActiveBooking(userToAdd.id, null, userToAdd.username);
  await checkCooldown(userToAdd.id, booking.gameConfig, userToAdd.username);

  await prisma.bookingParticipant.create({
    data: { bookingId, userId: userToAdd.id, status: 'INVITED' }
  });

  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      gameConfig: { select: { name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });
}

export async function removeParticipant(bookingId, userId, participantUserId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { participants: true },
  });

  if (!booking) {
    const err = new Error('Booking not found'); err.statusCode = 404; throw err;
  }
  if (booking.createdById !== userId) {
    const err = new Error('Only the creator can remove participants'); err.statusCode = 403; throw err;
  }
  if (booking.status !== 'DRAFT') {
    const err = new Error('Cannot modify roster after booking is submitted'); err.statusCode = 400; throw err;
  }
  if (participantUserId === userId) {
    const err = new Error('Cannot remove yourself'); err.statusCode = 400; throw err;
  }

  await prisma.bookingParticipant.deleteMany({
    where: { bookingId, userId: participantUserId }
  });

  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      gameConfig: { select: { name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });
}

export async function submitBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { gameConfig: true, participants: true },
  });

  if (!booking) {
    const err = new Error('Booking not found'); err.statusCode = 404; throw err;
  }
  if (booking.createdById !== userId) {
    const err = new Error('Only the creator can submit the booking'); err.statusCode = 403; throw err;
  }
  if (booking.status !== 'DRAFT') {
    const err = new Error('Booking is already submitted'); err.statusCode = 400; throw err;
  }

  const allAccepted = booking.participants.every(p => p.status === 'ACCEPTED');
  if (!allAccepted) {
    const err = new Error('All players must accept the invite before submitting'); err.statusCode = 400; throw err;
  }
  if (booking.participants.length < booking.gameConfig.minPlayers) {
    const err = new Error(`Need at least ${booking.gameConfig.minPlayers} players`); err.statusCode = 400; throw err;
  }

  const resource = await freezeResource(booking.gameConfigId);
  const now = new Date();
  const collectionDeadline = new Date(
    now.getTime() + booking.gameConfig.collectionWindowMinutes * 60 * 1000
  );

  assertTransition(booking.status, 'CONFIRMED_PENDING_COLLECTION');

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED_PENDING_COLLECTION',
      resourceId: resource.id,
      confirmedAt: now,
      collectionDeadline,
    },
    include: {
      gameConfig: true,
      participants: { include: { user: { select: { username: true, name: true } } } },
    }
  });

  if (booking.gameConfig.requiresPayment && booking.gameConfig.activityFee > 0) {
    const totalFee = Number(booking.gameConfig.activityFee) * booking.participants.length;
    await prisma.payment.create({
      data: {
        userId: booking.createdById,
        type: 'ACTIVITY_FEE',
        bookingId: booking.id,
        amount: totalFee,
        status: 'PENDING',
      }
    });
  }

  const authority = await prisma.user.findFirst({ where: { role: 'AUTHORITY' } });
  if (authority) {
    createNotification(
      authority.id,
      'Equipment Request',
      `A new session for ${updated.gameConfig.name} is awaiting equipment collection.`
    );
  }

  return updated;
}

export async function cancelBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { gameConfig: true },
  });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.createdById !== userId) {
    const err = new Error('Only the booking creator can cancel');
    err.statusCode = 403;
    throw err;
  }

  // If already cancelled, return without error
  if (booking.status === 'CANCELLED') {
    return booking;
  }

  assertTransition(booking.status, 'CANCELLED');

  // Release resource if one was frozen
  if (booking.resourceId) {
    await releaseResource(booking.resourceId);
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
    include: {
      gameConfig: { select: { name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });
}

export async function rejectBooking(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { gameConfig: true },
  });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  assertTransition(booking.status, 'REJECTED');

  if (booking.resourceId) {
    await releaseResource(booking.resourceId);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'REJECTED' },
    include: {
      gameConfig: { select: { name: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });

  for (const p of updatedBooking.participants) {
    createNotification(
      p.userId,
      'Session Rejected',
      `The session for ${updatedBooking.gameConfig.name} was rejected by the authority.`
    ).catch(console.error);
  }

  return updatedBooking;
}

export async function issueBooking(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { gameConfig: true },
  });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  assertTransition(booking.status, 'ACTIVE');

  const now = new Date();
  const endTime = new Date(now.getTime() + booking.gameConfig.slotDurationMinutes * 60 * 1000);

  // Mark resource as ISSUED
  if (booking.resourceId) {
    await markResourceIssued(booking.resourceId);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'ACTIVE',
      issuedAt: now,
      startTime: now,
      endTime,
    },
    include: {
      gameConfig: { select: { name: true, slotDurationMinutes: true, gracePeriodMinutes: true } },
      resource: { select: { label: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
    },
  });

  for (const p of updatedBooking.participants) {
    createNotification(
      p.userId,
      'Session Approved',
      `The session for ${updatedBooking.gameConfig.name} is now ACTIVE!`
    ).catch(console.error);
  }

  return updatedBooking;
}

export async function returnBooking(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { gameConfig: true, participants: true },
  });

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.status !== 'ACTIVE') {
    const err = new Error('Only active bookings can be returned');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const graceDeadline = new Date(
    booking.endTime.getTime() + booking.gameConfig.gracePeriodMinutes * 60 * 1000
  );

  const isLate = now > graceDeadline;
  const newStatus = isLate ? 'LATE_RETURNED' : 'COMPLETED';

  assertTransition(booking.status, newStatus);

  // Release the resource back to available
  if (booking.resourceId) {
    await releaseResource(booking.resourceId);
  }

  // Calculate and create fines if late
  if (isLate) {
    const overdueMs = now.getTime() - graceDeadline.getTime();
    const overdueMinutes = Math.ceil(overdueMs / (60 * 1000));
    const finePerMinute = Number(booking.gameConfig.finePerMinute);
    const totalFine = overdueMinutes * finePerMinute;
    const participantIds = booking.participants.map((p) => p.userId);

    await createFines(booking, totalFine, participantIds, overdueMinutes);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: newStatus, returnedAt: now },
    include: {
      gameConfig: { select: { name: true } },
      resource: { select: { label: true } },
      participants: { include: { user: { select: { username: true, name: true } } } },
      fines: { include: { user: { select: { username: true, name: true } } } },
    },
  });

  for (const p of updatedBooking.participants) {
    createNotification(
      p.userId,
      'Session Completed',
      `Your session for ${updatedBooking.gameConfig.name} has been marked as returned.`
    ).catch(console.error);
  }

  return updatedBooking;
}

async function createFines(booking, totalFine, participantIds, overdueMinutes) {
  const strategy = booking.gameConfig.fineStrategy;
  const finePerMinute = Number(booking.gameConfig.finePerMinute);

  const finesData = [];

  switch (strategy) {
    case 'SPLIT': {
      // Divide total fine equally across all participants
      const perPerson = Math.ceil(totalFine / participantIds.length);
      for (const uid of participantIds) {
        finesData.push({
          bookingId: booking.id,
          userId: uid,
          amount: perPerson,
          reason: `Late return: ${overdueMinutes} min overdue × ₹${finePerMinute}/min, split ${participantIds.length} ways`,
        });
      }
      break;
    }
    case 'PER_PARTICIPANT': {
      // Each participant pays the full fine
      for (const uid of participantIds) {
        finesData.push({
          bookingId: booking.id,
          userId: uid,
          amount: totalFine,
          reason: `Late return: ${overdueMinutes} min overdue × ₹${finePerMinute}/min`,
        });
      }
      break;
    }
    case 'FLAT': {
      // Only the creator pays
      finesData.push({
        bookingId: booking.id,
        userId: booking.createdById,
        amount: totalFine,
        reason: `Late return: ${overdueMinutes} min overdue × ₹${finePerMinute}/min`,
      });
      break;
    }
  }

  // Create fines and corresponding pending payments
  for (const fineData of finesData) {
    const fine = await prisma.fine.create({ data: fineData });
    await prisma.payment.create({
      data: {
        userId: fineData.userId,
        type: 'FINE',
        fineId: fine.id,
        bookingId: booking.id,
        amount: fineData.amount,
        status: 'PENDING',
      },
    });

    createNotification(
      fineData.userId,
      'Fine Issued',
      `You have been fined ₹${fineData.amount}. Reason: ${fineData.reason}`
    ).catch(console.error);
  }
}

export async function expireBooking(bookingId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== 'CONFIRMED_PENDING_COLLECTION') return;

  assertTransition(booking.status, 'EXPIRED');

  if (booking.resourceId) {
    await releaseResource(booking.resourceId);
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'EXPIRED' },
  });
}
