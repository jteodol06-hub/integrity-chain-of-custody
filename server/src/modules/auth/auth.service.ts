import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role, AuditOutcome } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../../middleware/error.middleware.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  jti?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    badgeNumber: string | null;
    department: string | null;
  };
  token: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * Hashes a plaintext password using bcrypt with work factor 10.
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compares a plaintext password against a stored bcrypt hash.
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Signs a secure JSON Web Token with configured expiry and unique RFC 7519 jti claim.
   */
  static generateToken(payload: TokenPayload): string {
    return jwt.sign(
      {
        ...payload,
        jti: payload.jti || crypto.randomUUID(),
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      }
    );
  }

  /**
   * Registers a new authorized user in the system.
   */
  static async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      const error: AppError = new Error('A user with this email address already exists');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await this.hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role || Role.INVESTIGATOR,
        badgeNumber: input.badgeNumber,
        department: input.department,
      },
    });

    // Record audit event
    await AuditService.record({
      actorId: user.id,
      action: 'AUTH_REGISTER',
      resourceType: 'USER',
      resourceId: user.id,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: { email: user.email, role: user.role },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        badgeNumber: user.badgeNumber,
        department: user.department,
      },
      token,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }

  /**
   * Authenticates user credentials and issues a secure session token.
   */
  static async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.isActive) {
      // Record failed login audit event
      await AuditService.record({
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'USER',
        outcome: AuditOutcome.FAILURE,
        ipAddress,
        userAgent,
        metadata: { attemptedEmail: input.email, reason: 'User not found or inactive' },
      });

      const error: AppError = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await this.verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      // Record failed password audit event
      await AuditService.record({
        actorId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'USER',
        resourceId: user.id,
        outcome: AuditOutcome.FAILURE,
        ipAddress,
        userAgent,
        metadata: { attemptedEmail: input.email, reason: 'Invalid password' },
      });

      const error: AppError = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Record successful login audit event
    await AuditService.record({
      actorId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'USER',
      resourceId: user.id,
      outcome: AuditOutcome.SUCCESS,
      ipAddress,
      userAgent,
      metadata: { email: user.email, role: user.role },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        badgeNumber: user.badgeNumber,
        department: user.department,
      },
      token,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }

  /**
   * Invalidates a user session token.
   */
  static async logout(token: string, actorId?: string, ipAddress?: string, userAgent?: string) {
    await prisma.session.deleteMany({
      where: { token },
    });

    if (actorId) {
      await AuditService.record({
        actorId,
        action: 'AUTH_LOGOUT',
        resourceType: 'USER',
        resourceId: actorId,
        outcome: AuditOutcome.SUCCESS,
        ipAddress,
        userAgent,
      });
    }
  }

  /**
   * Retrieves profile details for the authenticated user.
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        badgeNumber: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      const error: AppError = new Error('User not found or account is deactivated');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  /**
   * Retrieves active users in the system (for assignment and transfer selections).
   */
  static async getUsers() {
    return prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        badgeNumber: true,
        department: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }
}
