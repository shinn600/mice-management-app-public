import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAllowedStrainIds } from '@/lib/strain-access';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const approval = await prisma.experimentApproval.findUnique({
    where: { id: Number(id) },
    include: { usages: { include: { mouse: { include: { strain: true } } } } },
  });
  if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const totalUsages = approval.usages.length;

  const allowed = await getAllowedStrainIds();
  if (allowed !== null) {
    approval.usages = approval.usages.filter(u => allowed.includes(u.mouse.strainId));
  }

  return NextResponse.json({ ...approval, totalUsages });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const approval = await prisma.experimentApproval.update({
    where: { id: Number(id) },
    data: {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  });
  return NextResponse.json(approval);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.experimentApproval.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
