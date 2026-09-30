import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

// Board post/comment email notifications.
// Both the sending account and the recipient are admin-editable from the Settings page
// (AppSetting keys "smtpUser"/"smtpPass" and "boardNotifyEmail"), falling back to the env
// vars (SMTP_USER/SMTP_PASS/BOARD_NOTIFY_EMAIL) only if unset in the DB — this lets a
// self-hosted deployment run its own sender identity instead of the developer's.
// If sending credentials or a recipient are missing, notifications are silently skipped
// (the feature is optional and must never break board post/comment creation).

export async function getSmtpCredentials(): Promise<{ user: string; pass: string } | null> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: ['smtpUser', 'smtpPass'] } } });
  const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));
  // smtpUser/smtpPass are only ever used together as a matched pair. If an admin has only
  // filled in one of the two Settings-page boxes, the DB half is a different Gmail account's
  // identity than the env var half — mixing them would authenticate with the wrong password
  // (or the wrong account), so an incomplete DB pair is ignored entirely in favor of the env pair.
  if (byKey.smtpUser && byKey.smtpPass) {
    return { user: byKey.smtpUser, pass: byKey.smtpPass };
  }
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  }
  return null;
}

export async function getBaseUrl(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'baseUrl' } });
  return setting?.value || process.env.APP_BASE_URL || 'http://localhost:3000';
}

// Low-level send used by all notification types in this module. Resolves the admin-configured
// (or env var fallback) sending account itself, so callers only need a recipient/subject/body.
// Never throws — failures are logged and swallowed, since no notification may ever block the
// caller's primary action (creating a post, running the daily due-date check, etc.).
export async function sendPlainEmail(opts: { to: string | string[]; subject: string; text: string }): Promise<void> {
  const creds = await getSmtpCredentials();
  if (!creds) return; // SMTP sending credentials not configured — no-op
  try {
    const client = nodemailer.createTransport({ service: 'gmail', auth: creds });
    await client.sendMail({ from: creds.user, to: opts.to, subject: opts.subject, text: opts.text });
  } catch (error) {
    console.error('[mailer] failed to send email:', error);
  }
}

// boardNotifyEmail may hold multiple addresses separated by semicolons (e.g. "a@x.com; b@y.com").
async function getNotifyRecipients(): Promise<string[]> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'boardNotifyEmail' } });
  const raw = setting?.value || process.env.BOARD_NOTIFY_EMAIL || '';
  return raw.split(';').map(s => s.trim()).filter(Boolean);
}

const CATEGORY_LABELS: Record<string, string> = {
  request: '改善要望',
  bug: '不具合報告',
  announcement: 'お知らせ',
};

function truncate(text: string, max = 200): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

type BoardNotification =
  | { type: 'post'; postId: number; title: string; category: string; body: string; authorName: string }
  | { type: 'comment'; postId: number; title: string; body: string; authorName: string };

export async function sendBoardNotification(notification: BoardNotification): Promise<void> {
  const to = await getNotifyRecipients();
  if (to.length === 0) return; // no recipient configured — no-op

  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/board/${notification.postId}`;

  const subject = notification.type === 'post'
    ? `[マウス管理システム] 新規投稿: ${notification.title}`
    : `[マウス管理システム] コメント追加: ${notification.title}`;

  const intro = notification.type === 'post'
    ? `${notification.authorName} さんが掲示板に新しい投稿をしました。`
    : `${notification.authorName} さんが投稿にコメントを追加しました。`;

  const categoryLine = notification.type === 'post'
    ? `カテゴリ: ${CATEGORY_LABELS[notification.category] ?? notification.category}\n`
    : '';

  const text = `${intro}

件名: ${notification.title}
${categoryLine}
${truncate(notification.body)}

詳細を見る: ${url}
`;

  await sendPlainEmail({ to, subject, text });
}
