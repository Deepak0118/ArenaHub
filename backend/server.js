import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import { initSocket } from './src/config/socket.js';
import { startExpiryJobs } from './src/jobs/expiryJobs.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`ArenaHub API running on port ${PORT}`);
  startExpiryJobs();
});
