import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const rack = await prisma.rack.update({ where: { id: Number(id) }, data: body });
  return NextResponse.json(rack);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.rack.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
