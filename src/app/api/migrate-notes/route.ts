import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// One-time migration: move identificationNote → note for mice that have identificationNote but no note
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mice = await prisma.mouse.findMany({
    where: {
      identificationNote: { not: null },
    },
    select: { id: true, mouseCode: true, identificationNote: true, note: true },
  });

  const toMigrate = mice.filter(m => m.identificationNote && m.identificationNote.trim());
  const results: { id: number; mouseCode: string; action: string }[] = [];

  for (const m of toMigrate) {
    if (!m.note || !m.note.trim()) {
      // note is empty: move identificationNote → note, clear identificationNote
      await prisma.mouse.update({
        where: { id: m.id },
        data: { note: m.identificationNote, identificationNote: null },
      });
      results.push({ id: m.id, mouseCode: m.mouseCode, action: 'moved' });
    } else {
      // note already has value: append identificationNote to note, clear identificationNote
      await prisma.mouse.update({
        where: { id: m.id },
        data: { note: `${m.note}\n${m.identificationNote}`, identificationNote: null },
      });
      results.push({ id: m.id, mouseCode: m.mouseCode, action: 'appended' });
    }
  }

  return NextResponse.json({ migrated: results.length, results });
}
