import express from 'express';
import cors from 'cors';

const app = express();

// ── Core middleware ──
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server pings)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback allow for launch
  },
  credentials: true,
}));
app.use(express.json());

// ── Health check ──
app.get('/', (req, res) => {
  res.status(200).send('ArenaHub API Server is Live and Operational');
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ArenaHub API running' });
});

// ── Routes (imported after they're created) ──
import authRoutes from './routes/auth.routes.js';
import gameRoutes from './routes/game.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import fineRoutes from './routes/fine.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import eventRoutes from './routes/event.routes.js';
import notificationRoutes from './routes/notification.routes.js';

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);


// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error handler ──
app.use((err, req, res, _next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, message });
});

export default app;
