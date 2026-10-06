import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import { initSocket } from './src/config/socket.js';
import { startExpiryJobs } from './src/jobs/expiryJobs.js';
import prisma from './src/config/prisma.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, async () => {
  console.log(`ArenaHub API running on port ${PORT}`);
  startExpiryJobs();
  // Warm up Prisma DB connection pool eagerly to eliminate initial query latency
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.warn('DB Warmup Notice:', err.message);
  }
});
