import { Role, CaseStatus, VerificationStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AuthenticatedUser } from '../../middleware/auth.middleware.js';

export class DashboardService {
  /**
   * Retrieves summary KPI statistics for the dashboard.
   */
  static async getSummary(user: AuthenticatedUser) {
    const caseWhere =
      user.role === Role.ADMIN
        ? {}
        : {
            OR: [{ createdById: user.id }, { assignments: { some: { userId: user.id } } }],
          };

    const evidenceWhere =
      user.role === Role.ADMIN
        ? {}
        : {
            case: caseWhere,
          };

    const [
      totalCases,
      openCases,
      investigatingCases,
      closedCases,
      totalEvidence,
      verifiedEvidence,
      mismatchEvidence,
      pendingEvidence,
    ] = await Promise.all([
      prisma.case.count({ where: caseWhere }),
      prisma.case.count({ where: { ...caseWhere, status: CaseStatus.OPEN } }),
      prisma.case.count({ where: { ...caseWhere, status: CaseStatus.UNDER_INVESTIGATION } }),
      prisma.case.count({ where: { ...caseWhere, status: CaseStatus.CLOSED } }),
      prisma.evidence.count({ where: evidenceWhere }),
      prisma.evidence.count({
        where: { ...evidenceWhere, latestVerificationStatus: VerificationStatus.VERIFIED },
      }),
      prisma.evidence.count({
        where: { ...evidenceWhere, latestVerificationStatus: VerificationStatus.MISMATCH },
      }),
      prisma.evidence.count({
        where: { ...evidenceWhere, latestVerificationStatus: VerificationStatus.NOT_VERIFIED },
      }),
    ]);

    const verificationRate =
      totalEvidence > 0 ? Math.round((verifiedEvidence / totalEvidence) * 100) : 100;

    return {
      cases: {
        total: totalCases,
        open: openCases + investigatingCases,
        closed: closedCases,
      },
      evidence: {
        total: totalEvidence,
        verified: verifiedEvidence,
        mismatch: mismatchEvidence,
        pending: pendingEvidence,
        verificationRate,
      },
    };
  }

  /**
   * Retrieves activity charts data and recent activities list.
   */
  static async getActivity(user: AuthenticatedUser) {
    const caseWhere =
      user.role === Role.ADMIN
        ? {}
        : {
            OR: [{ createdById: user.id }, { assignments: { some: { userId: user.id } } }],
          };

    // 1. Fetch recent cases
    const recentCases = await prisma.case.findMany({
      where: caseWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        caseReference: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    });

    // 2. Fetch recent custody events
    const recentCustody = await prisma.custodyEvent.findMany({
      where: user.role === Role.ADMIN ? {} : { evidence: { case: caseWhere } },
      take: 6,
      orderBy: { timestamp: 'desc' },
      include: {
        evidence: {
          select: {
            id: true,
            evidenceReference: true,
            title: true,
          },
        },
        actor: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    // 3. Build daily trend for the last 14 days
    const daysTrend = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysTrend.push({
        date: dayStr,
        cases: 0,
        evidence: 0,
      });
    }

    return {
      recentCases,
      recentCustody,
      activityTrend: daysTrend,
    };
  }
}
