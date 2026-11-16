import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import { Role, CustodyEventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Stage 3 — Evidence Management & Ingestion Test Suite', () => {
  const app = createApp();

  let adminToken: string;
  let investigatorToken: string;
  let otherInvestigatorToken: string;
  let testCaseId: string;
  let testEvidenceId: string;

  const testFileContent =
    'LOG_ENTRY: 2026-11-10T12:00:00Z Connection established from 192.168.1.50:443';
  const expectedHash = crypto.createHash('sha256').update(testFileContent).digest('hex');

  beforeAll(async () => {
    // Clear previous test records
    await prisma.custodyEvent.deleteMany({});
    await prisma.integrityVerification.deleteMany({});
    await prisma.evidence.deleteMany({});
    await prisma.caseAssignment.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash('EvidenceTestPass123!', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'evid_admin@iccf.local',
        passwordHash,
        fullName: 'Evidence Admin',
        role: Role.ADMIN,
      },
    });

    const investigator = await prisma.user.create({
      data: {
        email: 'evid_investigator@iccf.local',
        passwordHash,
        fullName: 'Evidence Examiner',
        role: Role.INVESTIGATOR,
      },
    });

    const otherInvestigator = await prisma.user.create({
      data: {
        email: 'other_examiner@iccf.local',
        passwordHash,
        fullName: 'Unauthorized Examiner',
        role: Role.INVESTIGATOR,
      },
    });

    // Obtain tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'EvidenceTestPass123!' });
    adminToken = adminLogin.body.data.token;

    const invLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: investigator.email, password: 'EvidenceTestPass123!' });
    investigatorToken = invLogin.body.data.token;

    const otherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: otherInvestigator.email, password: 'EvidenceTestPass123!' });
    otherInvestigatorToken = otherLogin.body.data.token;

    // Create a base investigation case
    const caseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        title: 'Forensic Memory Analysis',
        description: 'Memory dump acquisition and log extraction from compromised host.',
        category: 'Malware Analysis',
      });
    testCaseId = caseRes.body.data.id;
  });

  describe('Evidence Ingestion & SHA-256 Hashing (POST /api/cases/:caseId/evidence)', () => {
    it('uploads valid digital evidence, computes genuine SHA-256, and creates genesis custody event', async () => {
      const res = await request(app)
        .post(`/api/cases/${testCaseId}/evidence`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .field('title', 'Server Auth Log')
        .field('description', 'Extracted security event log file')
        .field('category', 'System Logs')
        .attach('file', Buffer.from(testFileContent), 'auth_audit.log');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.evidenceReference).toMatch(/^EVID-\d{4}-\d{4}$/);
      expect(res.body.data.originalFilename).toBe('auth_audit.log');
      expect(res.body.data.sha256Hash).toBe(expectedHash);
      expect(res.body.data.fileSizeBytes).toBe(testFileContent.length);
      expect(res.body.data.storageReference).toBeUndefined(); // Never exposed

      testEvidenceId = res.body.data.id;

      // Verify Genesis custody event in database
      const custodyEvents = await prisma.custodyEvent.findMany({
        where: { evidenceId: testEvidenceId },
      });

      expect(custodyEvents.length).toBe(1);
      expect(custodyEvents[0].eventType).toBe(CustodyEventType.EVIDENCE_REGISTERED);
      expect(custodyEvents[0].previousEventHash).toBe(
        '0000000000000000000000000000000000000000000000000000000000000000'
      );
      expect(custodyEvents[0].currentEventHash).toHaveLength(64);
    });

    it('rejects unsupported executable file types (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/cases/${testCaseId}/evidence`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .field('title', 'Malicious Executable')
        .field('category', 'Malware')
        .attach('file', Buffer.from('MZ...'), 'payload.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Unsupported file type');
    });

    it('rejects extension spoofing where a Windows PE executable (MZ header) is disguised as a log file', async () => {
      const mzPayload = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00]);
      const res = await request(app)
        .post(`/api/cases/${testCaseId}/evidence`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .field('title', 'Disguised Executable')
        .field('category', 'Malware Analysis')
        .attach('file', mzPayload, 'stealth.log');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Windows PE executable files');
    });

    it('rejects spoofed PDF file that lacks %PDF magic signature', async () => {
      const fakePdf = Buffer.from('Plain text claiming to be a PDF document.');
      const res = await request(app)
        .post(`/api/cases/${testCaseId}/evidence`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .field('title', 'Spoofed PDF Document')
        .field('category', 'Document')
        .attach('file', fakePdf, 'tampered_report.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain(
        'File claims to be .pdf but lacks the standard %PDF'
      );
    });

    it('rejects evidence upload without a file attached (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/cases/${testCaseId}/evidence`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .field('title', 'Fileless Request')
        .field('category', 'Logs');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('No evidence file provided');
    });
  });

  describe('Evidence Retrieval (GET /api/cases/:caseId/evidence & /api/evidence/:id)', () => {
    it('retrieves evidence list for the case', async () => {
      const res = await request(app)
        .get(`/api/cases/${testCaseId}/evidence`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].sha256Hash).toBe(expectedHash);
    });

    it('retrieves detailed evidence profile with custody chain history', async () => {
      const res = await request(app)
        .get(`/api/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(testEvidenceId);
      expect(res.body.data).toHaveProperty('custodyEvents');
      expect(res.body.data.custodyEvents.length).toBeGreaterThan(0);
      expect(res.body.data.custodyEvents[0].eventType).toBe(CustodyEventType.EVIDENCE_REGISTERED);
    });

    it('forbids unassigned investigator from accessing evidence details', async () => {
      const res = await request(app)
        .get(`/api/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${otherInvestigatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Secure Evidence Download (GET /api/evidence/:id/download)', () => {
    it('downloads the bit-identical evidence file and appends an EVIDENCE_DOWNLOADED custody event', async () => {
      const res = await request(app)
        .get(`/api/evidence/${testEvidenceId}/download`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe(testFileContent);
      expect(res.headers['content-disposition']).toContain('auth_audit.log');

      // Check that download was appended to the custody ledger
      const custodyEvents = await prisma.custodyEvent.findMany({
        where: { evidenceId: testEvidenceId },
        orderBy: { timestamp: 'asc' },
      });

      expect(custodyEvents.length).toBe(2);
      expect(custodyEvents[1].eventType).toBe(CustodyEventType.EVIDENCE_DOWNLOADED);
      expect(custodyEvents[1].previousEventHash).toBe(custodyEvents[0].currentEventHash);
    });

    it('allows ADMIN to download evidence as authorized supervisor', async () => {
      const res = await request(app)
        .get(`/api/evidence/${testEvidenceId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe(testFileContent);
    });

    it('forbids unassigned investigator from downloading evidence', async () => {
      const res = await request(app)
        .get(`/api/evidence/${testEvidenceId}/download`)
        .set('Authorization', `Bearer ${otherInvestigatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
