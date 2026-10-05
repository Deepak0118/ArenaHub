import prisma from '../config/prisma.js';
import { getIO } from '../config/socket.js';

export async function createNotification(userId, title, message) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });

    const io = getIO();
    if (io) {
      // Emit to the specific user's room
      io.to(userId).emit('new_notification', notification);
    }

    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

export async function getMyNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50
    });

    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function markAsRead(req, res) {
  try {
    const notification = await prisma.notification.updateMany({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      data: { read: true },
    });

    res.json({ success: true, count: notification.count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function markAllAsRead(req, res) {
  try {
    const result = await prisma.notification.updateMany({
      where: { 
        userId: req.user.id,
        read: false 
      },
      data: { read: true },
    });

    res.json({ success: true, count: result.count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
