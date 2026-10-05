import cron from 'node-cron';
import prisma from '../config/prisma.js';
import { expireBooking } from '../services/booking.service.js';

export function startExpiryJobs() {
  // ── Collection window expiry (every 30 seconds) ──
  // Bookings in CONFIRMED_PENDING_COLLECTION whose collectionDeadline has passed
  // → move to EXPIRED, release the frozen resource
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const expired = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED_PENDING_COLLECTION',
          collectionDeadline: { lte: new Date() },
        },
        select: { id: true },
      });

      for (const booking of expired) {
        await expireBooking(booking.id);
      }

      if (expired.length > 0) {
        console.log(`Expired ${expired.length} uncollected booking(s)`);
      }
    } catch (err) {
      console.error('Collection expiry job error:', err);
    }
  });

  console.log('Expiry jobs started');
}
