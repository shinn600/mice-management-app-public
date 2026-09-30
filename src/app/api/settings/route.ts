import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// AppSetting keys that hold secrets — never echoed back to the client as-is.
const SECRET_KEYS = ['smtpPass'];
// AppSetting keys only meaningful/visible to admins (in addition to secrets, always excluded).
const ADMIN_ONLY_KEYS = ['smtpUser'];
// Submitting a key blank deletes it (reverting to the env var fallback). Some keys have
// dependents that must go with them — clearing the sending account must not leave its
// app password paired with a different (env var) account.
const CASCADE_DELETE_KEYS: Record<string, string[]> = { smtpUser: ['smtpPass'] };

export async function GET() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const settings = await prisma.appSetting.findMany();
  const obj: Record<string, string | boolean> = {};
  for (const s of settings) {
    if (SECRET_KEYS.includes(s.key)) continue;
    if (ADMIN_ONLY_KEYS.includes(s.key) && !isAdmin) continue;
    obj[s.key] = s.value;
  }
  if (isAdmin) {
    const pass = settings.find(s => s.key === 'smtpPass');
    obj.smtpConfigured = !!pass?.value;
  }
  return NextResponse.json(obj);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const entries = Object.entries(body).filter((e): e is [string, string] => typeof e[1] === 'string');

    // Pass 1: work out every key to delete (blanked keys plus their cascade dependents),
    // but never delete a key that this same request is also setting to a non-blank value —
    // otherwise "clear the account, but I left a password typed in" would delete-then-recreate
    // an orphaned password. Blank secrets mean "leave unchanged", not "clear".
    const toDelete = new Set<string>();
    for (const [key, value] of entries) {
      if (value !== '' || SECRET_KEYS.includes(key)) continue;
      toDelete.add(key);
      for (const dep of CASCADE_DELETE_KEYS[key] ?? []) toDelete.add(dep);
    }
    for (const [key, value] of entries) {
      if (value !== '') toDelete.delete(key);
    }
    if (toDelete.size > 0) {
      await prisma.appSetting.deleteMany({ where: { key: { in: [...toDelete] } } });
    }

    // Pass 2: write everything submitted non-blank.
    const results: Record<string, string> = {};
    for (const [key, value] of entries) {
      if (SECRET_KEYS.includes(key) && value === '') continue; // leave unchanged
      if (value === '') { results[key] = ''; continue; } // handled by the delete pass above

      const setting = await prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      results[setting.key] = SECRET_KEYS.includes(key) ? '••••••••' : setting.value;
    }
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
