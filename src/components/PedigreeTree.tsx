'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageContext';
import { GENOTYPE_COLORS } from '@/lib/constants';
import { mouseUrl } from '@/lib/utils';

interface PedigreeNode {
  id: number;
  mouseCode: string;
  sex: string;
  strain: { name: string; color: string };
  substrain: { number: number; color: string } | null;
  genotype: string | null;
  father: PedigreeNode | null;
  mother: PedigreeNode | null;
}

function AncestorCard({ node, isRoot }: { node: PedigreeNode; isRoot?: boolean }) {
  const sexIcon = node.sex === 'M' ? '♂' : '♀';
  const borderColor = node.sex === 'M' ? 'border-blue-300' : 'border-pink-300';
  const bgColor = isRoot ? 'bg-indigo-50' : 'bg-white';

  return (
    <Link
      href={mouseUrl(node.mouseCode)}
      className={`block px-2 py-1.5 rounded border-2 ${borderColor} ${bgColor} hover:shadow-md transition-shadow text-center min-w-[80px]`}
    >
      <div className="text-xs font-bold">{sexIcon} {node.mouseCode}</div>
      <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: node.strain.color }}>
          {node.strain.name}
        </span>
        {node.substrain != null && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium text-white" style={{ backgroundColor: node.substrain.color }}>
            #{node.substrain.number}
          </span>
        )}
      </div>
      {node.genotype && (
        <div className="mt-0.5">
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium" style={{ backgroundColor: GENOTYPE_COLORS[node.genotype]?.bg, color: GENOTYPE_COLORS[node.genotype]?.text }}>{node.genotype}</span>
        </div>
      )}
    </Link>
  );
}

function PedigreeLevel({ node, depth, isRoot }: { node: PedigreeNode | null; depth: number; isRoot?: boolean }) {
  if (!node) return <div className="flex items-center justify-center min-w-[80px] px-2 py-1.5 rounded border-2 border-dashed border-gray-200 text-[10px] text-gray-400">?</div>;
  if (depth <= 0) return <AncestorCard node={node} isRoot={isRoot} />;

  return (
    <div className="flex items-center gap-2">
      <AncestorCard node={node} isRoot={isRoot} />
      {(node.father || node.mother) && (
        <>
          <div className="w-4 border-t border-gray-300" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <div className="w-3 border-t border-gray-300" />
              <PedigreeLevel node={node.father} depth={depth - 1} />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 border-t border-gray-300" />
              <PedigreeLevel node={node.mother} depth={depth - 1} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function PedigreeTree({ mouseId }: { mouseId: number }) {
  const { t } = useLanguage();
  const [pedigree, setPedigree] = useState<PedigreeNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/mice/${mouseId}/pedigree`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPedigree(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [mouseId]);

  if (loading) return <div className="text-sm text-slate-400">{t('common.loading')}</div>;
  if (!pedigree) return <div className="text-sm text-slate-400">{t('pedigree.noAncestors')}</div>;

  const hasAncestors = pedigree.father || pedigree.mother;
  if (!hasAncestors) return <div className="text-sm text-slate-400">{t('pedigree.noAncestors')}</div>;

  return (
    <div className="overflow-x-auto pb-2">
      <PedigreeLevel node={pedigree} depth={3} isRoot />
    </div>
  );
}
