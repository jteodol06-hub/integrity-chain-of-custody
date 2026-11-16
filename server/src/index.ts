import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  ICCF Digital Evidence Platform Backend API`);
  console.log(`📡 Server listening on port ${env.PORT}`);
  console.log(`🌐 Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`🔒 Environment: ${env.NODE_ENV}`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down ICCF server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
