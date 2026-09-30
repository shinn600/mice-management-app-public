import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { plugCheckCreateSchema } from '@/lib/validators';
import { auth } from '@/auth';
import { canAccessMatingPair } from '@/lib/strain-access';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const createdBy = (session?.user as any)?.name ?? null;
    const { id } = await params;
    if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const data = plugCheckCreateSchema.parse(body);
    const check = await prisma.plugCheck.create({
      data: {
        matingPairId: Number(id),
        checkDate: new Date(data.checkDate),
        plugFound: data.plugFound,
        note: data.note,
        createdBy,
      },
    });
    return NextResponse.json(check, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
