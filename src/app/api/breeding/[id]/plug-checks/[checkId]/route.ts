import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessMatingPair } from '@/lib/strain-access';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; checkId: string }> }
) {
  const { id, checkId } = await params;
  if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.plugCheck.delete({ where: { id: Number(checkId) } });
  return NextResponse.json({ success: true });
}
