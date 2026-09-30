import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { strainUpdateSchema } from '@/lib/validators';
import { canAccessStrain } from '@/lib/strain-access';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canAccessStrain(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const strain = await prisma.strain.findUnique({
    where: { id: Number(id) },
    include: { mice: true, _count: { select: { mice: true } } },
  });
  if (!strain) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(strain);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await canAccessStrain(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const data = strainUpdateSchema.parse(body);
    const strain = await prisma.strain.update({ where: { id: Number(id) }, data });
    return NextResponse.json(strain);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await canAccessStrain(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.strain.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
