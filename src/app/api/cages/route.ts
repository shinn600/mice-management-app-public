import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cageCreateSchema } from '@/lib/validators';

export async function GET() {
  const cages = await prisma.cage.findMany({
    include: { rack: true, _count: { select: { mice: true } } },
    orderBy: { cageCode: 'asc' },
  });
  return NextResponse.json(cages);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = cageCreateSchema.parse(body);
    const cage = await prisma.cage.create({ data });
    return NextResponse.json(cage, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
