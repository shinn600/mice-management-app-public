export function todayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calcExpectedBirthDate(plugDate: Date): { earliest: Date; latest: Date } {
  const earliest = new Date(plugDate);
  earliest.setDate(earliest.getDate() + 19);
  const latest = new Date(plugDate);
  latest.setDate(latest.getDate() + 21);
  return { earliest, latest };
}

export function calcWeaningDate(birthDate: Date): Date {
  const weaningDate = new Date(birthDate);
  weaningDate.setDate(weaningDate.getDate() + 21);
  return weaningDate;
}

export function parseDate(str: string): Date {
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
}
