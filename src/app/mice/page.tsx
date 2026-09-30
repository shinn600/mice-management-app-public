'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { SEX_LABELS, STATUS_LABELS, STATUS_COLORS, GENOTYPE_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/date-utils';
import { mouseUrl, formatIdMethod } from '@/lib/utils';

interface Mouse {
  id: number;
  mouseCode: string;
  sex: string;
  birthDate: string | null;
  status: string;
  note: string | null;
  identificationMethod: string | null;
  identificationDetail: string | null;
  strain: { id: number; name: string; color: string };
  substrain: { id: number; number: number; color: string } | null;
  cage: { cageCode: string } | null;
  genotypingRecords: { genotypeLabel: string; note: string | null }[];
}

interface Strain { id: number; name: string; }
interface Substrain { id: number; number: number; color: string; }

export default function MicePage() {
  const { t, locale } = useLanguage();
  const [mice, setMice] = useState<Mouse[]>([]);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [substrains, setSubstrains] = useState<Substrain[]>([]);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [filters, setFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      return {
        search: '',
        strainId: localStorage.getItem('filter.strainId') || '',
        substrainId: localStorage.getItem('filter.substrainId') || '',
        sex: localStorage.getItem('mice.sex') || '',
        status: localStorage.getItem('mice.status') || '',
      };
    }
    return { search: '', strainId: '', substrainId: '', sex: '', status: '' };
  });

  const fetchMice = async () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.strainId) params.set('strainId', filters.strainId);
    if (filters.substrainId) params.set('substrainId', filters.substrainId);
    if (filters.sex) params.set('sex', filters.sex);
    if (filters.status) params.set('status', filters.status);
    const res = await fetch(`/api/mice?${params}`);
    setMice(await res.json());
  };

  const fetchSubstrains = async (strainId: string) => {
    if (!strainId) { setSubstrains([]); return; }
    const res = await fetch(`/api/strains/${strainId}/substrains`);
    setSubstrains(await res.json());
  };

  useEffect(() => {
    fetch('/api/strains').then(r => r.json()).then(setStrains);
    fetch('/api/settings').then(r => r.json()).then(data => {
      setBaseUrl(data.baseUrl || window.location.origin);
    });
  }, []);

  useEffect(() => {
    const resetScroll = () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    };
    window.addEventListener('beforeprint', resetScroll);
    return () => window.removeEventListener('beforeprint', resetScroll);
  }, []);

  const printTags = () => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.print();
  };

  useEffect(() => {
    fetchMice();
    setCheckedIds([]);
  }, [filters]);

  const toggleCheck = (id: number) =>
    setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const allChecked = mice.length > 0 && mice.every(m => checkedIds.includes(m.id));
  const toggleAll = () => setCheckedIds(allChecked ? [] : mice.map(m => m.id));

  const checkedMice = mice.filter(m => checkedIds.includes(m.id));

  const handleBulkMarkDead = async () => {
    // 生存中・処置済の個体を死亡登録の対象とする
    const targets = checkedMice.filter(m => m.status === 'alive' || m.status === 'processed');
    if (targets.length === 0) return;
    const msg = locale === 'ja'
      ? `${targets.length}匹を死亡として記録しますか？`
      : `Mark ${targets.length} mice as dead?`;
    if (!confirm(msg)) return;
    await Promise.all(
      targets.map(m =>
        fetch(`/api/mice/${m.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'dead' }),
        })
      )
    );
    setCheckedIds([]);
    fetchMice();
  };


  return (
    <div>
      {/* 印刷CSSは globals.css の @media print に一元化（個体詳細ページと共通） */}
      <div className="print:hidden">
        <PageHeader
          title={t('mice.title')}
          description={t('mice.description')}
          action={
            <div className="flex gap-2 items-center">
              {checkedIds.length > 0 ? (
                <button
                  onClick={printTags}
                  className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  {`${locale === 'ja' ? 'タグ印刷' : 'Print Tags'} (${checkedIds.length})`}
                </button>
              ) : (
                <span className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-400 rounded-lg text-sm cursor-not-allowed select-none">
                  {locale === 'ja' ? 'タグ印刷' : 'Print Tags'}
                </span>
              )}
              {checkedIds.length > 0 ? (
                <button
                  onClick={handleBulkMarkDead}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  {t('mice.markDead')} ({checkedIds.filter(id => { const s = mice.find(m => m.id === id)?.status; return s === 'alive' || s === 'processed'; }).length})
                </button>
              ) : (
                <span className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-400 rounded-lg text-sm cursor-not-allowed select-none">
                  {t('mice.markDead')}
                </span>
              )}
              <Link href="/mice/bulk" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{locale === 'ja' ? '+ 個体登録' : '+ Register'}</Link>
              <Link href={`/genotyping/bulk${checkedIds.length > 0 ? '?ids=' + checkedIds.join(',') : ''}`} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">{locale === 'ja' ? 'ジェノタイピング一括' : 'Bulk Genotyping'}{checkedIds.length > 0 ? ` (${checkedIds.length})` : ''}</Link>
            </div>
          }
        />

        <div className="bg-white p-4 rounded-lg shadow mb-4 flex gap-4 flex-wrap">
          <input
            placeholder={t('mice.searchById')}
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
            className="border rounded-lg px-3 py-2 text-sm w-48"
          />
          <select value={filters.strainId} onChange={e => { const v = e.target.value; setFilters({...filters, strainId: v, substrainId: ''}); localStorage.setItem('filter.strainId', v); localStorage.setItem('filter.substrainId', ''); fetchSubstrains(v); }} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">{t('mice.allStrains')}</option>
            {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {substrains.length > 0 && (
            <select value={filters.substrainId} onChange={e => { setFilters({...filters, substrainId: e.target.value}); localStorage.setItem('filter.substrainId', e.target.value); }} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">全サブ系統</option>
              {substrains.map(ss => <option key={ss.id} value={ss.id}>サブ系統 #{ss.number}</option>)}
            </select>
          )}
          <select value={filters.sex} onChange={e => { setFilters({...filters, sex: e.target.value}); localStorage.setItem('mice.sex', e.target.value); }} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">{t('mice.allSex')}</option>
            <option value="M">{t('mice.male')}</option>
            <option value="F">{t('mice.female')}</option>
          </select>
          <select value={filters.status} onChange={e => { setFilters({...filters, status: e.target.value}); localStorage.setItem('mice.status', e.target.value); }} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">{t('mice.allStatus')}</option>
            <option value="alive">{t('status.alive')}</option>
            <option value="dead">{t('status.dead')}</option>
            <option value="processed">{t('status.processed')}</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.mouseCode')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.sex')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.strain')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('strains.substrain')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.birthDate')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.status')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.cage')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.genotype')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('mice.idMethod')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('common.memo')}</th>
              </tr>
            </thead>
            <tbody>
              {mice.map(mouse => (
                <tr key={mouse.id} className={`border-b hover:bg-slate-50 ${checkedIds.includes(mouse.id) ? 'bg-indigo-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checkedIds.includes(mouse.id)}
                      onChange={() => toggleCheck(mouse.id)}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={mouseUrl(mouse.mouseCode)} className="text-indigo-600 hover:underline font-medium">{mouse.mouseCode}</Link>
                  </td>
                  <td className="px-4 py-3">{SEX_LABELS[mouse.sex] || mouse.sex}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap" style={{ backgroundColor: mouse.strain.color }}>{mouse.strain.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {mouse.substrain
                      ? <span className="px-1.5 py-0.5 rounded-full text-xs font-mono font-medium text-white" style={{ backgroundColor: mouse.substrain.color }}>#{mouse.substrain.number}</span>
                      : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3">{formatDate(mouse.birthDate)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: STATUS_COLORS[mouse.status]?.bg, color: STATUS_COLORS[mouse.status]?.text }}>{STATUS_LABELS[mouse.status]?.[locale] || mouse.status}</span>
                  </td>
                  <td className="px-4 py-3">{mouse.cage?.cageCode || '-'}</td>
                  <td className="px-4 py-3">{mouse.genotypingRecords.length > 0 ? mouse.genotypingRecords.map((g: any) => (
                    <span key={g.id || g.genotypeLabel} className="px-2 py-0.5 rounded-full text-xs font-medium mr-1" style={{ backgroundColor: GENOTYPE_COLORS[g.genotypeLabel]?.bg, color: GENOTYPE_COLORS[g.genotypeLabel]?.text }}>{g.genotypeLabel}</span>
                  )) : '-'}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{formatIdMethod(mouse.identificationMethod, mouse.identificationDetail, locale)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{mouse.note || '-'}</td>
                </tr>
              ))}
              {mice.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">{t('mice.noMice')}</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-500">{mice.length} 件{checkedIds.length > 0 && `　${checkedIds.length} 件選択中`}</div>
      </div>

      {/* タグカード（PDF出力用） */}
      <div className="hidden print:block">
        {checkedMice.length > 0 && Array.from({ length: Math.ceil(checkedMice.length / 9) }, (_, pageIdx) => {
          const pageMice = checkedMice.slice(pageIdx * 9, pageIdx * 9 + 9);
          const isLast = pageIdx === Math.ceil(checkedMice.length / 9) - 1;
          return (
            <div key={pageIdx} data-tag-page style={{ pageBreakAfter: isLast ? 'auto' : 'always', breakAfter: isLast ? 'auto' : 'page' }}>
              {/* 列幅・全体幅は cm で固定する（1fr / maxWidth だとレイアウトビューポート幅に依存し、
                  Chrome for Android の印刷ではモバイル幅で計算されてタグがはみ出す・消える）。
                  3列×6cm ＋ 隙間2箇所×1cm = 20cm = A4(210mm) − 左右マージン5mm×2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 6cm)', gap: '1cm', justifyContent: 'center', width: '20cm', margin: '0 auto' }}>
                {pageMice.map(mouse => (
                  <div key={mouse.id} data-mouse-id={mouse.id} className="border-2 border-black overflow-hidden flex" style={{ width: '6cm', height: '7.2cm', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div style={{ width: '4mm', flexShrink: 0, backgroundColor: mouse.strain.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="border-b border-gray-300" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: '4mm auto' }}>
                        <div style={{ gridColumn: 1, gridRow: 1, marginRight: '6px', backgroundColor: mouse.strain.color }} />
                        <div style={{ gridColumn: 2, gridRow: '1 / span 2', display: 'flex', alignItems: 'flex-start', padding: '4px 8px 4px 4px' }}>
                          <div style={{ backgroundColor: '#ffffff', padding: '3px', borderRadius: '3px' }}>
                            <QRCode value={`${baseUrl.replace(/\/$/, '')}${mouseUrl(mouse.mouseCode)}`} size={46} bgColor="#ffffff" fgColor="#000000" />
                          </div>
                        </div>
                        <div style={{ gridColumn: 1, gridRow: 2, padding: '4px 8px' }}>
                          <h3 className="text-sm font-bold text-gray-900">{mouse.mouseCode}</h3>
                          <p className="text-[10px] text-gray-600">{mouse.strain.name}{mouse.substrain != null && `. #${mouse.substrain.number}`}</p>
                        </div>
                      </div>
                      <div className="p-2">
                        <table className="w-full text-xs">
                          <tbody>
                            <tr><td className="py-0.5 text-gray-500">{t('mice.sex')}</td><td className="py-0.5">{SEX_LABELS[mouse.sex]}</td></tr>
                            <tr><td className="py-0.5 text-gray-500">{t('mice.birthDate')}</td><td className="py-0.5">{formatDate(mouse.birthDate)}</td></tr>
                            {mouse.genotypingRecords.length > 0 && (
                              <tr>
                                <td className="py-0.5 text-gray-500">{t('mice.genotype')}</td>
                                <td className="py-0.5">
                                  {mouse.genotypingRecords.map((g: any) => (
                                    <span key={g.genotypeLabel} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium mr-1" style={{ backgroundColor: GENOTYPE_COLORS[g.genotypeLabel]?.bg, color: GENOTYPE_COLORS[g.genotypeLabel]?.text }}>{g.genotypeLabel}</span>
                                  ))}
                                </td>
                              </tr>
                            )}
                            {mouse.identificationMethod && (
                              <tr><td className="py-0.5 text-gray-500">{t('mice.idMethod')}</td><td className="py-0.5">{formatIdMethod(mouse.identificationMethod, mouse.identificationDetail, locale)}</td></tr>
                            )}
                            {mouse.genotypingRecords.some((r: any) => r.note) && (
                              <tr><td className="py-0.5 text-gray-500">{t('mice.idNote')}</td><td className="py-0.5">{mouse.genotypingRecords.filter((r: any) => r.note).map((r: any) => r.note).join(', ')}</td></tr>
                            )}
                            {mouse.note && (
                              <tr><td className="py-0.5 text-gray-500">{t('common.memo')}</td><td className="py-0.5">{mouse.note}</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
