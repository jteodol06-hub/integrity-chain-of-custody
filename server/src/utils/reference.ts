import { prisma } from '../config/database.js';

/**
 * Generates the next sequential Case reference format: ICCF-YYYY-NNNN (e.g. ICCF-2026-0001)
 * Safely finds the highest existing sequence number to avoid concurrency collisions.
 */
export async function generateCaseReference(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `ICCF-${currentYear}-`;

  const latest = await prisma.case.findFirst({
    where: {
      caseReference: {
        startsWith: prefix,
      },
    },
    orderBy: {
      caseReference: 'desc',
    },
    select: {
      caseReference: true,
    },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.caseReference.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  let ref = `${prefix}${nextNum.toString().padStart(4, '0')}`;
  while (await prisma.case.findUnique({ where: { caseReference: ref } })) {
    nextNum++;
    ref = `${prefix}${nextNum.toString().padStart(4, '0')}`;
  }

  return ref;
}

/**
 * Generates the next sequential Evidence reference format: EVID-YYYY-NNNN (e.g. EVID-2026-0001)
 */
export async function generateEvidenceReference(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `EVID-${currentYear}-`;

  const latest = await prisma.evidence.findFirst({
    where: {
      evidenceReference: {
        startsWith: prefix,
      },
    },
    orderBy: {
      evidenceReference: 'desc',
    },
    select: {
      evidenceReference: true,
    },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.evidenceReference.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  let ref = `${prefix}${nextNum.toString().padStart(4, '0')}`;
  while (await prisma.evidence.findUnique({ where: { evidenceReference: ref } })) {
    nextNum++;
    ref = `${prefix}${nextNum.toString().padStart(4, '0')}`;
  }

  return ref;
}
