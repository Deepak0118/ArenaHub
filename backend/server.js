import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import { initSocket } from './src/config/socket.js';
import { startExpiryJobs } from './src/jobs/expiryJobs.js';
import prisma from './src/config/prisma.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

async function startServer() {
  try {
    // Verify and establish database connection pool before opening HTTP port
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection pool initialized successfully.');

    server.listen(PORT, () => {
      console.log(`ArenaHub API server listening on port ${PORT}`);
      startExpiryJobs();
    });
  } catch (err) {
    console.error('FATAL: Database connection failed during startup:', err.message);
    process.exit(1);
  }
}

startServer();
