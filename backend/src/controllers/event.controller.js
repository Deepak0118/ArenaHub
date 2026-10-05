import prisma from '../config/prisma.js';
import { createNotification } from './notification.controller.js';

export async function createEvent(req, res) {
  try {
    const { title, description, startDate, endDate, registrationInfo, disabledGameIds } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Title, startDate, and endDate are required' });
    }

    // Parse disabledGameIds if it came as a JSON string (since we might use FormData for the file upload)
    let parsedDisabledGameIds = [];
    if (disabledGameIds) {
      try {
        parsedDisabledGameIds = typeof disabledGameIds === 'string' ? JSON.parse(disabledGameIds) : disabledGameIds;
      } catch (e) {
        parsedDisabledGameIds = [];
      }
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationInfo,
        posterUrl: req.file ? req.file.path : null,
        createdById: req.user.id,
        disabledGames: {
          connect: parsedDisabledGameIds.map(id => ({ id }))
        }
      },
      include: {
        disabledGames: { select: { id: true, name: true } }
      }
    });

    // Notify all students asynchronously
    prisma.user.findMany({ where: { role: 'STUDENT' } }).then(students => {
      students.forEach(student => {
        createNotification(
          student.id,
          'New Event!',
          `Authority added a new event: ${title}`
        );
      });
    }).catch(err => console.error('Error notifying students:', err));

    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function listEvents(req, res) {
  // Students only see active/upcoming events. Authority sees all for history.
  const now = new Date();
  const where = req.user.role === 'AUTHORITY' ? {} : { endDate: { gte: now } };

  const events = await prisma.event.findMany({
    where,
    include: { createdBy: { select: { name: true } } },
    orderBy: { startDate: 'asc' },
  });

  res.json({ success: true, events });
}

export async function getEvent(req, res) {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { createdBy: { select: { name: true } } },
  });

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  res.json({ success: true, event });
}

export async function deleteEvent(req, res) {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Event deleted' });
}
