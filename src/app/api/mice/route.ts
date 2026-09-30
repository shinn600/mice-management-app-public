import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { mouseCreateSchema } from '@/lib/validators';
import { pcrResultToGenotype } from '@/lib/genotype';
import { auth } from '@/auth';
import { getAllowedStrainIds, canAccessStrain } from '@/lib/strain-access';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const strainId = searchParams.get('strainId');
  const substrainId = searchParams.get('substrainId');
  const sex = searchParams.get('sex');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const allowedIds = await getAllowedStrainIds();
  const where: any = {};
  if (allowedIds !== null) where.strainId = { in: allowedIds };
  if (strainId) where.strainId = Number(strainId);
  if (substrainId) where.substrainId = Number(substrainId);
  if (sex) where.sex = sex;
  if (status) where.status = status;
  if (search) where.mouseCode = { contains: search };

  if (searchParams.get('countOnly') === '1') {
    const count = await prisma.mouse.count({ where });
    return NextResponse.json({ count });
  }

  const mice = await prisma.mouse.findMany({
    where,
    include: {
      strain: true,
      substrain: true,
      cage: true,
      genotypingRecords: true,
      father: true,
      mother: true,
    },
    orderBy: { mouseCode: 'desc' },
  });
  return NextResponse.json(mice);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const createdBy = (session?.user as any)?.name ?? null;
    const body = await request.json();
    const data = mouseCreateSchema.parse(body);
    if (data.strainId && !(await canAccessStrain(Number(data.strainId)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const mouse = await prisma.mouse.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        createdBy,
      },
    });
    return NextResponse.json(mouse, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
