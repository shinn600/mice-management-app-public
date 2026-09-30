import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessMouse } from '@/lib/strain-access';

interface PedigreeNode {
  id: number;
  mouseCode: string;
  sex: string;
  strain: { name: string; color: string };
  substrain: { number: number; color: string } | null;
  genotype: string | null;
  father: PedigreeNode | null;
  mother: PedigreeNode | null;
}

async function fetchAncestors(mouseId: number, depth: number): Promise<PedigreeNode | null> {
  if (depth <= 0) return null;

  const mouse = await prisma.mouse.findUnique({
    where: { id: mouseId },
    include: { strain: true, substrain: true, genotypingRecords: true },
  });

  if (!mouse) return null;

  const father = mouse.fatherId ? await fetchAncestors(mouse.fatherId, depth - 1) : null;
  const mother = mouse.motherId ? await fetchAncestors(mouse.motherId, depth - 1) : null;

  const genotype = mouse.genotypingRecords.length > 0
    ? mouse.genotypingRecords.map(g => g.genotypeLabel).join(', ')
    : null;

  return {
    id: mouse.id,
    mouseCode: mouse.mouseCode,
    sex: mouse.sex,
    strain: { name: mouse.strain.name, color: mouse.strain.color },
    substrain: mouse.substrain ? { number: mouse.substrain.number, color: mouse.substrain.color } : null,
    genotype,
    father,
    mother,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  let numericId: number;
  if (/^\d+$/.test(decoded)) {
    numericId = Number(decoded);
  } else {
    const mouse = await prisma.mouse.findUnique({ where: { mouseCode: decoded }, select: { id: true } });
    if (!mouse) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    numericId = mouse.id;
  }
  if (!(await canAccessMouse(numericId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const pedigree = await fetchAncestors(numericId, 4);
  if (!pedigree) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(pedigree);
}
