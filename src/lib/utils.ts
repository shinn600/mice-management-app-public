import { IDENTIFICATION_METHODS, EAR_PUNCH_POSITIONS } from './constants';

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatIdMethod(method: string | null, detail: string | null, locale: string): string {
  if (!method) return '-';
  const m = IDENTIFICATION_METHODS[method]?.[locale === 'ja' ? 'ja' : 'en'] || method;
  if (!detail) return m;
  if (method === 'ear_punch') {
    const pos = EAR_PUNCH_POSITIONS.find(p => p.value === detail);
    if (pos) return `${m} (${locale === 'ja' ? pos.ja : pos.en})`;
  }
  if (method === 'finger_cut') return `${m} (${locale === 'ja' ? `指${detail}番` : `#${detail}`})`;
  return m;
}

export function generateMouseCode(strainName: string, sequenceNumber: number): string {
  const paddedNumber = String(sequenceNumber).padStart(4, '0');
  return `${strainName}-${paddedNumber}`;
}

export function mouseUrl(mouseCode: string): string {
  return `/mice/${encodeURIComponent(mouseCode)}`;
}

/**
 * True when `candidate`'s name matches the genetic background registered on `strain`
 * (Strain.geneticBackground) — i.e. `candidate` is the wild-type/background strain that
 * `strain` was derived from. Used to decide, for a cross between two different strains,
 * which parent's strain/substrain the offspring should inherit (see breeding pages,
 * the wean API route, and due-date-reminders.ts). Replaces the old approach of matching
 * a single hardcoded strain name (e.g. "C57BL/6JmsSlc") — each strain now looks up its
 * own registered background strain instead.
 */
export function isBackgroundStrainOf(candidate: { name: string }, strain: { geneticBackground?: string | null }): boolean {
  return !!strain.geneticBackground && candidate.name === strain.geneticBackground;
}
