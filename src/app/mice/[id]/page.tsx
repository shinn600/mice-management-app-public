'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { SEX_LABELS, STATUS_LABELS, STATUS_COLORS, GENOTYPE_COLORS, IDENTIFICATION_METHODS, EAR_PUNCH_POSITIONS, PCR_RESULTS } from '@/lib/constants';
import { formatDate, todayString } from '@/lib/date-utils';
import QRCode from 'react-qr-code';
import PedigreeTree from '@/components/PedigreeTree';
import { mouseUrl, formatIdMethod } from '@/lib/utils';

export default function MouseDetailPage() {
  const { t, locale } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const [mouse, setMouse] = useState<any>(null);
  const [showGenotypingForm, setShowGenotypingForm] = useState(false);
  const [genoForm, setGenoForm] = useState({ targetGene: '', pcrResult: 'wt/wt', testedDate: todayString(), identificationMethod: '', identificationDetail: '', identificationNote: '' });
  const [editingGenoId, setEditingGenoId] = useState<number | null>(null);
  const [editGenoForm, setEditGenoForm] = useState({ targetGene: '', pcrResult: 'wt/wt', testedDate: '', note: '', identificationMethod: '', identificationDetail: '' });

  const [baseUrl, setBaseUrl] = useState('');

  const fetchMouse = async () => {
    const res = await fetch(`/api/mice/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMouse(data);
      setGenoForm(prev => prev.targetGene === '' ? { ...prev, targetGene: data.strain?.name || '' } : prev);
    }
  };

  useEffect(() => {
    fetchMouse();
    fetch('/api/settings').then(r => r.json()).then(data => {
      setBaseUrl(data.baseUrl || window.location.origin);
    });
  }, [id]);

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

  const handleAddGenotyping = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/genotyping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mouseId: mouse.id,
        targetGene: genoForm.targetGene,
        pcrResult: genoForm.pcrResult,
        testedDate: genoForm.testedDate || null,
        note: genoForm.identificationNote.trim() || null,
      }),
    });
    // Update mouse identificationMethod/Detail if provided
    if (genoForm.identificationMethod) {
      const updateData: any = { identificationMethod: genoForm.identificationMethod };
      if (genoForm.identificationDetail) updateData.identificationDetail = genoForm.identificationDetail;
      await fetch(`/api/mice/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    }
    setShowGenotypingForm(false);
    setGenoForm({ targetGene: mouse?.strain?.name || '', pcrResult: 'wt/wt', testedDate: todayString(), identificationMethod: '', identificationDetail: '', identificationNote: '' });
    fetchMouse();
  };

  const handleDeleteGenotyping = async (recordId: number) => {
    if (!confirm(t('genotyping.confirmDelete'))) return;
    await fetch(`/api/genotyping/${recordId}`, { method: 'DELETE' });
    fetchMouse();
  };

  const handleEditGenotyping = (r: any) => {
    setEditingGenoId(r.id);
    setEditGenoForm({
      targetGene: r.targetGene,
      pcrResult: r.pcrResult,
      testedDate: r.testedDate ? r.testedDate.slice(0, 10) : '',
      note: r.note || '',
      identificationMethod: mouse.identificationMethod || '',
      identificationDetail: mouse.identificationDetail || '',
    });
  };

  const handleUpdateGenotyping = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/genotyping/${editingGenoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetGene: editGenoForm.targetGene,
        pcrResult: editGenoForm.pcrResult,
        testedDate: editGenoForm.testedDate,
        note: editGenoForm.note,
      }),
    });
    // Update identificationMethod/Detail on mouse if changed
    await fetch(`/api/mice/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identificationMethod: editGenoForm.identificationMethod || null,
        identificationDetail: editGenoForm.identificationDetail || null,
      }),
    });
    setEditingGenoId(null);
    fetchMouse();
  };


  const handleMarkDead = async () => {
    if (!confirm('このマウスを死亡として記録しますか？')) return;
    await fetch(`/api/mice/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dead' }),
    });
    fetchMouse();
  };

  if (!mouse) return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;

  const children = [...(mouse.childrenAsFather || []), ...(mouse.childrenAsMother || [])];
  const matingPairs = [
    ...(mouse.matingPairsAsMale || []).map((pair: any) => ({ pair, partner: pair.female })),
    ...(mouse.matingPairsAsFemale || []).map((pair: any) => ({ pair, partner: pair.male })),
  ].sort((a, b) => new Date(b.pair.startDate).getTime() - new Date(a.pair.startDate).getTime());

  return (
    <div>
      {/* 印刷CSSは globals.css の @media print に一元化（個体一覧ページと共通）
          ※以前はこのページだけ html/body・main の margin/padding リセットが抜けていた */}
      <div className="print:hidden">
      <PageHeader
        title={`${t('mice.title')}: ${mouse.mouseCode}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.push('/mice')} className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">{t('common.backToList')}</button>
            <button onClick={printTags} className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
              {locale === 'ja' ? 'タグ印刷' : 'Print Tags'}
            </button>
            {mouse.status !== 'dead' && (
              <button onClick={handleMarkDead} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">{t('mice.markDead')}</button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{t('mice.basicInfo')}</h2>
              <Link href={`/mice/${id}/edit`} className="text-sm text-indigo-600 hover:underline">{t('common.edit')}</Link>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-slate-500">{t('mice.mouseCode')}</dt><dd className="font-medium">{mouse.mouseCode}</dd></div>
              <div><dt className="text-slate-500">{t('mice.sex')}</dt><dd>{SEX_LABELS[mouse.sex]}</dd></div>
              <div><dt className="text-slate-500">{t('mice.strain')}</dt><dd className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: mouse.strain.color }} />{mouse.strain.name}</dd></div>
              {mouse.substrain && <div><dt className="text-slate-500">{t('strains.substrain')}</dt><dd>#{mouse.substrain.number}</dd></div>}
              <div><dt className="text-slate-500">{t('mice.birthDate')}</dt><dd>{formatDate(mouse.birthDate)}</dd></div>
              <div><dt className="text-slate-500">{t('mice.status')}</dt><dd><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: STATUS_COLORS[mouse.status]?.bg, color: STATUS_COLORS[mouse.status]?.text }}>{STATUS_LABELS[mouse.status]?.[locale]}</span></dd></div>
              <div><dt className="text-slate-500">{t('mice.cage')}</dt><dd>{mouse.cage?.cageCode || '-'}</dd></div>
              {mouse.createdBy && <div><dt className="text-slate-500">登録者</dt><dd>{mouse.createdBy}</dd></div>}
            </dl>
            {mouse.note && <div className="mt-4 text-sm"><span className="text-slate-500">{t('common.memo')}: </span>{mouse.note}</div>}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{t('genotyping.title')}</h2>
              <button onClick={() => setShowGenotypingForm(!showGenotypingForm)} className="text-sm text-indigo-600 hover:underline">+ {t('genotyping.add')}</button>
            </div>
            {showGenotypingForm && (
              <form onSubmit={handleAddGenotyping} className="mb-4 p-4 bg-slate-50 rounded-lg grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('genotyping.gene')} *</label>
                  <input value={genoForm.targetGene} onChange={e => setGenoForm({...genoForm, targetGene: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('genotyping.genotype')} *</label>
                  <select value={genoForm.pcrResult} onChange={e => setGenoForm({...genoForm, pcrResult: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {PCR_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('genotyping.testDate')}</label>
                  <input type="date" value={genoForm.testedDate} onChange={e => setGenoForm({...genoForm, testedDate: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('mice.idMethod')}</label>
                  <select value={genoForm.identificationMethod} onChange={e => setGenoForm({...genoForm, identificationMethod: e.target.value, identificationDetail: ''})} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">{t('common.none')}</option>
                    <option value="ear_punch">{t('id.ear_punch')}</option>
                    <option value="tail_cut">{locale === 'ja' ? '尻尾カット' : 'Tail Cut'}</option>
                    <option value="finger_cut">{t('id.finger_cut')}</option>
                    <option value="other">{t('id.other')}</option>
                  </select>
                </div>
                {genoForm.identificationMethod === 'ear_punch' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{locale === 'ja' ? 'パンチ位置' : 'Punch Position'}</label>
                    <select value={genoForm.identificationDetail} onChange={e => setGenoForm({...genoForm, identificationDetail: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">{t('common.none')}</option>
                      {EAR_PUNCH_POSITIONS.map(p => <option key={p.value} value={p.value}>{locale === 'ja' ? p.ja : p.en}</option>)}
                    </select>
                  </div>
                )}
                {genoForm.identificationMethod === 'finger_cut' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{locale === 'ja' ? '指番号' : 'Finger Number'}</label>
                    <input type="number" min="1" max="20" value={genoForm.identificationDetail} onChange={e => setGenoForm({...genoForm, identificationDetail: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">{t('mice.idNote')}</label>
                  <input value={genoForm.identificationNote} onChange={e => setGenoForm({...genoForm, identificationNote: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">{t('genotyping.add')}</button>
                  <button type="button" onClick={() => setShowGenotypingForm(false)} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button>
                </div>
              </form>
            )}
            {mouse.genotypingRecords.length > 0 ? (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="text-left px-3 py-2 whitespace-nowrap">{t('genotyping.gene')}</th><th className="text-left px-3 py-2 whitespace-nowrap">{t('genotyping.genotype')}</th><th className="text-left px-3 py-2 whitespace-nowrap">{t('genotyping.testDate')}</th><th className="text-left px-3 py-2 whitespace-nowrap">{t('mice.idMethod')}</th><th className="text-left px-3 py-2 whitespace-nowrap">{t('mice.idNote')}</th><th className="text-left px-3 py-2 whitespace-nowrap">登録者</th><th className="px-3 py-2"></th></tr></thead>
                <tbody>
                  {mouse.genotypingRecords.map((r: any) => (
                    editingGenoId === r.id ? (
                      <tr key={r.id} className="border-t bg-indigo-50">
                        <td colSpan={7} className="px-3 py-2">
                          <form onSubmit={handleUpdateGenotyping} className="flex flex-wrap gap-2 items-end">
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('genotyping.gene')}</label>
                              <input value={editGenoForm.targetGene} onChange={e => setEditGenoForm({...editGenoForm, targetGene: e.target.value})} required className="border rounded px-2 py-1 text-xs w-32" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('genotyping.genotype')}</label>
                              <select value={editGenoForm.pcrResult} onChange={e => setEditGenoForm({...editGenoForm, pcrResult: e.target.value})} className="border rounded px-2 py-1 text-xs bg-white">
                                {PCR_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('genotyping.testDate')}</label>
                              <input type="date" value={editGenoForm.testedDate} onChange={e => setEditGenoForm({...editGenoForm, testedDate: e.target.value})} className="border rounded px-2 py-1 text-xs" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('mice.idMethod')}</label>
                              <select value={editGenoForm.identificationMethod} onChange={e => setEditGenoForm({...editGenoForm, identificationMethod: e.target.value, identificationDetail: ''})} className="border rounded px-2 py-1 text-xs bg-white">
                                <option value="">{t('common.none')}</option>
                                {Object.entries(IDENTIFICATION_METHODS).map(([k, v]) => <option key={k} value={k}>{locale === 'ja' ? v.ja : v.en}</option>)}
                              </select>
                            </div>
                            {editGenoForm.identificationMethod === 'ear_punch' && (
                              <div>
                                <label className="block text-xs font-medium mb-1">{locale === 'ja' ? 'パンチ位置' : 'Position'}</label>
                                <select value={editGenoForm.identificationDetail} onChange={e => setEditGenoForm({...editGenoForm, identificationDetail: e.target.value})} className="border rounded px-2 py-1 text-xs bg-white">
                                  <option value=""></option>
                                  {EAR_PUNCH_POSITIONS.map(p => <option key={p.value} value={p.value}>{locale === 'ja' ? p.ja : p.en}</option>)}
                                </select>
                              </div>
                            )}
                            {editGenoForm.identificationMethod === 'finger_cut' && (
                              <div>
                                <label className="block text-xs font-medium mb-1">{locale === 'ja' ? '指番号' : 'Toe #'}</label>
                                <input type="number" min="1" max="20" value={editGenoForm.identificationDetail} onChange={e => setEditGenoForm({...editGenoForm, identificationDetail: e.target.value})} className="border rounded px-2 py-1 text-xs w-16" />
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('mice.idNote')}</label>
                              <input value={editGenoForm.note} onChange={e => setEditGenoForm({...editGenoForm, note: e.target.value})} className="border rounded px-2 py-1 text-xs w-32" />
                            </div>
                            <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-xs">{t('common.save')}</button>
                            <button type="button" onClick={() => setEditingGenoId(null)} className="px-3 py-1 bg-gray-200 rounded text-xs">{t('common.cancel')}</button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">{r.targetGene}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: GENOTYPE_COLORS[r.genotypeLabel]?.bg, color: GENOTYPE_COLORS[r.genotypeLabel]?.text }}>{r.genotypeLabel}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.testedDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatIdMethod(mouse.identificationMethod, mouse.identificationDetail, locale)}</td>
                      <td className="px-3 py-2 text-slate-500">{r.note || '-'}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.createdBy || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button onClick={() => handleEditGenotyping(r)} className="text-indigo-500 text-xs hover:underline mr-2">{t('common.edit')}</button>
                        <button onClick={() => handleDeleteGenotyping(r.id)} className="text-red-500 text-xs hover:underline">{t('common.delete')}</button>
                      </td>
                    </tr>
                    )
                  ))}
                </tbody>
              </table>
              </div>
            ) : <p className="text-sm text-slate-400">{t('genotyping.noRecords')}</p>}
          </div>

          {mouse.complianceUsages && mouse.complianceUsages.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="font-semibold mb-4">{t('mice.experimentUsage')}</h2>
              {mouse.complianceUsages.map((u: any) => (
                <div key={u.id} className="text-sm border-b py-2 last:border-0">
                  <div className="font-medium">{u.experimentApproval.approvalNumber}</div>
                  <div className="text-slate-500">{formatDate(u.usageDate)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-semibold mb-4 text-lg">{t('pedigree.title')}</h2>
            <PedigreeTree mouseId={mouse.id} />
            {children.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-slate-500">{t('mice.children')}:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {children.map((c: any) => (
                    <Link key={c.id} href={mouseUrl(c.mouseCode)} className="text-sm text-indigo-600 hover:underline">{c.mouseCode} ({SEX_LABELS[c.sex]})</Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="font-semibold mb-4 text-lg">{t('mice.matingInfo')}</h2>
            {matingPairs.length > 0 ? (
              <div className="space-y-3">
                {matingPairs.map(({ pair, partner }) => (
                  <Link key={pair.id} href={`/breeding/${pair.id}`} className="block border rounded-lg p-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: partner.strain.color }} />
                        {t('breeding.partner')}: {partner.mouseCode}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pair.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {pair.isActive ? t('breeding.active') : t('breeding.ended')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t('breeding.startDate')}: {formatDate(pair.startDate)}
                      {pair.cage && ` ・ ${t('mice.cage')}: ${pair.cage.cageCode}`}
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">{t('mice.noMatingPairs')}</p>}
          </div>

          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
            <h2 className="font-semibold mb-4">{t('qr.title')}</h2>
            <QRCode value={`${baseUrl.replace(/\/$/, '')}${mouseUrl(mouse.mouseCode)}`} size={160} />
            <p className="mt-2 text-xs text-slate-500">{mouse.mouseCode}</p>
          </div>
        </div>
      </div>
      </div>{/* /print:hidden */}

      {/* タグカード（印刷用） */}
      <div className="hidden print:block">
        {/* 中央寄せは flex ではなく margin:auto で行う（flex の子孫だと Chromium の
            フラグメンテーションが不安定で、Android の印刷で空ページが出る） */}
        <div style={{ width: '20cm', margin: '0 auto' }}>
        <div className="border-2 border-black overflow-hidden flex" style={{ width: '6cm', height: '7.2cm', margin: '0 auto', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                        {mouse.genotypingRecords.map((r: any) => (
                          <span key={r.genotypeLabel} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium mr-1" style={{ backgroundColor: GENOTYPE_COLORS[r.genotypeLabel]?.bg, color: GENOTYPE_COLORS[r.genotypeLabel]?.text }}>{r.genotypeLabel}</span>
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
        </div>
      </div>
    </div>
  );
}
