import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessMouse } from '@/lib/strain-access';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!(await canAccessMouse(body.mouseId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const usage = await prisma.complianceUsage.create({
      data: {
        experimentApprovalId: Number(id),
        mouseId: body.mouseId,
        usageDate: new Date(body.usageDate),
        purpose: body.purpose,
        note: body.note,
      },
    });
    return NextResponse.json(usage, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 400 });
  }
}
