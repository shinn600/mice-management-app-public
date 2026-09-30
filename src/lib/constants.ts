export const STATUS_LABELS: Record<string, { ja: string; en: string }> = {
  alive: { ja: '生存', en: 'Alive' },
  dead: { ja: '死亡', en: 'Dead' },
  processed: { ja: '処置済', en: 'Processed' },
};

export const SEX_LABELS: Record<string, string> = {
  M: '♂',
  F: '♀',
};

export const IDENTIFICATION_METHODS: Record<string, { ja: string; en: string }> = {
  ear_punch: { ja: '耳パンチ', en: 'Ear Punch' },
  tail_cut: { ja: '尻尾カット', en: 'Tail Cut' },
  finger_cut: { ja: '指カット', en: 'Toe Cut' },
  other: { ja: 'その他', en: 'Other' },
};

export const EAR_PUNCH_POSITIONS = [
  { value: 'R1', ja: '右1', en: 'R1' },
  { value: 'L1', ja: '左1', en: 'L1' },
  { value: 'R1L1', ja: '右1左1', en: 'R1L1' },
  { value: 'R2', ja: '右2', en: 'R2' },
  { value: 'L2', ja: '左2', en: 'L2' },
  { value: 'R2L1', ja: '右2左1', en: 'R2L1' },
  { value: 'R1L2', ja: '右1左2', en: 'R1L2' },
  { value: 'R2L2', ja: '右2左2', en: 'R2L2' },
] as const;

export const PCR_RESULTS = ['wt/wt', 'wt/mut', 'mut/mut'] as const;
export type PcrResult = (typeof PCR_RESULTS)[number];

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  alive: { bg: '#DCFCE7', text: '#166534' },
  dead: { bg: '#F3F4F6', text: '#374151' },
  processed: { bg: '#DBEAFE', text: '#1E40AF' },
};

export const GENOTYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'wt/wt': { bg: '#D1D5DB', text: '#111827' },
  'wt/mut': { bg: '#FDE68A', text: '#713F12' },
  'mut/mut': { bg: '#FECACA', text: '#7F1D1D' },
};
