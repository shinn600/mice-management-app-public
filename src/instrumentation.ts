// Next.js instrumentation hook — runs once when the server process starts (see
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation).
// Used here to bootstrap the daily due-date email reminder check (see src/lib/due-date-reminders.ts)
// without needing a separate OS-level cron job or scheduler process: PM2 keeps this server
// process alive continuously, so an in-process interval is sufficient.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { checkAndSendDueDateReminders } = await import('@/lib/due-date-reminders');

  // Checked hourly rather than precisely at midnight — cheap to run, and idempotent via the
  // birthReminderSentAt / weanReminderSentAt columns, so extra runs on the same day are no-ops.
  // This also means a reminder is still sent promptly after a deploy/restart even if the exact
  // due moment was missed while the process was down.
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;

  const runCheck = () => {
    checkAndSendDueDateReminders().catch(err => {
      console.error('[due-date-reminders] check failed:', err);
    });
  };

  runCheck();
  setInterval(runCheck, CHECK_INTERVAL_MS);
}
