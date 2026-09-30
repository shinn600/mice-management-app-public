import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { strainCreateSchema } from '@/lib/validators';
import { getAllowedStrainIds, canAccessStrain } from '@/lib/strain-access';

export async function GET() {
  const allowedIds = await getAllowedStrainIds();
  const where = allowedIds === null ? {} : { id: { in: allowedIds } };
  const strains = await prisma.strain.findMany({
    where,
    include: { _count: { select: { mice: { where: { status: 'alive' } } } } },
    orderBy: { name: 'asc' },
  });

  // 系統選択ドロップダウンの並び順：実際の（遺伝子改変等の）系統を先に、他系統の遺伝子背景として
  // 登録されている背景系統（C57BL/6JmsSlc 等の野生型）を後に表示する。背景系統の判定は
  // アクセス可能な系統に限らず全系統の geneticBackground を参照する（並び順の決定のみに使用し、
  // 未許可系統のデータは返さない）。各グループ内は系統名の昇順を維持する（stable sort）。
  const allBackgroundNames = await prisma.strain.findMany({ select: { geneticBackground: true } });
  const backgroundNames = new Set(allBackgroundNames.map(s => s.geneticBackground).filter(Boolean));
  const isBackground = (name: string) => (backgroundNames.has(name) ? 1 : 0);
  const sorted = [...strains].sort((a, b) => isBackground(a.name) - isBackground(b.name));

  return NextResponse.json(sorted);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = strainCreateSchema.parse(body);
    const strain = await prisma.strain.create({ data });
    return NextResponse.json(strain, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation error' }, { status: 400 });
  }
}
