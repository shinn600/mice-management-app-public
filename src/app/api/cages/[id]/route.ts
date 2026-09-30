import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAllowedStrainIds } from '@/lib/strain-access';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cage = await prisma.cage.findUnique({
    where: { id: Number(id) },
    include: { rack: true, mice: { include: { strain: true } } },
  });
  if (!cage) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const allowed = await getAllowedStrainIds();
  if (allowed !== null) {
    cage.mice = cage.mice.filter(m => allowed.includes(m.strainId));
  }
  return NextResponse.json(cage);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const cage = await prisma.cage.update({ where: { id: Number(id) }, data: body });
  return NextResponse.json(cage);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.cage.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
