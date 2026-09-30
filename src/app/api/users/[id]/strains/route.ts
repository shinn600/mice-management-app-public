import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/users/[id]/strains — Get strain assignments for a user
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const assignments = await prisma.userStrain.findMany({
      where: { userId: Number(id) },
      select: { strainId: true },
    });

    return NextResponse.json(assignments.map((a) => a.strainId));
  } catch (e: any) {
    console.error('GET /api/users/[id]/strains error:', e);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/[id]/strains — Replace strain assignments for a user
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const userId = Number(id);
    const body = await req.json();
    const strainIds: number[] = body.strainIds;

    if (!Array.isArray(strainIds)) {
      return NextResponse.json({ error: 'strainIds must be an array' }, { status: 400 });
    }

    // Delete all existing assignments and re-create
    await prisma.userStrain.deleteMany({ where: { userId } });
    for (const strainId of strainIds) {
      await prisma.userStrain.create({ data: { userId, strainId } });
    }

    // Return the saved IDs for confirmation
    const saved = await prisma.userStrain.findMany({
      where: { userId },
      select: { strainId: true },
    });

    return NextResponse.json(saved.map((s) => s.strainId));
  } catch (e: any) {
    console.error('PUT /api/users/[id]/strains error:', e);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
