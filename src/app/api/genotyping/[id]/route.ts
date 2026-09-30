import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessMouse } from '@/lib/strain-access';
import { pcrResultToGenotype } from '@/lib/genotype';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.genotypingRecord.findUnique({ where: { id: Number(id) }, select: { mouseId: true } });
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await canAccessMouse(record.mouseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const updated = await prisma.genotypingRecord.update({
    where: { id: Number(id) },
    data: {
      targetGene: body.targetGene,
      pcrResult: body.pcrResult,
      genotypeLabel: pcrResultToGenotype(body.pcrResult),
      testedDate: body.testedDate ? new Date(body.testedDate) : null,
      note: body.note ?? null,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.genotypingRecord.findUnique({ where: { id: Number(id) }, select: { mouseId: true } });
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await canAccessMouse(record.mouseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.genotypingRecord.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
