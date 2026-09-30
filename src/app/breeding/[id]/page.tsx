'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { formatDate, calcExpectedBirthDate, calcWeaningDate, todayString } from '@/lib/date-utils';
import { SEX_LABELS } from '@/lib/constants';
import { mouseUrl, isBackgroundStrainOf } from '@/lib/utils';
import { useLanguage } from '@/components/LanguageContext';

export default function BreedingDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const [pair, setPair] = useState<any>(null);
  const [allMice, setAllMice] = useState<{ id: number; mouseCode: string; sex: string }[]>([]);
  const [cages, setCages] = useState<{ id: number; cageCode: string; maxCapacity: number; _count: { mice: number } }[]>([]);

  // Plug form
  const [showPlugForm, setShowPlugForm] = useState(false);
  const [plugForm, setPlugForm] = useState({ checkDate: todayString(), plugFound: true, note: '' });

  // Litter form
  const [showLitterForm, setShowLitterForm] = useState(false);
  const [litterForm, setLitterForm] = useState({ birthDate: todayString(), pupCount: 1, note: '' });

  // Wean form
  const [showWeanForm, setShowWeanForm] = useState<number | null>(null);
  const [weanForm, setWeanForm] = useState({ weaningDate: todayString(), pups: [{ sex: 'M' }] as { sex: string }[] });
  const [weanStrainId, setWeanStrainId] = useState<number | null>(null);
  const [weanStrainCandidates, setWeanStrainCandidates] = useState<{ id: number; name: string }[]>([]);
  const [weanSubstrains, setWeanSubstrains] = useState<{ id: number; number: number }[]>([]);
  const [weanSubstrainId, setWeanSubstrainId] = useState<number | null>(null);

  // Pair info edit
  const [showPairEdit, setShowPairEdit] = useState(false);
  const [pairEditForm, setPairEditForm] = useState({ startDate: '', note: '', maleId: '', femaleId: '', cageId: '' });

  // Litter edit
  const [editingLitterId, setEditingLitterId] = useState<number | null>(null);
  const [litterEditForm, setLitterEditForm] = useState({ birthDate: '', pupCount: 1, note: '' });

  const fetchPair = async () => {
    const res = await fetch(`/api/breeding/${id}`);
    if (res.ok) setPair(await res.json());
  };

  useEffect(() => {
    fetchPair();
    fetch('/api/mice').then(r => r.json()).then(setAllMice);
    fetch('/api/cages').then(r => r.json()).then(setCages);
  }, [id]);

  const handlePlugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/breeding/${id}/plug-checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plugForm),
    });
    setShowPlugForm(false);
    setPlugForm({ checkDate: todayString(), plugFound: true, note: '' });
    fetchPair();
  };

  const handleDeletePlug = async (checkId: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    await fetch(`/api/breeding/${id}/plug-checks/${checkId}`, { method: 'DELETE' });
    fetchPair();
  };

  const handleLitterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/breeding/${id}/litters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...litterForm, pupCount: Number(litterForm.pupCount) }),
    });
    setShowLitterForm(false);
    setLitterForm({ birthDate: todayString(), pupCount: 1, note: '' });
    fetchPair();
  };

  const resolveWeanStrain = () => {
    if (!pair) return null;
    const ms = pair.male.strain;
    const fs = pair.female.strain;
    if (ms.id === fs.id) return { strainId: ms.id as number | null, needsPick: false };
    if (isBackgroundStrainOf(ms, fs)) return { strainId: fs.id as number | null, needsPick: false };
    if (isBackgroundStrainOf(fs, ms)) return { strainId: ms.id as number | null, needsPick: false };
    return { strainId: null, needsPick: true, strains: [ms, fs] as { id: number; name: string }[] };
  };

  const handleOpenWeanForm = async (litter: any) => {
    const info = resolveWeanStrain();
    let resolvedStrainId: number | null = null;
    if (info?.needsPick) {
      setWeanStrainCandidates(info.strains!);
      resolvedStrainId = info.strains![0].id;
      setWeanStrainId(resolvedStrainId);
    } else {
      setWeanStrainCandidates([]);
      resolvedStrainId = info?.strainId ?? null;
      setWeanStrainId(resolvedStrainId);
    }

    // Auto-resolve substrain using same logic
    const ms = pair.male.strain;
    const fs = pair.female.strain;
    const msub = (pair.male as any).substrain;
    const fsub = (pair.female as any).substrain;
    let autoSubId: number | null = null;
    if (ms.id === fs.id) {
      if (msub && fsub && msub.id === fsub.id) autoSubId = msub.id;
      else if (msub && !fsub) autoSubId = msub.id;
      else if (!msub && fsub) autoSubId = fsub.id;
    } else if (isBackgroundStrainOf(ms, fs)) {
      autoSubId = fsub?.id ?? null;
    } else if (isBackgroundStrainOf(fs, ms)) {
      autoSubId = msub?.id ?? null;
    }

    // Load substrains for the resolved strain
    if (resolvedStrainId) {
      const res = await fetch(`/api/strains/${resolvedStrainId}/substrains`);
      const subs = await res.json();
      setWeanSubstrains(subs);
      setWeanSubstrainId(autoSubId);
    } else {
      setWeanSubstrains([]);
      setWeanSubstrainId(null);
    }

    setShowWeanForm(litter.id);
    setWeanForm({ weaningDate: todayString(), pups: Array.from({ length: litter.pupCount }, () => ({ sex: 'M' })) });
  };

  const handleWeanSubmit = async (e: React.FormEvent, litterId: number) => {
    e.preventDefault();
    const body: any = { ...weanForm };
    if (weanStrainId) body.strainId = weanStrainId;
    if (weanSubstrainId) body.substrainId = weanSubstrainId;
    await fetch(`/api/breeding/${id}/litters/${litterId}/wean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setShowWeanForm(null);
    setWeanForm({ weaningDate: todayString(), pups: [{ sex: 'M' }] });
    setWeanStrainId(null);
    setWeanStrainCandidates([]);
    setWeanSubstrains([]);
    setWeanSubstrainId(null);
    fetchPair();
  };

  const handleEndPair = async () => {
    if (!confirm(t('breeding.confirmEnd'))) return;
    await fetch(`/api/breeding/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false, endDate: new Date().toISOString() }),
    });
    fetchPair();
  };

  const handleOpenPairEdit = () => {
    setPairEditForm({
      startDate: pair.startDate ? pair.startDate.slice(0, 10) : '',
      note: pair.note || '',
      maleId: String(pair.maleId),
      femaleId: String(pair.femaleId),
      cageId: pair.cageId ? String(pair.cageId) : '',
    });
    setShowPairEdit(true);
  };

  const handlePairEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/breeding/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: pairEditForm.startDate,
        note: pairEditForm.note || null,
        maleId: Number(pairEditForm.maleId),
        femaleId: Number(pairEditForm.femaleId),
        cageId: pairEditForm.cageId ? Number(pairEditForm.cageId) : null,
      }),
    });
    setShowPairEdit(false);
    fetchPair();
  };

  const handleOpenLitterEdit = (litter: any) => {
    setEditingLitterId(litter.id);
    setLitterEditForm({
      birthDate: litter.birthDate ? litter.birthDate.slice(0, 10) : '',
      pupCount: litter.pupCount,
      note: litter.note || '',
    });
  };

  const handleLitterEditSubmit = async (e: React.FormEvent, litterId: number) => {
    e.preventDefault();
    await fetch(`/api/breeding/${id}/litters/${litterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...litterEditForm, pupCount: Number(litterEditForm.pupCount) }),
    });
    setEditingLitterId(null);
    fetchPair();
  };

  if (!pair) return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;

  return (
    <div>
      <PageHeader
        title={`交配ペア: ♂${pair.male.mouseCode} x ♀${pair.female.mouseCode}`}
        action={pair.isActive ? <button onClick={handleEndPair} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">{t('breeding.endPair')}</button> : null}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t('breeding.basicInfo')}</h2>
            <button onClick={handleOpenPairEdit} className="text-sm text-indigo-600 hover:underline">{t('common.edit')}</button>
          </div>
          {showPairEdit ? (
            <form onSubmit={handlePairEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('breeding.male')} ♂</label>
                <select value={pairEditForm.maleId} onChange={e => setPairEditForm({...pairEditForm, maleId: e.target.value})} required className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                  {allMice.filter(m => m.sex === 'M').map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('breeding.female')} ♀</label>
                <select value={pairEditForm.femaleId} onChange={e => setPairEditForm({...pairEditForm, femaleId: e.target.value})} required className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                  {allMice.filter(m => m.sex === 'F').map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('breeding.startDate')}</label>
                <input type="date" value={pairEditForm.startDate} onChange={e => setPairEditForm({...pairEditForm, startDate: e.target.value})} required className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('mice.cage')}</label>
                <select value={pairEditForm.cageId} onChange={e => setPairEditForm({...pairEditForm, cageId: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                  <option value="">{t('common.unassigned')}</option>
                  {cages.map(c => <option key={c.id} value={c.id}>{c.cageCode} ({c._count.mice}/{c.maxCapacity})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('common.memo')}</label>
                <input value={pairEditForm.note} onChange={e => setPairEditForm({...pairEditForm, note: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{t('common.save')}</button>
                <button type="button" onClick={() => setShowPairEdit(false)} className="px-3 py-1 bg-gray-200 rounded text-sm">{t('common.cancel')}</button>
              </div>
            </form>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">{t('breeding.male')}</dt><dd><Link href={mouseUrl(pair.male.mouseCode)} className="text-indigo-600 hover:underline">{pair.male.mouseCode}</Link> ({pair.male.strain.name})</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('breeding.female')}</dt><dd><Link href={mouseUrl(pair.female.mouseCode)} className="text-indigo-600 hover:underline">{pair.female.mouseCode}</Link> ({pair.female.strain.name})</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('breeding.startDate')}</dt><dd>{formatDate(pair.startDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">{t('mice.status')}</dt><dd><span className={`px-2 py-0.5 rounded-full text-xs ${pair.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{pair.isActive ? t('breeding.active') : t('breeding.ended')}</span></dd></div>
              {pair.cage && <div className="flex justify-between"><dt className="text-slate-500">{t('mice.cage')}</dt><dd>{pair.cage.cageCode}</dd></div>}
              {pair.note && <div className="flex justify-between"><dt className="text-slate-500">{t('common.memo')}</dt><dd>{pair.note}</dd></div>}
              {pair.createdBy && <div className="flex justify-between"><dt className="text-slate-500">登録者</dt><dd>{pair.createdBy}</dd></div>}
            </dl>
          )}
        </div>

        {/* Plug checks */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t('breeding.plugHistory')}</h2>
            {pair.isActive && <button onClick={() => setShowPlugForm(!showPlugForm)} className="text-sm text-indigo-600 hover:underline">{t('breeding.addPlug')}</button>}
          </div>
          {showPlugForm && (
            <form onSubmit={handlePlugSubmit} className="mb-4 p-3 bg-slate-50 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">{t('breeding.checkDate')} *</label>
                  <input type="date" value={plugForm.checkDate} onChange={e => setPlugForm({...plugForm, checkDate: e.target.value})} required className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{t('breeding.plug')}</label>
                  <select value={String(plugForm.plugFound)} onChange={e => setPlugForm({...plugForm, plugFound: e.target.value === 'true'})} className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="true">{t('breeding.plugYes')}</option>
                    <option value="false">{t('breeding.plugNo')}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{t('common.add')}</button>
                <button type="button" onClick={() => setShowPlugForm(false)} className="px-3 py-1 bg-gray-200 rounded text-sm">{t('common.cancel')}</button>
              </div>
            </form>
          )}
          <div className="space-y-2">
            {pair.plugChecks.map((pc: any) => {
              const expected = pc.plugFound ? calcExpectedBirthDate(new Date(pc.checkDate)) : null;
              return (
                <div key={pc.id} className="flex items-center justify-between text-sm border-b py-2 flex-wrap gap-1">
                  <span>{formatDate(pc.checkDate)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${pc.plugFound ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {pc.plugFound ? t('breeding.plugFound') : t('breeding.plugNotFound')}
                  </span>
                  {expected && <span className="text-xs text-slate-500">{t('breeding.expectedBirth')}: {formatDate(expected.earliest)} ~ {formatDate(expected.latest)}</span>}
                  {pc.createdBy && <span className="text-xs text-slate-400">登録: {pc.createdBy}</span>}
                  <button onClick={() => handleDeletePlug(pc.id)} className="text-red-500 text-xs hover:underline ml-auto">{t('common.delete')}</button>
                </div>
              );
            })}
            {pair.plugChecks.length === 0 && <p className="text-sm text-slate-400">{t('breeding.noPlugRecords')}</p>}
          </div>
        </div>
      </div>

      {/* Litters */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{t('breeding.litterRecords')}</h2>
          {pair.isActive && <button onClick={() => setShowLitterForm(!showLitterForm)} className="text-sm text-indigo-600 hover:underline">{t('breeding.addLitter')}</button>}
        </div>
        {showLitterForm && (
          <form onSubmit={handleLitterSubmit} className="mb-4 p-3 bg-slate-50 rounded-lg grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">{t('breeding.litterBirthDate')} *</label>
              <input type="date" value={litterForm.birthDate} onChange={e => setLitterForm({...litterForm, birthDate: e.target.value})} required className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t('breeding.pupCount')} *</label>
              <input type="number" min={1} value={litterForm.pupCount} onChange={e => setLitterForm({...litterForm, pupCount: Number(e.target.value)})} required className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">{t('common.add')}</button>
              <button type="button" onClick={() => setShowLitterForm(false)} className="px-3 py-1.5 bg-gray-200 rounded text-sm">{t('common.cancel')}</button>
            </div>
          </form>
        )}
        <div className="space-y-4">
          {pair.litters.map((litter: any) => {
            const weaningDue = calcWeaningDate(new Date(litter.birthDate));
            return (
              <div key={litter.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                  {editingLitterId === litter.id ? (
                    <form onSubmit={e => handleLitterEditSubmit(e, litter.id)} className="flex flex-wrap gap-2 items-end">
                      <div>
                        <label className="block text-xs font-medium mb-1">{t('breeding.litterBirthDate')}</label>
                        <input type="date" value={litterEditForm.birthDate} onChange={e => setLitterEditForm({...litterEditForm, birthDate: e.target.value})} required className="border rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">{t('breeding.pupCount')}</label>
                        <input type="number" min={1} value={litterEditForm.pupCount} onChange={e => setLitterEditForm({...litterEditForm, pupCount: Number(e.target.value)})} required className="border rounded px-2 py-1 text-sm w-20" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">{t('common.memo')}</label>
                        <input value={litterEditForm.note} onChange={e => setLitterEditForm({...litterEditForm, note: e.target.value})} className="border rounded px-2 py-1 text-sm w-32" />
                      </div>
                      <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{t('common.save')}</button>
                      <button type="button" onClick={() => setEditingLitterId(null)} className="px-3 py-1 bg-gray-200 rounded text-sm">{t('common.cancel')}</button>
                    </form>
                  ) : (
                    <div className="text-sm flex flex-wrap gap-x-4 gap-y-1 items-center">
                      <span className="font-medium">{t('breeding.litterBirthDate')}: {formatDate(litter.birthDate)}</span>
                      <span>{t('breeding.pupCount')}: {litter.pupCount}</span>
                      <span className="text-slate-500">{t('breeding.weaningDue')}: {formatDate(weaningDue)}</span>
                      {litter.weaningDate && <span className="text-green-600">{t('breeding.weaned')}: {formatDate(litter.weaningDate)}</span>}
                      {litter.note && <span className="text-slate-500">{litter.note}</span>}
                      {litter.createdBy && <span className="text-slate-400">登録: {litter.createdBy}</span>}
                      <button onClick={() => handleOpenLitterEdit(litter)} className="text-indigo-500 text-xs hover:underline">{t('common.edit')}</button>
                    </div>
                  )}
                  {!litter.weaningDate && editingLitterId !== litter.id && (
                    <button onClick={() => handleOpenWeanForm(litter)} className="text-sm text-indigo-600 hover:underline shrink-0">{t('breeding.weanAction')}</button>
                  )}
                </div>
                {showWeanForm === litter.id && (
                  <form onSubmit={e => handleWeanSubmit(e, litter.id)} className="mt-3 p-3 bg-slate-50 rounded-lg">
                    {weanStrainCandidates.length > 0 && (
                      <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <label className="block text-xs font-medium mb-1 text-yellow-800">⚠️ 両親の系統が異なります。子の系統を選択してください</label>
                        <div className="flex gap-2">
                          {weanStrainCandidates.map(s => (
                            <button key={s.id} type="button"
                              onClick={() => setWeanStrainId(s.id)}
                              className={`px-3 py-1.5 rounded text-sm border transition-colors ${weanStrainId === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 hover:border-indigo-400'}`}>
                              {s.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {weanSubstrains.length > 0 && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium mb-1">{t('strains.substrain')}</label>
                        <select value={weanSubstrainId ?? ''} onChange={e => setWeanSubstrainId(e.target.value ? Number(e.target.value) : null)} className="border rounded px-2 py-1.5 text-sm">
                          <option value="">{t('mice.noSubstrain')}</option>
                          {weanSubstrains.map(ss => <option key={ss.id} value={ss.id}>#{ss.number}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="mb-3">
                      <label className="block text-xs font-medium mb-1">{t('breeding.weanDate')} *</label>
                      <input type="date" value={weanForm.weaningDate} onChange={e => setWeanForm({...weanForm, weaningDate: e.target.value})} required className="border rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="space-y-2">
                      {weanForm.pups.map((pup, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm w-16">#{i + 1}</span>
                          <select value={pup.sex} onChange={e => { const newPups = [...weanForm.pups]; newPups[i] = { sex: e.target.value }; setWeanForm({...weanForm, pups: newPups}); }} className="border rounded px-2 py-1 text-sm">
                            <option value="M">{t('mice.male')}</option>
                            <option value="F">{t('mice.female')}</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{t('breeding.weanExecute')}</button>
                      <button type="button" onClick={() => setShowWeanForm(null)} className="px-3 py-1 bg-gray-200 rounded text-sm">{t('common.cancel')}</button>
                    </div>
                  </form>
                )}
                {litter.mice && litter.mice.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {litter.mice.map((m: any) => (
                      <Link key={m.id} href={mouseUrl(m.mouseCode)} className="text-sm text-indigo-600 hover:underline">{m.mouseCode} ({SEX_LABELS[m.sex]})</Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {pair.litters.length === 0 && <p className="text-sm text-slate-400">{t('breeding.noLitters')}</p>}
        </div>
      </div>
    </div>
  );
}
