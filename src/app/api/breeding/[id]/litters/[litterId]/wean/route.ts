import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { weaningSchema } from '@/lib/validators';
import { generateMouseCode, isBackgroundStrainOf } from '@/lib/utils';
import { auth } from '@/auth';
import { canAccessMatingPair } from '@/lib/strain-access';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; litterId: string }> }) {
  try {
    const session = await auth();
    const createdBy = (session?.user as any)?.name ?? null;
    const { id, litterId } = await params;
    if (!(await canAccessMatingPair(Number(id)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const data = weaningSchema.parse(body);

    const litter = await prisma.litter.findUnique({
      where: { id: Number(litterId) },
      include: {
        matingPair: {
          include: {
            male: { include: { strain: true, substrain: true, genotypingRecords: true } },
            female: { include: { strain: true, substrain: true, genotypingRecords: true } },
          },
        },
      },
    });
    if (!litter) return NextResponse.json({ error: 'Litter not found' }, { status: 404 });

    const maleStrain = litter.matingPair.male.strain;
    const femaleStrain = litter.matingPair.female.strain;

    let strainId: number;
    let strainName: string;
    if (maleStrain.id === femaleStrain.id) {
      strainId = maleStrain.id;
      strainName = maleStrain.name;
    } else if (isBackgroundStrainOf(maleStrain, femaleStrain)) {
      strainId = femaleStrain.id;
      strainName = femaleStrain.name;
    } else if (isBackgroundStrainOf(femaleStrain, maleStrain)) {
      strainId = maleStrain.id;
      strainName = maleStrain.name;
    } else {
      if (!data.strainId) {
        return NextResponse.json({ error: '系統を選択してください', needsStrainSelection: true, strains: [maleStrain, femaleStrain] }, { status: 400 });
      }
      const selectedStrain = await prisma.strain.findUnique({ where: { id: data.strainId } });
      if (!selectedStrain) return NextResponse.json({ error: '無効な系統IDです' }, { status: 400 });
      strainId = selectedStrain.id;
      strainName = selectedStrain.name;
    }

    const existingCount = await prisma.mouse.count({ where: { strainId } });

    // mut/mut × mut/mut の遺伝子を特定（同じtargetGeneで両親ともmut/mutの場合）
    const maleGenos = litter.matingPair.male.genotypingRecords;
    const femaleGenos = litter.matingPair.female.genotypingRecords;
    const autoGenotypeGenes: { targetGene: string }[] = [];
    for (const mg of maleGenos) {
      if (mg.pcrResult === 'mut/mut') {
        const fg = femaleGenos.find(f => f.targetGene === mg.targetGene && f.pcrResult === 'mut/mut');
        if (fg) autoGenotypeGenes.push({ targetGene: mg.targetGene });
      }
    }

    // Auto-derive substrainId using same logic as strain
    const maleSubId = litter.matingPair.male.substrainId ?? null;
    const femaleSubId = litter.matingPair.female.substrainId ?? null;
    let resolvedSubstrainId: number | null;
    if (maleStrain.id === femaleStrain.id) {
      if (maleSubId === femaleSubId) resolvedSubstrainId = maleSubId;
      else if (maleSubId && !femaleSubId) resolvedSubstrainId = maleSubId;
      else if (!maleSubId && femaleSubId) resolvedSubstrainId = femaleSubId;
      else resolvedSubstrainId = data.substrainId ?? maleSubId ?? null;
    } else if (isBackgroundStrainOf(maleStrain, femaleStrain)) {
      resolvedSubstrainId = femaleSubId;
    } else if (isBackgroundStrainOf(femaleStrain, maleStrain)) {
      resolvedSubstrainId = maleSubId;
    } else {
      resolvedSubstrainId = data.substrainId ?? null;
    }

    const mice = [];
    const fatherId = Number(litter.matingPair.maleId);
    const motherId = Number(litter.matingPair.femaleId);
    const litterBirthDate = litter.birthDate ? new Date(litter.birthDate) : null;
    const substrainId = resolvedSubstrainId;

    for (let i = 0; i < data.pups.length; i++) {
      const mouseCode = generateMouseCode(strainName, existingCount + i + 1);
      const mouse = await prisma.mouse.create({
        data: {
          mouseCode,
          sex: data.pups[i].sex,
          birthDate: litterBirthDate,
          strainId,
          substrainId,
          fatherId,
          motherId,
          litterId: litter.id,
          status: 'alive',
          createdBy,
        },
      });
      // 両親ともmut/mutの遺伝子について子のGenotypingRecordを自動作成
      for (const gene of autoGenotypeGenes) {
        await prisma.genotypingRecord.create({
          data: {
            mouseId: mouse.id,
            targetGene: gene.targetGene,
            pcrResult: 'mut/mut',
            genotypeLabel: 'mut/mut',
            createdBy,
          },
        });
      }
      mice.push(mouse);
    }

    await prisma.litter.update({
      where: { id: Number(litterId) },
      data: { weaningDate: new Date(data.weaningDate) },
    });

    return NextResponse.json(mice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 400 });
  }
}
