import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { Role, VerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Stage 4 — Cryptographic Integrity Verification Test Suite', () => {
  const app = createApp();

  let investigatorToken: string;
  let viewerToken: string;
  let testCaseId: string;
  let testEvidenceId: string;
  let storageDiskReference: string;

  const originalContent = 'CONFIDENTIAL EVIDENCE DUMP: 2026-11-10 host=10.0.0.1 user=victim';

  beforeAll(async () => {
    // Clear test database
    await prisma.custodyEvent.deleteMany({});
    await prisma.integrityVerification.deleteMany({});
    await prisma.evidence.deleteMany({});
    await prisma.caseAssignment.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash('CryptoPass2026!', 10);

    const investigator = await prisma.user.create({
      data: {
        email: 'crypto_examiner@iccf.local',
        passwordHash,
        fullName: 'Dr. Jane Forensics',
        role: Role.INVESTIGATOR,
      },
    });

    const viewer = await prisma.user.create({
      data: {
        email: 'crypto_viewer@iccf.local',
        passwordHash,
        fullName: 'Observing Legal Counsel',
        role: Role.VIEWER,
      },
    });

    // Obtain tokens
    const invRes = await request(app)
      .post('/api/auth/login')
      .send({ email: investigator.email, password: 'CryptoPass2026!' });
    investigatorToken = invRes.body.data.token;

    const viewRes = await request(app)
      .post('/api/auth/login')
      .send({ email: viewer.email, password: 'CryptoPass2026!' });
    viewerToken = viewRes.body.data.token;

    // Create case
    const caseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        title: 'Cryptographic Hashing Verification Incident',
        description: 'Case to verify bit-level forensic integrity detection.',
        category: 'Evidence Tamper Check',
      });
    testCaseId = caseRes.body.data.id;

    // Ingest evidence file
    const uploadRes = await request(app)
      .post(`/api/cases/${testCaseId}/evidence`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .field('title', 'Memory Artifact')
      .field('category', 'Memory Dump')
      .attach('file', Buffer.from(originalContent), 'artifact.raw');

    testEvidenceId = uploadRes.body.data.id;

    // Fetch storage reference directly from DB for the tamper simulation test
    const dbRecord = await prisma.evidence.findUnique({
      where: { id: testEvidenceId },
    });
    storageDiskReference = dbRecord!.storageReference;
  });

  describe('Verification of Unaltered File', () => {
    it('successfully confirms file integrity with genuine SHA-256 match', async () => {
      const res = await request(app)
        .post(`/api/evidence/${testEvidenceId}/verify`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({ notes: 'Routine intake verification audit' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(VerificationStatus.VERIFIED);
      expect(res.body.data.isMatch).toBe(true);
      expect(res.body.data.calculatedHash).toBe(res.body.data.originalHash);

      // Verify DB record
      const dbEvidence = await prisma.evidence.findUnique({
        where: { id: testEvidenceId },
      });
      expect(dbEvidence!.latestVerificationStatus).toBe(VerificationStatus.VERIFIED);
    });

    it('rejects verification attempt by VIEWER (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/evidence/${testEvidenceId}/verify`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Detection of Altered File (Cryptographic Mismatch)', () => {
    it('detects bit-level alteration on disk, flags MISMATCH, and preserves original baseline hash', async () => {
      const storageDir = path.resolve(process.cwd(), env.EVIDENCE_STORAGE_PATH);
      const filePath = path.join(storageDir, storageDiskReference);

      // Read current original baseline hash
      const beforeEvidence = await prisma.evidence.findUnique({
        where: { id: testEvidenceId },
      });
      const baselineHash = beforeEvidence!.sha256Hash;

      // DELIBERATELY ALTER 1 BYTE on disk to simulate bit rot / tampering
      fs.writeFileSync(filePath, originalContent + ' [TAMPERED_MALICIOUS_BYTES]');

      // Run verification
      const verifyRes = await request(app)
        .post(`/api/evidence/${testEvidenceId}/verify`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({ notes: 'Forensic integrity check after custody transfer' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe(VerificationStatus.MISMATCH);
      expect(verifyRes.body.data.isMatch).toBe(false);
      expect(verifyRes.body.data.calculatedHash).not.toBe(baselineHash);

      // CRITICAL FORENSIC REQUIREMENT: The registered original hash MUST NEVER be altered!
      const afterEvidence = await prisma.evidence.findUnique({
        where: { id: testEvidenceId },
      });
      expect(afterEvidence!.sha256Hash).toBe(baselineHash);
      expect(afterEvidence!.latestVerificationStatus).toBe(VerificationStatus.MISMATCH);

      // Restore original content for subsequent tests
      fs.writeFileSync(filePath, originalContent);
    });
  });

  describe('Integrity Verification History (GET /api/evidence/:id/verifications)', () => {
    it('returns chronological audit history of all verification attempts', async () => {
      const res = await request(app)
        .get(`/api/evidence/${testEvidenceId}/verifications`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2); // One VERIFIED, one MISMATCH
      expect(res.body.data[0]).toHaveProperty('verifiedBy');
    });
  });
});
