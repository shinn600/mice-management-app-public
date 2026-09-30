import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dev.db');
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Racks
  const rack1 = await prisma.rack.create({ data: { name: 'Rack-A', location: '飼育室1' } });
  const rack2 = await prisma.rack.create({ data: { name: 'Rack-B', location: '飼育室2' } });

  // Cages
  const cage1 = await prisma.cage.create({ data: { cageCode: 'C-001', maxCapacity: 5, rackId: rack1.id } });
  const cage2 = await prisma.cage.create({ data: { cageCode: 'C-002', maxCapacity: 5, rackId: rack1.id } });
  const cage3 = await prisma.cage.create({ data: { cageCode: 'C-003', maxCapacity: 5, rackId: rack2.id } });
  const cage4 = await prisma.cage.create({ data: { cageCode: 'C-004', maxCapacity: 3, rackId: rack2.id } });

  // Strains
  const strain1 = await prisma.strain.create({ data: { name: 'C57BL/6JmsSlc', geneticBackground: 'C57BL/6', modificationType: null, color: '#4F46E5' } });
  const strain2 = await prisma.strain.create({ data: { name: 'BALB/c', geneticBackground: 'BALB/c', modificationType: null, color: '#059669' } });
  const strain3 = await prisma.strain.create({ data: { name: 'App-KI', geneticBackground: 'C57BL/6', modificationType: 'Knock-in', color: '#DC2626' } });

  // Mice
  const m1 = await prisma.mouse.create({ data: { mouseCode: 'C57BL6J-0001', sex: 'M', birthDate: new Date('2025-06-01'), strainId: strain1.id, cageId: cage1.id, status: 'alive' } });
  const m2 = await prisma.mouse.create({ data: { mouseCode: 'C57BL6J-0002', sex: 'F', birthDate: new Date('2025-06-05'), strainId: strain1.id, cageId: cage2.id, status: 'alive' } });
  const m3 = await prisma.mouse.create({ data: { mouseCode: 'C57BL6J-0003', sex: 'M', birthDate: new Date('2025-07-01'), strainId: strain1.id, cageId: cage1.id, status: 'alive' } });
  const m4 = await prisma.mouse.create({ data: { mouseCode: 'BALB-0001', sex: 'F', birthDate: new Date('2025-05-15'), strainId: strain2.id, cageId: cage3.id, status: 'alive' } });
  const m5 = await prisma.mouse.create({ data: { mouseCode: 'AppKI-0001', sex: 'M', birthDate: new Date('2025-04-20'), strainId: strain3.id, cageId: cage3.id, status: 'alive' } });
  const m6 = await prisma.mouse.create({ data: { mouseCode: 'AppKI-0002', sex: 'F', birthDate: new Date('2025-04-22'), strainId: strain3.id, cageId: cage4.id, status: 'alive' } });
  const m7 = await prisma.mouse.create({ data: { mouseCode: 'C57BL6J-0004', sex: 'M', birthDate: new Date('2025-08-10'), strainId: strain1.id, fatherId: m1.id, motherId: m2.id, cageId: cage1.id, status: 'alive' } });
  const m8 = await prisma.mouse.create({ data: { mouseCode: 'C57BL6J-0005', sex: 'F', birthDate: new Date('2025-08-10'), strainId: strain1.id, fatherId: m1.id, motherId: m2.id, cageId: cage2.id, status: 'alive' } });

  // Genotyping records
  await prisma.genotypingRecord.create({ data: { mouseId: m5.id, targetGene: 'App', pcrResult: 'wt/mut', genotypeLabel: 'wt/mut', testedDate: new Date('2025-05-10') } });
  await prisma.genotypingRecord.create({ data: { mouseId: m6.id, targetGene: 'App', pcrResult: 'wt/wt', genotypeLabel: 'wt/wt', testedDate: new Date('2025-05-10') } });
  await prisma.genotypingRecord.create({ data: { mouseId: m7.id, targetGene: 'Brca1', pcrResult: 'mut/mut', genotypeLabel: 'mut/mut', testedDate: new Date('2025-09-01') } });

  // Mating pair
  const pair1 = await prisma.matingPair.create({ data: { maleId: m1.id, femaleId: m2.id, startDate: new Date('2025-07-15'), cageId: cage2.id, isActive: false, endDate: new Date('2025-09-01') } });
  const pair2 = await prisma.matingPair.create({ data: { maleId: m5.id, femaleId: m6.id, startDate: new Date('2025-10-01'), cageId: cage4.id, isActive: true } });

  // Plug checks
  await prisma.plugCheck.create({ data: { matingPairId: pair1.id, checkDate: new Date('2025-07-18'), plugFound: true } });
  await prisma.plugCheck.create({ data: { matingPairId: pair2.id, checkDate: new Date('2025-10-05'), plugFound: false } });
  await prisma.plugCheck.create({ data: { matingPairId: pair2.id, checkDate: new Date('2025-10-08'), plugFound: true } });

  // Litter
  await prisma.litter.create({ data: { matingPairId: pair1.id, birthDate: new Date('2025-08-10'), pupCount: 6, weaningDate: new Date('2025-08-31') } });

  // Experiment approval
  const approval1 = await prisma.experimentApproval.create({ data: { approvalNumber: 'EXP-2025-001', title: '学習記憶実験', allowedCount: 10, startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') } });
  const approval2 = await prisma.experimentApproval.create({ data: { approvalNumber: 'EXP-2025-002', title: '薬理試験', allowedCount: 5, startDate: new Date('2025-06-01'), endDate: new Date('2025-12-31') } });

  // Compliance usage
  await prisma.complianceUsage.create({ data: { experimentApprovalId: approval1.id, mouseId: m5.id, usageDate: new Date('2025-06-15'), purpose: '行動試験' } });
  await prisma.complianceUsage.create({ data: { experimentApprovalId: approval1.id, mouseId: m6.id, usageDate: new Date('2025-06-20'), purpose: '行動試験' } });
  await prisma.complianceUsage.create({ data: { experimentApprovalId: approval2.id, mouseId: m3.id, usageDate: new Date('2025-07-10'), purpose: '投薬テスト' } });
  await prisma.complianceUsage.create({ data: { experimentApprovalId: approval2.id, mouseId: m4.id, usageDate: new Date('2025-07-10'), purpose: '投薬テスト' } });
  await prisma.complianceUsage.create({ data: { experimentApprovalId: approval2.id, mouseId: m7.id, usageDate: new Date('2025-09-15'), purpose: '投薬テスト' } });
  await prisma.complianceUsage.create({ data: { experimentApprovalId: approval2.id, mouseId: m8.id, usageDate: new Date('2025-09-15'), purpose: '投薬テスト' } });

  console.log('Seed data created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
