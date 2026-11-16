import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, AuthController.register);
authRouter.post('/login', authRateLimiter, AuthController.login);
authRouter.post('/logout', authenticate, AuthController.logout);
authRouter.get('/me', authenticate, AuthController.me);
authRouter.get('/users', authenticate, AuthController.getUsers);
