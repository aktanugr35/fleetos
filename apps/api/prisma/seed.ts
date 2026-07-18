import { PrismaClient, UserRole, DriverType, PayStructure } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function seedLog(message: string) {
  if (process.env.SEED_VERBOSE === 'true') {
    console.log(message);
  }
}

async function main() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    console.error('Demo seed is disabled in staging/production.');
    process.exit(1);
  }

  if (process.env.SEED_DEMO !== 'true') {
    console.log('Demo seed skipped (set SEED_DEMO=true to load sample data).');
    return;
  }

  console.log('Seeding Haulyard demo database...');

  const company = await prisma.company.upsert({
    where: { dotNumber: '1234567' },
    update: {},
    create: {
      name: 'Valley Transportation LLC',
      slug: 'valley-transportation',
      dotNumber: '1234567',
      mcNumber: 'MC-987654',
      address: '1234 Main Street, Dallas, TX 75201',
      phone: '+1 (214) 555-0100',
      email: 'info@valleytrans.com',
      defaultOOCommissionRate: 1200,
    },
  });
  seedLog(`Company: ${company.name}`);

  const passwordHash = await bcrypt.hash('Admin123!', 12);

  await prisma.user.upsert({
    where: { email: 'super@haulyard.app' },
    update: {},
    create: {
      email: 'super@haulyard.app',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      companyId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@valleytrans.com' },
    update: {},
    create: {
      email: 'admin@valleytrans.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Valley',
      role: UserRole.COMPANY_ADMIN,
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'dispatch@valleytrans.com' },
    update: {},
    create: {
      email: 'dispatch@valleytrans.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.DISPATCHER,
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'accounting@valleytrans.com' },
    update: {},
    create: {
      email: 'accounting@valleytrans.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Davis',
      role: UserRole.ACCOUNTING,
      companyId: company.id,
    },
  });

  const driver1 = await prisma.driver.upsert({
    where: { id: 'seed-driver-1' },
    update: {},
    create: {
      id: 'seed-driver-1',
      companyId: company.id,
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      phone: '+1 (214) 555-0201',
      email: 'carlos@valleytrans.com',
      driverType: DriverType.OWNER_OPERATOR,
      payStructure: PayStructure.PERCENTAGE,
      payRate: 8800,
      cdlNumber: 'CDL-TX-12345678',
      cdlState: 'TX',
      cdlExpiryDate: new Date('2027-06-15'),
      medicalCardExpiry: new Date('2027-03-20'),
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { id: 'seed-driver-2' },
    update: {},
    create: {
      id: 'seed-driver-2',
      companyId: company.id,
      firstName: 'James',
      lastName: 'Wilson',
      phone: '+1 (214) 555-0202',
      email: 'james@valleytrans.com',
      driverType: DriverType.COMPANY_DRIVER,
      payStructure: PayStructure.PER_MILE,
      payRate: 60,
      cdlNumber: 'CDL-TX-87654321',
      cdlState: 'TX',
      cdlExpiryDate: new Date('2026-12-01'),
      medicalCardExpiry: new Date('2026-08-15'),
    },
  });

  await prisma.truck.upsert({
    where: { vin: '1XPWD49X1GD123456' },
    update: {},
    create: {
      companyId: company.id,
      ownerDriverId: driver1.id,
      unitNumber: 'T-101',
      make: 'Peterbilt',
      model: '579',
      year: 2022,
      vin: '1XPWD49X1GD123456',
      licensePlate: 'TX-AB1234',
      plateState: 'TX',
      dotInspectionExpiry: new Date('2026-09-30'),
      irpExpiry: new Date('2026-12-31'),
      hvutExpiry: new Date('2027-06-30'),
      insuranceExpiry: new Date('2027-01-15'),
    },
  });

  await prisma.truck.upsert({
    where: { vin: '3AKJHHDR5GSAB7890' },
    update: {},
    create: {
      companyId: company.id,
      unitNumber: 'T-102',
      make: 'Kenworth',
      model: 'T680',
      year: 2023,
      vin: '3AKJHHDR5GSAB7890',
      licensePlate: 'TX-CD5678',
      plateState: 'TX',
      dotInspectionExpiry: new Date('2026-07-15'),
      irpExpiry: new Date('2026-12-31'),
      hvutExpiry: new Date('2027-06-30'),
      insuranceExpiry: new Date('2027-02-28'),
    },
  });

  await prisma.trailer.upsert({
    where: { vin: 'TRAIL1234567890AB' },
    update: {},
    create: {
      companyId: company.id,
      unitNumber: 'TR-201',
      make: 'Great Dane',
      model: 'Champion',
      year: 2021,
      vin: 'TRAIL1234567890AB',
      licensePlate: 'TX-TR0001',
      plateState: 'TX',
      dotInspectionExpiry: new Date('2026-10-15'),
      irpExpiry: new Date('2026-12-31'),
    },
  });

  seedLog(`Drivers: ${driver1.lastName}, ${driver2.lastName}`);
  console.log('Demo seed complete. See README for demo login (development only).');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
