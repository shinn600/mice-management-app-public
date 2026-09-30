import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// Self-service profile endpoint — operates on the caller's own account only (no admin gate),
// unlike /api/users/[id] which is admin-managed. Currently just the email address used for
// due-date reminder notifications (see src/lib/due-date-reminders.ts).

async function getCurrentUser(sessionUserName: string | null | undefined) {
  if (!sessionUserName) return null;
  return prisma.user.findFirst({
    where: { OR: [{ name: sessionUserName }, { username: sessionUserName }] },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getCurrentUser(session.user.name);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ id: user.id, username: user.username, name: user.name, email: user.email });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getCurrentUser(session.user.name);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  if (typeof body.email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }
  const email = body.email.trim();
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { email: email === '' ? null : email },
  });
  return NextResponse.json({ id: updated.id, username: updated.username, name: updated.name, email: updated.email });
}
