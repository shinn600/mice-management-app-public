import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAllowedStrainIds } from '@/lib/strain-access';

export async function GET() {
  const allowedIds = await getAllowedStrainIds();
  const strainWhere = allowedIds === null ? {} : { id: { in: allowedIds } };
  const mouseWhere = allowedIds === null ? {} : { strainId: { in: allowedIds } };

  const [
    totalMice,
    aliveMice,
    totalStrains,
    activePairs,
    totalCages,
    recentMice,
    strainCounts,
    approvals,
  ] = await Promise.all([
    prisma.mouse.count({ where: mouseWhere }),
    prisma.mouse.count({ where: { status: 'alive', ...mouseWhere } }),
    prisma.strain.count({ where: strainWhere }),
    prisma.matingPair.count({ where: { isActive: true, male: { ...mouseWhere } } }),
    prisma.cage.count(),
    prisma.mouse.findMany({
      where: mouseWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { strain: true },
    }),
    prisma.strain.findMany({
      where: strainWhere,
      include: { _count: { select: { mice: { where: { status: 'alive' } } } } },
    }),
    prisma.experimentApproval.findMany({
      include: { _count: { select: { usages: true } } },
    }),
  ]);

  const complianceAlerts = approvals
    .filter(a => {
      const ratio = a._count.usages / a.allowedCount;
      return ratio >= 0.8;
    })
    .map(a => ({
      id: a.id,
      approvalNumber: a.approvalNumber,
      title: a.title,
      used: a._count.usages,
      allowed: a.allowedCount,
      ratio: a._count.usages / a.allowedCount,
    }));

  // Find cages that are at or over capacity
  const cagesOverCapacity = await prisma.cage.findMany({
    include: { _count: { select: { mice: true } } },
  });
  const cageAlerts = cagesOverCapacity
    .filter(c => c._count.mice >= c.maxCapacity)
    .map(c => ({ id: c.id, cageCode: c.cageCode, current: c._count.mice, max: c.maxCapacity }));

  // Find litters that need weaning (birthDate + 21 days <= today and weaningDate is null)
  const today = new Date();
  const weaningThreshold = new Date(today);
  weaningThreshold.setDate(weaningThreshold.getDate() - 21);
  const littersNeedWeaning = await prisma.litter.findMany({
    where: {
      weaningDate: null,
      birthDate: { lte: weaningThreshold },
    },
    include: { matingPair: { include: { male: { include: { strain: true } } } } },
  });

  return NextResponse.json({
    stats: { totalMice, aliveMice, totalStrains, activePairs, totalCages },
    recentMice,
    strainCounts: strainCounts.map(s => ({ name: s.name, color: s.color, count: s._count.mice })),
    complianceAlerts,
    cageAlerts,
    weaningAlerts: littersNeedWeaning,
  });
}
