import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { boardCommentCreateSchema } from '@/lib/validators';
import { auth } from '@/auth';
import { sendBoardNotification } from '@/lib/mailer';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);

  const post = await prisma.boardPost.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const user = await prisma.user.findFirst({ where: { name: session.user.name ?? undefined } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

  try {
    const body = await request.json();
    const data = boardCommentCreateSchema.parse(body);

    const comment = await prisma.boardComment.create({
      data: {
        postId,
        body: data.body,
        authorId: user.id,
        statusChange: data.statusChange ?? null,
      },
      include: { author: { select: { id: true, name: true, username: true } } },
    });

    // Update post status if statusChange provided
    if (data.statusChange) {
      await prisma.boardPost.update({
        where: { id: postId },
        data: { status: data.statusChange },
      });
    }

    await sendBoardNotification({
      type: 'comment',
      postId,
      title: post.title,
      body: comment.body,
      authorName: comment.author.name ?? comment.author.username,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Validation error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
