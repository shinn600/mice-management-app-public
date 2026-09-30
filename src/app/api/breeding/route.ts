import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { matingPairCreateSchema } from '@/lib/validators';
import { auth } from '@/auth';
import { getAllowedStrainIds, canAccessMouse } from '@/lib/strain-access';

export async function GET() {
  const allowedIds = await getAllowedStrainIds();
  const strainFilter = allowedIds === null ? {} : { strainId: { in: allowedIds } };
  const pairs = await prisma.matingPair.findMany({
    where: {
      male: { ...strainFilter },
    },
    include: {
      male: { include: { strain: true, substrain: true } },
      female: { include: { strain: true, substrain: true } },
      cage: true,
      _count: { select: { plugChecks: true, litters: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(pairs);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const createdBy = (session?.user as any)?.name ?? null;
    const body = await request.json();
    const data = matingPairCreateSchema.parse(body);
    if (!(await canAccessMouse(data.maleId)) || !(await canAccessMouse(data.femaleId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const pair = await prisma.matingPair.create({
      data: {
        maleId: data.maleId,
        femaleId: data.femaleId,
        startDate: new Date(data.startDate),
        cageId: data.cageId,
        note: data.note,
        createdBy,
      },
    });

    // Sync cage to individual mice when cage is specified
    if (data.cageId) {
      await prisma.mouse.updateMany({
        where: { id: { in: [data.maleId, data.femaleId] } },
        data: { cageId: data.cageId },
      });
    }

    return NextResponse.json(pair, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
