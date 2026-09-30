import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessMatingPair } from '@/lib/strain-access';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; litterId: string }> }
) {
  const { id, litterId } = await params;
  if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const litter = await prisma.litter.update({
    where: { id: Number(litterId) },
    data: {
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      pupCount: body.pupCount ? Number(body.pupCount) : undefined,
      note: body.note ?? null,
    },
  });
  return NextResponse.json(litter);
}
