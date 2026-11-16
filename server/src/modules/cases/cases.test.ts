import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import { Role, CasePriority, CaseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Stage 3 — Case Management Test Suite', () => {
  const app = createApp();

  let adminToken: string;
  let investigatorToken: string;
  let viewerToken: string;
  let otherInvestigatorToken: string;

  let testCaseId: string;

  beforeAll(async () => {
    // Clean database records
    await prisma.custodyEvent.deleteMany({});
    await prisma.integrityVerification.deleteMany({});
    await prisma.evidence.deleteMany({});
    await prisma.caseAssignment.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'case_admin@iccf.local',
        passwordHash,
        fullName: 'Admin User',
        role: Role.ADMIN,
      },
    });

    const investigator = await prisma.user.create({
      data: {
        email: 'case_investigator@iccf.local',
        passwordHash,
        fullName: 'Lead Investigator',
        role: Role.INVESTIGATOR,
      },
    });

    const otherInvestigator = await prisma.user.create({
      data: {
        email: 'other_investigator@iccf.local',
        passwordHash,
        fullName: 'Unassigned Investigator',
        role: Role.INVESTIGATOR,
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: 'case_viewer@iccf.local',
        passwordHash,
        fullName: 'Auditor Viewer',
        role: Role.VIEWER,
      },
    });

    // Obtain tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'TestPassword123!' });
    adminToken = adminLogin.body.data.token;

    const invLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: investigator.email, password: 'TestPassword123!' });
    investigatorToken = invLogin.body.data.token;

    const otherInvLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: otherInvestigator.email, password: 'TestPassword123!' });
    otherInvestigatorToken = otherInvLogin.body.data.token;

    const viewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: viewer.email, password: 'TestPassword123!' });
    viewerToken = viewerLogin.body.data.token;
  });

  describe('Create Case (POST /api/cases)', () => {
    it('allows an investigator to create a new case with auto-generated reference', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          title: 'Ransomware Incident Alpha',
          description: 'Suspected LockBit ransomware payload detected on accounting workstations.',
          category: 'Ransomware',
          priority: CasePriority.HIGH,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.caseReference).toMatch(/^ICCF-\d{4}-\d{4}$/);
      expect(res.body.data.title).toBe('Ransomware Incident Alpha');
      expect(res.body.data.priority).toBe(CasePriority.HIGH);
      expect(res.body.data.status).toBe(CaseStatus.OPEN);

      testCaseId = res.body.data.id;
    });

    it('forbids a VIEWER from creating a case (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          title: 'Unauthorized Case',
          description: 'This case creation should be rejected.',
          category: 'Policy Violation',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects case creation with invalid or short title (400 Validation Error)', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          title: 'ab', // too short
          description: 'Valid description',
          category: 'Malware',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Retrieve Cases (GET /api/cases)', () => {
    it('returns authorized cases for the investigator', async () => {
      const res = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toHaveProperty('total');
    });

    it('does not leak unassigned restricted cases to other investigators', async () => {
      const res = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${otherInvestigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('allows ADMIN to view all cases across the system', async () => {
      const res = await request(app).get('/api/cases').set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Get Case By ID (GET /api/cases/:caseId)', () => {
    it('retrieves detailed case information for assigned investigator', async () => {
      const res = await request(app)
        .get(`/api/cases/${testCaseId}`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testCaseId);
      expect(res.body.data).toHaveProperty('createdBy');
      expect(res.body.data).toHaveProperty('evidenceItems');
    });

    it('rejects access from unassigned investigator (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/cases/${testCaseId}`)
        .set('Authorization', `Bearer ${otherInvestigatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Update Case (PATCH /api/cases/:caseId)', () => {
    it('updates case status to UNDER_INVESTIGATION', async () => {
      const res = await request(app)
        .patch(`/api/cases/${testCaseId}`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          status: CaseStatus.UNDER_INVESTIGATION,
          priority: CasePriority.CRITICAL,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(CaseStatus.UNDER_INVESTIGATION);
      expect(res.body.data.priority).toBe(CasePriority.CRITICAL);
    });
  });
});
