import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { globalRateLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';

export const createApp = (): Express => {
  const app = express();

  // Defensive HTTP Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  // Strict CORS policy restricted to configured frontend origin
  app.use(
    cors({
      origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Rate Limiting
  app.use(globalRateLimiter);

  // Body Parsing with restricted payload limits (defense against payload exhaustion)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Mount API router
  app.use(env.API_PREFIX, apiRouter);

  // 404 Route handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found on this server`,
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
