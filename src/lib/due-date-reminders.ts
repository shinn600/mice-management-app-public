import { prisma } from '@/lib/prisma';
import { sendPlainEmail, getBaseUrl } from '@/lib/mailer';
import { calcExpectedBirthDate, calcWeaningDate, formatDate } from '@/lib/date-utils';
import { isBackgroundStrainOf } from '@/lib/utils';

// Daily due-date email reminders for strain owners ("担当者", see StrainOwner).
// Two kinds of reminder, each sent exactly once (idempotency tracked via a *ReminderSentAt
// column) on the day the due date lands:
//   - 出産予定日 (expected birth): the earliest day of the range calcExpectedBirthDate() derives
//     from the most recent "plug found" check on an active mating pair, as long as no litter has
//     been recorded for it yet.
//   - 離乳予定日 (expected weaning): birthDate + 21 days for any litter not yet marked weaned.
// Recipients are the StrainOwner-assigned users of the resolved strain who have an email set;
// silently does nothing if there are none (this feature is opt-in per user, per strain).

type StrainRef = { id: number; name: string; geneticBackground: string | null };

// Crossing a strain with its own registered background/wild-type strain (Strain.geneticBackground,
// see also breeding pages and the wean API route) always inherits the other parent's strain.
function resolvePairStrain(male: { strain: StrainRef }, female: { strain: StrainRef }): StrainRef | null {
  if (male.strain.id === female.strain.id) return male.strain;
  if (isBackgroundStrainOf(male.strain, female.strain)) return female.strain;
  if (isBackgroundStrainOf(female.strain, male.strain)) return male.strain;
  return null; // ambiguous cross — no single strain to attribute the reminder to
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

async function notifyStrainOwners(strainId: number, subject: string, text: string): Promise<void> {
  const owners = await prisma.strainOwner.findMany({
    where: { strainId },
    include: { user: { select: { email: true } } },
  });
  const emails = owners.map(o => o.user.email).filter((e): e is string => !!e);
  if (emails.length === 0) return;
  await sendPlainEmail({ to: emails, subject, text });
}

export async function checkAndSendDueDateReminders(): Promise<void> {
  const baseUrl = await getBaseUrl();

  // --- 出産予定日 ---
  const activePairs = await prisma.matingPair.findMany({
    where: { isActive: true },
    include: {
      male: { select: { strain: { select: { id: true, name: true, geneticBackground: true } } } },
      female: { select: { strain: { select: { id: true, name: true, geneticBackground: true } } } },
      plugChecks: { where: { plugFound: true, birthReminderSentAt: null }, orderBy: { checkDate: 'desc' } },
      litters: { select: { birthDate: true } },
    },
  });

  for (const pair of activePairs) {
    const latestPlug = pair.plugChecks[0];
    if (!latestPlug) continue;

    const checkDate = new Date(latestPlug.checkDate);
    const { earliest } = calcExpectedBirthDate(checkDate);
    if (!isToday(earliest)) continue;

    // A litter recorded after this plug check means the birth already happened — no reminder needed.
    const alreadyBorn = pair.litters.some(l => new Date(l.birthDate) >= checkDate);
    if (alreadyBorn) { await prisma.plugCheck.update({ where: { id: latestPlug.id }, data: { birthReminderSentAt: new Date() } }); continue; }

    const strain = resolvePairStrain(pair.male, pair.female);
    if (strain) {
      const subject = `[マウス管理システム] 出産予定日のお知らせ（交配ペア #${pair.id}）`;
      const text = `担当系統「${strain.name}」の交配ペア（#${pair.id}）が、本日出産予定日を迎えました。

プラグ確認日: ${formatDate(checkDate)}
出産予定日: ${formatDate(earliest)}

詳細を見る: ${baseUrl}/breeding/${pair.id}
`;
      await notifyStrainOwners(strain.id, subject, text);
    }
    await prisma.plugCheck.update({ where: { id: latestPlug.id }, data: { birthReminderSentAt: new Date() } });
  }

  // --- 離乳予定日 ---
  const pendingLitters = await prisma.litter.findMany({
    where: { weaningDate: null, weanReminderSentAt: null },
    include: {
      matingPair: {
        select: {
          id: true,
          male: { select: { strain: { select: { id: true, name: true, geneticBackground: true } } } },
          female: { select: { strain: { select: { id: true, name: true, geneticBackground: true } } } },
        },
      },
    },
  });

  for (const litter of pendingLitters) {
    const birthDate = new Date(litter.birthDate);
    const expectedWean = calcWeaningDate(birthDate);
    if (!isToday(expectedWean)) continue;

    const strain = resolvePairStrain(litter.matingPair.male, litter.matingPair.female);
    if (strain) {
      const subject = `[マウス管理システム] 離乳予定日のお知らせ（産子 #${litter.id}）`;
      const text = `担当系統「${strain.name}」の産子（出生日: ${formatDate(birthDate)}、${litter.pupCount}匹）が、本日離乳予定日を迎えました。

離乳予定日: ${formatDate(expectedWean)}

詳細を見る: ${baseUrl}/breeding/${litter.matingPair.id}
`;
      await notifyStrainOwners(strain.id, subject, text);
    }
    await prisma.litter.update({ where: { id: litter.id }, data: { weanReminderSentAt: new Date() } });
  }
}
