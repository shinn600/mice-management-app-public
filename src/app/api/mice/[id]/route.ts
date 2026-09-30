import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessMouse, canAccessStrain } from '@/lib/strain-access';

async function resolveMouseId(param: string): Promise<number | null> {
  const decoded = decodeURIComponent(param);
  if (/^\d+$/.test(decoded)) {
    return Number(decoded);
  }
  const mouse = await prisma.mouse.findUnique({
    where: { mouseCode: decoded },
    select: { id: true },
  });
  return mouse?.id ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = await resolveMouseId(id);
  if (numericId === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await canAccessMouse(numericId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const mouse = await prisma.mouse.findUnique({
    where: { id: numericId },
    include: {
      strain: true,
      substrain: true,
      cage: true,
      father: { include: { strain: true } },
      mother: { include: { strain: true } },
      childrenAsFather: { include: { strain: true } },
      childrenAsMother: { include: { strain: true } },
      genotypingRecords: true,
      litter: true,
      complianceUsages: { include: { experimentApproval: true } },
      matingPairsAsMale: {
        orderBy: { startDate: 'desc' },
        include: { female: { include: { strain: true } }, cage: true },
      },
      matingPairsAsFemale: {
        orderBy: { startDate: 'desc' },
        include: { male: { include: { strain: true } }, cage: true },
      },
    },
  });
  if (!mouse) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(mouse);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = await resolveMouseId(id);
    if (numericId === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!(await canAccessMouse(numericId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    if (body.strainId && !(await canAccessStrain(Number(body.strainId)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Only include fields that were explicitly sent in the request body
    const data: Record<string, any> = {};
    if ('mouseCode' in body) data.mouseCode = body.mouseCode;
    if ('sex' in body) data.sex = body.sex;
    if ('birthDate' in body) data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    if ('strainId' in body) data.strainId = Number(body.strainId);
    if ('substrainId' in body) data.substrainId = body.substrainId ? Number(body.substrainId) : null;
    if ('fatherId' in body) data.fatherId = body.fatherId ? Number(body.fatherId) : null;
    if ('motherId' in body) data.motherId = body.motherId ? Number(body.motherId) : null;
    if ('status' in body) data.status = body.status;
    if ('identificationMethod' in body) data.identificationMethod = body.identificationMethod || null;
    if ('identificationDetail' in body) data.identificationDetail = body.identificationDetail || null;
    if ('identificationNote' in body) data.identificationNote = body.identificationNote || null;
    if ('cageId' in body) {
      data.cageId = body.cageId ? Number(body.cageId) : null;
    } else if ('status' in body && (body.status === 'dead' || body.status === 'processed')) {
      // Clear cage when mouse dies or is processed (unless cageId is explicitly set in same request)
      data.cageId = null;
    }
    if ('note' in body) data.note = body.note || null;

    const mouse = await prisma.mouse.update({
      where: { id: numericId },
      data,
    });
    return NextResponse.json(mouse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = await resolveMouseId(id);
  if (numericId === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await canAccessMouse(numericId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.mouse.delete({ where: { id: numericId } });
  return NextResponse.json({ success: true });
}
