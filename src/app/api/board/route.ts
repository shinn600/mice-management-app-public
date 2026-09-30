import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { boardPostCreateSchema } from '@/lib/validators';
import { auth } from '@/auth';
import { sendBoardNotification } from '@/lib/mailer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { body: { contains: search } },
    ];
  }

  const posts = await prisma.boardPost.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, username: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = boardPostCreateSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: { name: session.user.name ?? undefined },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const post = await prisma.boardPost.create({
      data: { ...data, authorId: user.id },
      include: {
        author: { select: { id: true, name: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    await sendBoardNotification({
      type: 'post',
      postId: post.id,
      title: post.title,
      category: post.category,
      body: post.body,
      authorName: post.author.name ?? post.author.username,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Validation error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
