import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { rackCreateSchema } from '@/lib/validators';

export async function GET() {
  const racks = await prisma.rack.findMany({
    include: { _count: { select: { cages: true } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(racks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = rackCreateSchema.parse(body);
    const rack = await prisma.rack.create({ data });
    return NextResponse.json(rack, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
