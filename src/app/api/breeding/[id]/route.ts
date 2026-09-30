import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessMatingPair } from '@/lib/strain-access';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const pair = await prisma.matingPair.findUnique({
    where: { id: Number(id) },
    include: {
      male: { include: { strain: true, substrain: true } },
      female: { include: { strain: true, substrain: true } },
      cage: true,
      plugChecks: { orderBy: { checkDate: 'desc' } },
      litters: { orderBy: { birthDate: 'desc' }, include: { mice: true } },
    },
  });
  if (!pair) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(pair);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();

  const data: Record<string, any> = {};
  if ('isActive' in body) data.isActive = body.isActive;
  if ('endDate' in body) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if ('note' in body) data.note = body.note ?? null;
  if ('startDate' in body) data.startDate = body.startDate ? new Date(body.startDate) : undefined;
  if ('maleId' in body) data.maleId = Number(body.maleId);
  if ('femaleId' in body) data.femaleId = Number(body.femaleId);
  if ('cageId' in body) data.cageId = body.cageId ? Number(body.cageId) : null;

  const pair = await prisma.matingPair.update({
    where: { id: Number(id) },
    data,
  });

  // When ending a mating pair, remove cage from individual mice
  if (body.isActive === false) {
    await prisma.mouse.updateMany({
      where: { id: { in: [pair.maleId, pair.femaleId] } },
      data: { cageId: null },
    });
  }

  // When cage is changed (and pair is still active), sync to individual mice
  if ('cageId' in body && pair.isActive) {
    await prisma.mouse.updateMany({
      where: { id: { in: [pair.maleId, pair.femaleId] } },
      data: { cageId: body.cageId ? Number(body.cageId) : null },
    });
  }

  return NextResponse.json(pair);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.matingPair.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
