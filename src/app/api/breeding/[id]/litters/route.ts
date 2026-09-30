import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { litterCreateSchema } from '@/lib/validators';
import { auth } from '@/auth';
import { canAccessMatingPair } from '@/lib/strain-access';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const createdBy = (session?.user as any)?.name ?? null;
    const { id } = await params;
    if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const data = litterCreateSchema.parse(body);
    const litter = await prisma.litter.create({
      data: {
        matingPairId: Number(id),
        birthDate: new Date(data.birthDate),
        pupCount: data.pupCount,
        note: data.note,
        createdBy,
      },
    });
    return NextResponse.json(litter, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
