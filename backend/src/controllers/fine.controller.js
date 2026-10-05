import prisma from '../config/prisma.js';

export async function myFines(req, res) {
  const fines = await prisma.fine.findMany({
    where: { userId: req.user.id },
    include: {
      booking: {
        select: {
          id: true,
          gameConfig: { select: { name: true } },
          returnedAt: true,
        },
      },
      payments: { select: { id: true, status: true, amount: true, paidAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, fines });
}

export async function allFines(req, res) {
  const fines = await prisma.fine.findMany({
    include: {
      user: { select: { username: true, name: true } },
      booking: {
        select: {
          id: true,
          gameConfig: { select: { name: true } },
          returnedAt: true,
        },
      },
      payments: { select: { id: true, status: true, amount: true, paidAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, fines });
}
