import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const targetId = Number(id);

  // 自分自身は削除不可
  const me = await prisma.user.findUnique({ where: { username: session.user?.name ?? '' } });
  if (me?.id === targetId) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: targetId } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { password, name, role } = body;

  const data: Record<string, string> = {};
  if (password) data.password = await bcrypt.hash(password, 12);
  if (name !== undefined) data.name = name;
  if (role) data.role = role;

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json(user);
}
