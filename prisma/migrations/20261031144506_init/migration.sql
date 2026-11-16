-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INVESTIGATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'PENDING_REVIEW', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('REGISTERED', 'IN_CUSTODY', 'TRANSFERRED', 'RELEASED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'MISMATCH', 'ERROR', 'NOT_VERIFIED');

-- CreateEnum
CREATE TYPE "CustodyEventType" AS ENUM ('EVIDENCE_REGISTERED', 'EVIDENCE_ACCESSED', 'EVIDENCE_TRANSFERRED', 'EVIDENCE_VERIFIED', 'EVIDENCE_DOWNLOADED', 'EVIDENCE_STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'INVESTIGATOR',
    "badgeNumber" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseReference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "CasePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAssignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storageReference" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'REGISTERED',
    "latestVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustodyEvent" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" "CustodyEventType" NOT NULL,
    "previousCustodianId" TEXT,
    "newCustodianId" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "previousEventHash" TEXT NOT NULL,
    "currentEventHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustodyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityVerification" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "originalHash" TEXT NOT NULL,
    "calculatedHash" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseReference_key" ON "Case"("caseReference");

-- CreateIndex
CREATE INDEX "Case_caseReference_idx" ON "Case"("caseReference");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_priority_idx" ON "Case"("priority");

-- CreateIndex
CREATE INDEX "CaseAssignment_caseId_idx" ON "CaseAssignment"("caseId");

-- CreateIndex
CREATE INDEX "CaseAssignment_userId_idx" ON "CaseAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseAssignment_caseId_userId_key" ON "CaseAssignment"("caseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_evidenceReference_key" ON "Evidence"("evidenceReference");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_storageReference_key" ON "Evidence"("storageReference");

-- CreateIndex
CREATE INDEX "Evidence_evidenceReference_idx" ON "Evidence"("evidenceReference");

-- CreateIndex
CREATE INDEX "Evidence_caseId_idx" ON "Evidence"("caseId");

-- CreateIndex
CREATE INDEX "Evidence_sha256Hash_idx" ON "Evidence"("sha256Hash");

-- CreateIndex
CREATE INDEX "Evidence_status_idx" ON "Evidence"("status");

-- CreateIndex
CREATE INDEX "CustodyEvent_evidenceId_idx" ON "CustodyEvent"("evidenceId");

-- CreateIndex
CREATE INDEX "CustodyEvent_actorId_idx" ON "CustodyEvent"("actorId");

-- CreateIndex
CREATE INDEX "CustodyEvent_timestamp_idx" ON "CustodyEvent"("timestamp");

-- CreateIndex
CREATE INDEX "CustodyEvent_currentEventHash_idx" ON "CustodyEvent"("currentEventHash");

-- CreateIndex
CREATE INDEX "IntegrityVerification_evidenceId_idx" ON "IntegrityVerification"("evidenceId");

-- CreateIndex
CREATE INDEX "IntegrityVerification_timestamp_idx" ON "IntegrityVerification"("timestamp");

-- CreateIndex
CREATE INDEX "IntegrityVerification_status_idx" ON "IntegrityVerification"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAssignment" ADD CONSTRAINT "CaseAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyEvent" ADD CONSTRAINT "CustodyEvent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyEvent" ADD CONSTRAINT "CustodyEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyEvent" ADD CONSTRAINT "CustodyEvent_previousCustodianId_fkey" FOREIGN KEY ("previousCustodianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustodyEvent" ADD CONSTRAINT "CustodyEvent_newCustodianId_fkey" FOREIGN KEY ("newCustodianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityVerification" ADD CONSTRAINT "IntegrityVerification_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityVerification" ADD CONSTRAINT "IntegrityVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
