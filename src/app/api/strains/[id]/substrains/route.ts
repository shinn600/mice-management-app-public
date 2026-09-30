import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const substrains = await prisma.substrain.findMany({
    where: { strainId: Number(id) },
    orderBy: { number: 'asc' },
  });
  return NextResponse.json(substrains);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { number, color } = await request.json();
  if (number === undefined || number === null || typeof number !== 'number') {
    return NextResponse.json({ error: '番号は必須です' }, { status: 400 });
  }
  try {
    const substrain = await prisma.substrain.create({
      data: { number, color: color || '#4F46E5', strainId: Number(id) },
    });
    return NextResponse.json(substrain, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'この番号はすでに存在します' }, { status: 409 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const subId = searchParams.get('subId');
  if (!subId) return NextResponse.json({ error: 'subId required' }, { status: 400 });
  const { color } = await request.json();
  const substrain = await prisma.substrain.update({
    where: { id: Number(subId) },
    data: { color },
  });
  return NextResponse.json(substrain);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const subId = searchParams.get('subId');
  if (!subId) return NextResponse.json({ error: 'subId required' }, { status: 400 });
  const inUse = await prisma.mouse.count({ where: { substrainId: Number(subId) } });
  if (inUse > 0) return NextResponse.json({ error: `このサブ系統は${inUse}匹の個体に使用されています` }, { status: 409 });
  await prisma.substrain.delete({ where: { id: Number(subId) } });
  return NextResponse.json({ ok: true });
}
