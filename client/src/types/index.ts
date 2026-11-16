export type UserRole = 'ADMIN' | 'INVESTIGATOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  badgeNumber?: string | null;
  department?: string | null;
  isActive?: boolean;
  createdAt: string;
}

export type CaseStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'PENDING_REVIEW' | 'CLOSED' | 'ARCHIVED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CaseAssignment {
  id: string;
  caseId: string;
  userId: string;
  assignedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    badgeNumber?: string | null;
  };
}

export interface Case {
  id: string;
  caseReference: string;
  title: string;
  description: string;
  category: string;
  priority: CasePriority;
  status: CaseStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    badgeNumber?: string | null;
  };
  assignments?: CaseAssignment[];
  evidenceItems?: Evidence[];
  _count?: {
    evidenceItems: number;
  };
}

export type EvidenceStatus = 'REGISTERED' | 'IN_CUSTODY' | 'TRANSFERRED' | 'RELEASED' | 'ARCHIVED';
export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'ERROR' | 'NOT_VERIFIED';

export type CustodyEventType =
  | 'EVIDENCE_REGISTERED'
  | 'EVIDENCE_ACCESSED'
  | 'EVIDENCE_TRANSFERRED'
  | 'EVIDENCE_VERIFIED'
  | 'EVIDENCE_DOWNLOADED'
  | 'EVIDENCE_STATUS_CHANGED';

export interface CustodyEvent {
  id: string;
  evidenceId: string;
  actorId: string;
  eventType: CustodyEventType;
  previousCustodianId?: string | null;
  newCustodianId?: string | null;
  reason: string;
  notes?: string | null;
  previousEventHash: string;
  currentEventHash: string;
  timestamp: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    badgeNumber?: string | null;
  };
  previousCustodian?: {
    id: string;
    fullName: string;
    badgeNumber?: string | null;
  } | null;
  newCustodian?: {
    id: string;
    fullName: string;
    badgeNumber?: string | null;
  } | null;
}

export interface IntegrityVerification {
  id: string;
  evidenceId: string;
  verifiedById: string;
  originalHash: string;
  calculatedHash: string;
  status: VerificationStatus;
  notes?: string | null;
  timestamp: string;
  verifiedBy?: {
    id: string;
    fullName: string;
    badgeNumber?: string | null;
    email: string;
  };
}

export interface Evidence {
  id: string;
  caseId: string;
  evidenceReference: string;
  title: string;
  description?: string | null;
  category: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  status: EvidenceStatus;
  latestVerificationStatus: VerificationStatus;
  uploadedById: string;
  uploadedAt: string;
  updatedAt?: string;
  case?: {
    id: string;
    caseReference: string;
    title: string;
    status: CaseStatus;
  };
  uploadedBy?: {
    id: string;
    fullName: string;
    email: string;
    badgeNumber?: string | null;
    department?: string | null;
  };
  custodyEvents?: CustodyEvent[];
  verifications?: IntegrityVerification[];
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    badgeNumber?: string | null;
  } | null;
}

export interface DashboardSummary {
  cases: {
    total: number;
    open: number;
    closed: number;
  };
  evidence: {
    total: number;
    verified: number;
    mismatch: number;
    pending: number;
    verificationRate: number;
  };
}

export interface DashboardActivity {
  recentCases: Case[];
  recentCustody: (CustodyEvent & {
    evidence: { id: string; evidenceReference: string; title: string };
  })[];
  activityTrend: { date: string; cases: number; evidence: number }[];
}
