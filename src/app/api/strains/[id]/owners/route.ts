import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { canAccessStrain, getCurrentUserId } from '@/lib/strain-access';

async function ownerList(strainId: number) {
  const owners = await prisma.strainOwner.findMany({
    where: { strainId },
    include: { user: { select: { id: true, name: true, username: true } } },
  });
  return owners.map(o => o.user);
}

// GET /api/strains/[id]/owners — list the users designated as this strain's person(s) in charge.
// Display-only reference info, independent of UserStrain view/operate access control — readable
// by anyone who can already see the strain, not admin-only.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const strainId = Number(id);
    if (!(await canAccessStrain(strainId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json(await ownerList(strainId));
  } catch (e: any) {
    console.error('GET /api/strains/[id]/owners error:', e);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/strains/[id]/owners — replace the owner list for this strain. Admin only.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const strainId = Number(id);
    const body = await req.json();
    const userIds: number[] = body.userIds;

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 });
    }

    await prisma.strainOwner.deleteMany({ where: { strainId } });
    for (const userId of userIds) {
      await prisma.strainOwner.create({ data: { strainId, userId } });
    }

    return NextResponse.json(await ownerList(strainId));
  } catch (e: any) {
    console.error('PUT /api/strains/[id]/owners error:', e);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/strains/[id]/owners — toggle ONLY the caller's own assignment ({ isOwner: boolean }).
// Open to every signed-in user who can access the strain (a general user may put themselves in
// charge of a strain they work on, without being able to touch anyone else's assignment).
// The target user ID is taken from the session and never from the request body, so this endpoint
// cannot add or remove another account by construction — use the admin-only PUT for that.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const strainId = Number(id);
    if (!Number.isInteger(strainId)) return NextResponse.json({ error: 'Invalid strain id' }, { status: 400 });
    if (!(await canAccessStrain(strainId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    if (typeof body?.isOwner !== 'boolean') {
      return NextResponse.json({ error: 'isOwner must be a boolean' }, { status: 400 });
    }

    if (body.isOwner) {
      await prisma.strainOwner.upsert({
        where: { strainId_userId: { strainId, userId } },
        create: { strainId, userId },
        update: {},
      });
    } else {
      await prisma.strainOwner.deleteMany({ where: { strainId, userId } });
    }

    return NextResponse.json(await ownerList(strainId));
  } catch (e: any) {
    console.error('PATCH /api/strains/[id]/owners error:', e);
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
