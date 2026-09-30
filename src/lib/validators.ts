import { z } from 'zod';

export const strainCreateSchema = z.object({
  name: z.string().min(1, '系統名は必須です'),
  geneticBackground: z.string().min(1, '遺伝子背景は必須です'),
  modificationType: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'カラーコードの形式が正しくありません').optional(),
});

export const strainUpdateSchema = strainCreateSchema.partial();

export const mouseCreateSchema = z.object({
  mouseCode: z.string().min(1, 'マウスIDは必須です'),
  sex: z.enum(['M', 'F'], { error: '性別を選択してください' }),
  birthDate: z.string().optional().nullable(),
  strainId: z.number({ error: '系統を選択してください' }),
  substrainId: z.number().optional().nullable(),
  fatherId: z.number().optional().nullable(),
  motherId: z.number().optional().nullable(),
  status: z.enum(['alive', 'dead', 'processed']).default('alive'),
  identificationMethod: z.string().optional().nullable(),
  identificationNote: z.string().optional().nullable(),
  cageId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const genotypingCreateSchema = z.object({
  mouseId: z.number({ error: 'マウスIDは必須です' }),
  targetGene: z.string().min(1, '対象遺伝子は必須です'),
  pcrResult: z.enum(['wt/wt', 'wt/mut', 'mut/mut'], { error: 'PCR結果を選択してください' }),
  testedDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const matingPairCreateSchema = z.object({
  maleId: z.number({ error: 'オスを選択してください' }),
  femaleId: z.number({ error: 'メスを選択してください' }),
  startDate: z.string().min(1, '交配開始日は必須です'),
  cageId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const plugCheckCreateSchema = z.object({
  checkDate: z.string().min(1, '確認日は必須です'),
  plugFound: z.boolean(),
  note: z.string().optional().nullable(),
});

export const litterCreateSchema = z.object({
  birthDate: z.string().min(1, '出生日は必須です'),
  pupCount: z.number().int().min(1, '頭数は1以上で入力してください'),
  note: z.string().optional().nullable(),
});

export const weaningSchema = z.object({
  weaningDate: z.string().min(1, '離乳日は必須です'),
  pups: z.array(z.object({
    sex: z.enum(['M', 'F'], { error: '性別を選択してください' }),
  })).min(1, '少なくとも1匹は必要です'),
  strainId: z.number().optional(),
  substrainId: z.number().optional().nullable(),
});

export const cageCreateSchema = z.object({
  cageCode: z.string().min(1, 'ケージコードは必須です'),
  maxCapacity: z.number().int().min(1, '最大収容数は1以上で入力してください').default(5),
  rackId: z.number().optional().nullable(),
  shelfNumber: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const rackCreateSchema = z.object({
  name: z.string().min(1, 'ラック名は必須です'),
  location: z.string().optional().nullable(),
});

export const experimentApprovalCreateSchema = z.object({
  approvalNumber: z.string().min(1, '承認番号は必須です'),
  title: z.string().min(1, '実験タイトルは必須です'),
  allowedCount: z.number().int().min(1, '使用可能頭数は1以上で入力してください'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const boardPostCreateSchema = z.object({
  title: z.string().min(1, '件名は必須です'),
  body: z.string().min(1, '本文は必須です'),
  category: z.enum(['request', 'bug', 'announcement']).default('request'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const boardPostUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  category: z.enum(['request', 'bug', 'announcement']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'rejected']).optional(),
  pinned: z.boolean().optional(),
});

export const boardCommentCreateSchema = z.object({
  body: z.string().min(1, 'コメントは必須です'),
  statusChange: z.enum(['open', 'in_progress', 'resolved', 'rejected']).optional().nullable(),
});
