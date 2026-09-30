import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { genotypingCreateSchema } from '@/lib/validators';
import { pcrResultToGenotype } from '@/lib/genotype';
import { auth } from '@/auth';
import { canAccessMouse } from '@/lib/strain-access';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const createdBy = (session?.user as any)?.name ?? null;
    const body = await request.json();
    const data = genotypingCreateSchema.parse(body);
    if (!(await canAccessMouse(data.mouseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const record = await prisma.genotypingRecord.create({
      data: {
        mouseId: data.mouseId,
        targetGene: data.targetGene,
        pcrResult: data.pcrResult,
        genotypeLabel: pcrResultToGenotype(data.pcrResult),
        testedDate: data.testedDate ? new Date(data.testedDate) : null,
        note: data.note,
        createdBy,
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
