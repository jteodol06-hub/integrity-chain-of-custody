import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Stage 2 — Authentication & RBAC Test Suite', () => {
  const app = createApp();

  const testAdmin = {
    email: 'test_admin@iccf.local',
    password: 'SecureAdmin123!',
    fullName: 'Test System Administrator',
    role: Role.ADMIN,
  };

  const testInvestigator = {
    email: 'test_investigator@iccf.local',
    password: 'SecureInvestigator123!',
    fullName: 'Test Investigator Special Agent',
    role: Role.INVESTIGATOR,
  };

  beforeAll(async () => {
    // Ensure test users exist with known bcrypt passwords
    await prisma.auditLog.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { in: [testAdmin.email, testInvestigator.email, 'new_agent@iccf.local'] },
      },
    });

    const adminHash = await bcrypt.hash(testAdmin.password, 10);
    await prisma.user.create({
      data: {
        email: testAdmin.email,
        passwordHash: adminHash,
        fullName: testAdmin.fullName,
        role: testAdmin.role,
      },
    });

    const investigatorHash = await bcrypt.hash(testInvestigator.password, 10);
    await prisma.user.create({
      data: {
        email: testInvestigator.email,
        passwordHash: investigatorHash,
        fullName: testInvestigator.fullName,
        role: testInvestigator.role,
      },
    });
  });

  describe('User Registration (POST /api/auth/register)', () => {
    it('successfully registers an investigator with valid payload', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'new_agent@iccf.local',
        password: 'Password99@!',
        fullName: 'Agent Alex Rivera',
        badgeNumber: 'ICCF-770',
        department: 'Cyber Forensics Unit',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe('new_agent@iccf.local');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data).toHaveProperty('token');
    });

    it('rejects registration with duplicate email (409 Conflict)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'new_agent@iccf.local',
        password: 'Password99@!',
        fullName: 'Duplicate Agent',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already exists');
    });

    it('rejects registration with weak password lacking special characters', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'weakpass@iccf.local',
        password: 'weakpassword123',
        fullName: 'Weak Password User',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Login (POST /api/auth/login)', () => {
    it('authenticates valid credentials and returns JWT token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testAdmin.email,
        password: testAdmin.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testAdmin.email);
      expect(res.body.data.user.role).toBe(Role.ADMIN);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('expiresIn');
    });

    it('rejects login with incorrect password (401 Unauthorized)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testAdmin.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects login with non-existent email without user enumeration leakage', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@iccf.local',
        password: 'AnyPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      // Identical error message prevents account enumeration
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('Protected Current User (GET /api/auth/me)', () => {
    it('returns user profile when authenticated with valid Bearer token', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: testInvestigator.email,
        password: testInvestigator.password,
      });
      const token = loginRes.body.data.token;

      const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe(testInvestigator.email);
      expect(meRes.body.data.user.role).toBe(Role.INVESTIGATOR);
      expect(meRes.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects request without Authorization header (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects request with forged/invalid token (401 Unauthorized)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer forged_jwt_token_tampered');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('allows ADMIN to access restricted audit endpoint (GET /api/audit)', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: testAdmin.email,
        password: testAdmin.password,
      });
      const adminToken = loginRes.body.data.token;

      const auditRes = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.success).toBe(true);
      expect(Array.isArray(auditRes.body.data)).toBe(true);
    });

    it('forbids INVESTIGATOR from accessing ADMIN-only audit endpoint (403 Forbidden)', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: testInvestigator.email,
        password: testInvestigator.password,
      });
      const investigatorToken = loginRes.body.data.token;

      const auditRes = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(auditRes.status).toBe(403);
      expect(auditRes.body.success).toBe(false);
      expect(auditRes.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Audit Logging of Authentication Events', () => {
    it('records audit log entries for authentication actions', async () => {
      const auditRecords = await prisma.auditLog.findMany({
        where: {
          action: { in: ['AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILED', 'AUTH_REGISTER'] },
        },
      });

      expect(auditRecords.length).toBeGreaterThan(0);
      const actions = auditRecords.map((r) => r.action);
      expect(actions).toContain('AUTH_LOGIN_SUCCESS');
      expect(actions).toContain('AUTH_LOGIN_FAILED');
      expect(actions).toContain('AUTH_REGISTER');
    });
  });
});
