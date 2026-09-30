import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { experimentApprovalCreateSchema } from '@/lib/validators';

export async function GET() {
  const approvals = await prisma.experimentApproval.findMany({
    include: { _count: { select: { usages: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(approvals);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = experimentApprovalCreateSchema.parse(body);
    const approval = await prisma.experimentApproval.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
    return NextResponse.json(approval, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
