import type { PcrResult } from './constants';

const PCR_TO_GENOTYPE: Record<PcrResult, string> = {
  'wt/wt': 'wt/wt',
  'wt/mut': 'wt/mut',
  'mut/mut': 'mut/mut',
};

export function pcrResultToGenotype(pcrResult: string): string {
  return PCR_TO_GENOTYPE[pcrResult as PcrResult] ?? pcrResult;
}
