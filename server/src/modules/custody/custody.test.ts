import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import { Role, CustodyEventType, EvidenceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Stage 4 — Chain of Custody & Hash Chain Verification Test Suite', () => {
  const app = createApp();

  let investigatorToken: string;
  let recipientInvestigatorToken: string;
  let recipientUserId: string;
  let testCaseId: string;
  let testEvidenceId: string;

  beforeAll(async () => {
    // Clean test database
    await prisma.custodyEvent.deleteMany({});
    await prisma.integrityVerification.deleteMany({});
    await prisma.evidence.deleteMany({});
    await prisma.caseAssignment.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash('CustodyChainPass123!', 10);

    const inv1 = await prisma.user.create({
      data: {
        email: 'custody_source@iccf.local',
        passwordHash,
        fullName: 'Detective Sarah Connor',
        role: Role.INVESTIGATOR,
      },
    });

    const inv2 = await prisma.user.create({
      data: {
        email: 'custody_target@iccf.local',
        passwordHash,
        fullName: 'Forensic Lab Analyst Miles Dyson',
        role: Role.INVESTIGATOR,
      },
    });
    recipientUserId = inv2.id;

    // Logins
    const login1 = await request(app)
      .post('/api/auth/login')
      .send({ email: inv1.email, password: 'CustodyChainPass123!' });
    investigatorToken = login1.body.data.token;

    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ email: inv2.email, password: 'CustodyChainPass123!' });
    recipientInvestigatorToken = login2.body.data.token;

    // Create case and assign both
    const caseRes = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({
        title: 'Chain of Custody Legal Test Case',
        description: 'Case establishing cryptographically validated evidence lifecycle.',
        category: 'Digital Forensics Transfer',
        assignedUserIds: [recipientUserId],
      });
    testCaseId = caseRes.body.data.id;

    // Ingest evidence file
    const uploadRes = await request(app)
      .post(`/api/cases/${testCaseId}/evidence`)
      .set('Authorization', `Bearer ${investigatorToken}`)
      .field('title', 'Network Packet Capture')
      .field('category', 'Network Capture')
      .attach('file', Buffer.from('PCAP_DUMP_DATA_PACKETS_TCP_STREAM'), 'capture.pcap');

    testEvidenceId = uploadRes.body.data.id;
  });

  describe('Custody Timeline (GET /api/evidence/:id/custody)', () => {
    it('returns the genesis custody event with valid 64-char zero genesis hash', async () => {
      const res = await request(app)
        .get(`/api/evidence/${testEvidenceId}/custody`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);

      const genesis = res.body.data[0];
      expect(genesis.eventType).toBe(CustodyEventType.EVIDENCE_REGISTERED);
      expect(genesis.previousEventHash).toBe(
        '0000000000000000000000000000000000000000000000000000000000000000'
      );
      expect(genesis.currentEventHash).toHaveLength(64);
    });
  });

  describe('Custody Transfer (POST /api/evidence/:id/transfer)', () => {
    it('rejects custody transfer without a mandatory legal reason', async () => {
      const res = await request(app)
        .post(`/api/evidence/${testEvidenceId}/transfer`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          newCustodianId: recipientUserId,
          reason: 'abc', // < 5 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('successfully transfers custody, links previous hash, and updates evidence status', async () => {
      const res = await request(app)
        .post(`/api/evidence/${testEvidenceId}/transfer`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          newCustodianId: recipientUserId,
          reason: 'Transferred to Forensics Lab for deep bitstream analysis and carver extraction',
          notes: 'Secure physical handoff inside shielded forensics lab',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe(CustodyEventType.EVIDENCE_TRANSFERRED);
      expect(res.body.data.newCustodianId).toBe(recipientUserId);

      // Verify chain connection
      const events = await prisma.custodyEvent.findMany({
        where: { evidenceId: testEvidenceId },
        orderBy: { timestamp: 'asc' },
      });

      expect(events.length).toBe(2);
      expect(events[1].previousEventHash).toBe(events[0].currentEventHash);

      // Verify evidence status was updated
      const evidence = await prisma.evidence.findUnique({
        where: { id: testEvidenceId },
      });
      expect(evidence!.status).toBe(EvidenceStatus.TRANSFERRED);
    });
  });

  describe('Cryptographic Chain Verification (POST /api/evidence/:id/custody/verify)', () => {
    it('validates that an unhampered hash chain passes verification with 100% integrity', async () => {
      const res = await request(app)
        .post(`/api/evidence/${testEvidenceId}/custody/verify`)
        .set('Authorization', `Bearer ${recipientInvestigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.totalEvents).toBe(2);
      expect(res.body.data.details).toContain('cryptographically linked');
    });

    it('detects a deliberately tampered historical event record and reports broken link', async () => {
      const events = await prisma.custodyEvent.findMany({
        where: { evidenceId: testEvidenceId },
        orderBy: { timestamp: 'asc' },
      });

      const genesisEvent = events[0];

      // TAMPER SIMULATION: An adversary modifies historical row in DB (e.g. alters reason)
      await prisma.custodyEvent.update({
        where: { id: genesisEvent.id },
        data: {
          reason: 'MALICIOUS_UNAUTHORIZED_RECORD_MODIFICATION',
        },
      });

      // Run chain verification
      const verifyRes = await request(app)
        .post(`/api/evidence/${testEvidenceId}/custody/verify`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(false);
      expect(verifyRes.body.data.tamperedEventId).toBe(genesisEvent.id);
      expect(verifyRes.body.data.details).toContain('Tampered event detected');

      // Revert tamper simulation for clean DB state
      await prisma.custodyEvent.update({
        where: { id: genesisEvent.id },
        data: {
          reason: 'Initial evidence ingestion and registration into ICCF vault',
        },
      });
    });
  });

  describe('Immutability: Prevention of Normal Custody Deletion APIs', () => {
    it('confirms no HTTP DELETE endpoint exists to delete custody events (404 Not Found)', async () => {
      const res = await request(app)
        .delete(`/api/evidence/${testEvidenceId}/custody`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(404);
    });
  });
});
