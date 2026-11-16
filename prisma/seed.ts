// ==============================================================================
// INTEGRITY & CHAIN-OF-CUSTODY FOCUSED (ICCF) - SYNTHETIC DATABASE SEED SCRIPT
// ==============================================================================

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding synthetic demo records for ICCF development...');

  // Password for demonstration/development: ForensicAdmin2026!
  const passwordHash = await bcrypt.hash('ForensicAdmin2026!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@iccf.local' },
    update: {},
    create: {
      email: 'admin@iccf.local',
      passwordHash,
      fullName: 'Chief Forensics Admin',
      role: Role.ADMIN,
      badgeNumber: 'ICCF-001',
      department: 'Cyber Forensics Unit',
    },
  });

  const investigator = await prisma.user.upsert({
    where: { email: 'investigator@iccf.local' },
    update: {},
    create: {
      email: 'investigator@iccf.local',
      passwordHash,
      fullName: 'Lead Investigator Sarah Vance',
      role: Role.INVESTIGATOR,
      badgeNumber: 'ICCF-104',
      department: 'Digital Incident Response',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@iccf.local' },
    update: {},
    create: {
      email: 'viewer@iccf.local',
      passwordHash,
      fullName: 'Legal Officer Marcus Chen',
      role: Role.VIEWER,
      badgeNumber: 'ICCF-902',
      department: 'Compliance & Legal Oversight',
    },
  });

  console.log('Seeded baseline users:', {
    admin: admin.email,
    investigator: investigator.email,
    viewer: viewer.email,
  });
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
