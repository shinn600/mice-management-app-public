import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { boardPostUpdateSchema } from '@/lib/validators';
import { auth } from '@/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.boardPost.findUnique({
    where: { id: Number(id) },
    include: {
      author: { select: { id: true, name: true, username: true } },
      comments: {
        include: { author: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.boardPost.findUnique({ where: { id: Number(id) }, include: { author: true } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const user = await prisma.user.findFirst({ where: { name: session.user.name ?? undefined } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

  // Only author can edit title/body/category/priority. Status and pinned can be changed by anyone.
  const body = await request.json();
  const data = boardPostUpdateSchema.parse(body);

  if ((data.title || data.body || data.category || data.priority !== undefined) && user.id !== post.authorId) {
    return NextResponse.json({ error: 'Only the author can edit this post' }, { status: 403 });
  }

  const updated = await prisma.boardPost.update({
    where: { id: Number(id) },
    data,
    include: {
      author: { select: { id: true, name: true, username: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.boardPost.findUnique({ where: { id: Number(id) }, include: { author: true } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const user = await prisma.user.findFirst({ where: { name: session.user.name ?? undefined } });
  if (!user || user.id !== post.authorId) {
    return NextResponse.json({ error: 'Only the author can delete this post' }, { status: 403 });
  }

  await prisma.boardPost.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
