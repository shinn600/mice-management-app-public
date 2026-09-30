import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();

  // 未認証の場合はユーザー数のみ返す（初回セットアップチェック用）
  if (!session) {
    const count = await prisma.user.count();
    return NextResponse.json({ count });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();

  const body = await req.json();
  const { username, password, name, role } = body;

  // 初回セットアップ（ユーザーゼロ）の場合は認証不要
  const count = await prisma.user.count();
  if (count > 0) {
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashed,
      name: name || null,
      role: count === 0 ? 'admin' : (role || 'user'),
    },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
