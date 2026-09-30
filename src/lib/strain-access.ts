import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Returns the signed-in user's numeric ID, or null if it cannot be determined.
 *
 * Use this — never the display name — whenever a write depends on *which* user is acting:
 * `User.name` has no unique constraint, so a name lookup can resolve to the wrong account.
 * auth.config.ts propagates the ID into the session; the name lookup below only covers
 * sessions issued before that change (and tolerates a missing/duplicate name by failing closed).
 */
export async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user) return null;

  const sessionId = (session.user as any).id;
  if (sessionId != null && /^\d+$/.test(String(sessionId))) return Number(sessionId);

  const name = (session.user as any).name;
  if (!name) return null;
  const matches = await prisma.user.findMany({
    where: { OR: [{ username: name }, { name }] },
    select: { id: true },
    take: 2,
  });
  return matches.length === 1 ? matches[0].id : null;
}

/**
 * Returns the list of strain IDs the current user is allowed to access.
 * - admin users: returns null (no restriction — all strains allowed)
 * - regular users with no explicit assignments: returns [] (no access)
 * - regular users with assignments: returns the assigned strain ID array
 */
export async function getAllowedStrainIds(): Promise<number[] | null> {
  const session = await auth();
  if (!session?.user) return [];

  const role = (session.user as any).role;
  if (role === 'admin') return null; // null = unrestricted

  // Find user by name (which is username or display name stored in token)
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: (session.user as any).name },
        { username: (session.user as any).name },
      ],
    },
    include: { allowedStrains: { select: { strainId: true } } },
  });

  if (!user) return [];
  return user.allowedStrains.map((us) => us.strainId);
}

/**
 * Builds a Prisma where clause fragment for strainId filtering.
 * Returns {} if unrestricted (admin), or { strainId: { in: [...] } } for restricted users.
 */
export async function strainWhereClause(): Promise<Record<string, any>> {
  const ids = await getAllowedStrainIds();
  if (ids === null) return {}; // admin - no restriction
  return { strainId: { in: ids } };
}

/**
 * Check if the current user has access to a specific strain ID.
 * Returns true for admins (unrestricted) or if strainId is in user's allowed list.
 */
export async function canAccessStrain(strainId: number): Promise<boolean> {
  const ids = await getAllowedStrainIds();
  if (ids === null) return true; // admin
  return ids.includes(strainId);
}

/**
 * Check if the current user has access to a mouse by its ID.
 * Looks up the mouse's strainId and checks access.
 */
export async function canAccessMouse(mouseId: number): Promise<boolean> {
  const ids = await getAllowedStrainIds();
  if (ids === null) return true;
  const mouse = await prisma.mouse.findUnique({
    where: { id: mouseId },
    select: { strainId: true },
  });
  if (!mouse) return false;
  return ids.includes(mouse.strainId);
}

/**
 * Check if the current user has access to a mating pair by its ID.
 * Checks the male's strain.
 */
export async function canAccessMatingPair(pairId: number): Promise<boolean> {
  const ids = await getAllowedStrainIds();
  if (ids === null) return true;
  const pair = await prisma.matingPair.findUnique({
    where: { id: pairId },
    include: { male: { select: { strainId: true } } },
  });
  if (!pair) return false;
  return ids.includes(pair.male.strainId);
}
