'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { formatDate, todayString } from '@/lib/date-utils';
import { useLanguage } from '@/components/LanguageContext';
import { isBackgroundStrainOf } from '@/lib/utils';

interface Strain { id: number; name: string; color: string; geneticBackground: string | null; }
interface Substrain { id: number; number: number; color: string; }

interface MatingPair {
  id: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  note: string | null;
  male: { id: number; mouseCode: string; strain: { id: number; name: string; color: string; geneticBackground: string | null }; substrain: { id: number; number: number; color: string } | null };
  female: { id: number; mouseCode: string; strain: { id: number; name: string; color: string; geneticBackground: string | null }; substrain: { id: number; number: number; color: string } | null };
  cage: { cageCode: string } | null;
  _count: { plugChecks: number; litters: number };
}

export default function BreedingPage() {
  const { t } = useLanguage();
  const [pairs, setPairs] = useState<MatingPair[]>([]);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [substrains, setSubstrains] = useState<Substrain[]>([]);
  const [filterStrainId, setFilterStrainId] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('filter.strainId') || '';
    return '';
  });
  const [filterSubstrainId, setFilterSubstrainId] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('filter.substrainId') || '';
    return '';
  });
  const [hideEnded, setHideEnded] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('breeding.hideEnded') === 'true';
    return false;
  });
  const [showForm, setShowForm] = useState(false);
  const [allMales, setAllMales] = useState<any[]>([]);
  const [allFemales, setAllFemales] = useState<any[]>([]);
  const [cages, setCages] = useState<any[]>([]);
  const [form, setForm] = useState({ maleId: '', femaleId: '', startDate: todayString(), cageId: '', note: '' });

  const fetchPairs = async () => {
    const res = await fetch('/api/breeding');
    setPairs(await res.json());
  };

  const fetchSubstrains = async (strainId: string) => {
    if (!strainId) { setSubstrains([]); return; }
    const res = await fetch(`/api/strains/${strainId}/substrains`);
    setSubstrains(await res.json());
  };

  const fetchMice = async () => {
    const maleParams = new URLSearchParams({ sex: 'M', status: 'alive' });
    const femaleParams = new URLSearchParams({ sex: 'F', status: 'alive' });
    if (filterStrainId) {
      maleParams.set('strainId', filterStrainId);
      femaleParams.set('strainId', filterStrainId);
    }
    if (filterSubstrainId) {
      maleParams.set('substrainId', filterSubstrainId);
      femaleParams.set('substrainId', filterSubstrainId);
    }
    const [m, f] = await Promise.all([
      fetch(`/api/mice?${maleParams}`).then(r => r.json()),
      fetch(`/api/mice?${femaleParams}`).then(r => r.json()),
    ]);

    // KO x WT の交配を組みやすいように、系統フィルターがかかっていても
    // 選択中の系統の「遺伝的背景」に登録されている系統のマウスは常に選択肢に残す
    const filteredStrain = strains.find(s => s.id === Number(filterStrainId));
    const backgroundStrain = filteredStrain ? strains.find(s => isBackgroundStrainOf(s, filteredStrain)) : undefined;
    if (filterStrainId && backgroundStrain && backgroundStrain.id !== Number(filterStrainId)) {
      const bgMaleParams = new URLSearchParams({ sex: 'M', status: 'alive', strainId: String(backgroundStrain.id) });
      const bgFemaleParams = new URLSearchParams({ sex: 'F', status: 'alive', strainId: String(backgroundStrain.id) });
      const [bgM, bgF] = await Promise.all([
        fetch(`/api/mice?${bgMaleParams}`).then(r => r.json()),
        fetch(`/api/mice?${bgFemaleParams}`).then(r => r.json()),
      ]);
      setAllMales([...m, ...bgM]);
      setAllFemales([...f, ...bgF]);
    } else {
      setAllMales(m);
      setAllFemales(f);
    }
  };

  useEffect(() => {
    fetchPairs();
    fetch('/api/strains').then(r => r.json()).then(setStrains);
    fetch('/api/cages').then(r => r.json()).then(setCages);
    if (filterStrainId) fetchSubstrains(filterStrainId);
  }, []);

  const filteredStrainForBg = strains.find(s => s.id === Number(filterStrainId));
  const backgroundStrainId = filteredStrainForBg && strains.find(s => isBackgroundStrainOf(s, filteredStrainForBg))?.id;

  useEffect(() => {
    fetchMice();
    setForm(prev => ({ ...prev, maleId: '', femaleId: '' }));
  }, [filterStrainId, filterSubstrainId, backgroundStrainId]);

  const handleStrainFilterChange = (v: string) => {
    setFilterStrainId(v);
    setFilterSubstrainId('');
    localStorage.setItem('filter.strainId', v);
    localStorage.setItem('filter.substrainId', '');
    fetchSubstrains(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/breeding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maleId: Number(form.maleId),
        femaleId: Number(form.femaleId),
        startDate: form.startDate,
        cageId: form.cageId ? Number(form.cageId) : null,
        note: form.note || null,
      }),
    });
    setForm({ maleId: '', femaleId: '', startDate: todayString(), cageId: '', note: '' });
    setShowForm(false);
    fetchPairs();
  };

  const filteredPairs = pairs.filter(p => {
    if (hideEnded && !p.isActive) return false;
    if (filterStrainId) {
      const sid = Number(filterStrainId);
      if (p.male.strain.id !== sid && p.female.strain.id !== sid) return false;
    }
    if (filterSubstrainId) {
      const ssid = Number(filterSubstrainId);
      const mss = (p.male as any).substrainId;
      const fss = (p.female as any).substrainId;
      if (mss !== ssid && fss !== ssid) return false;
    }
    return true;
  });

  const mouseLabel = (m: any) => {
    const sub = m.substrain ? ` #${m.substrain.number}` : '';
    return `${m.mouseCode} (${m.strain.name}${sub})`;
  };

  // 子のサブ系統を決定するロジック
  const deriveOffspringSubstrain = (pair: MatingPair): { substrain: { id: number; number: number; color: string } | null; ambiguous: boolean } => {
    const ms = pair.male.strain;
    const fs = pair.female.strain;
    const msub = pair.male.substrain;
    const fsub = pair.female.substrain;
    if (ms.id === fs.id) {
      if (!msub && !fsub) return { substrain: null, ambiguous: false };
      if (msub && !fsub) return { substrain: msub, ambiguous: false };
      if (!msub && fsub) return { substrain: fsub, ambiguous: false };
      if (msub && fsub && msub.id === fsub.id) return { substrain: msub, ambiguous: false };
      return { substrain: null, ambiguous: true };
    }
    if (isBackgroundStrainOf(ms, fs)) return { substrain: fsub ?? null, ambiguous: false };
    if (isBackgroundStrainOf(fs, ms)) return { substrain: msub ?? null, ambiguous: false };
    return { substrain: null, ambiguous: true };
  };

  // 子の系統を決定するロジック（離乳と同じルール）
  const deriveOffspringStrain = (pair: MatingPair): { strain: { id: number; name: string; color: string } | null; ambiguous: boolean } => {
    const ms = pair.male.strain;
    const fs = pair.female.strain;
    if (ms.id === fs.id) return { strain: ms, ambiguous: false };
    if (isBackgroundStrainOf(ms, fs)) return { strain: fs, ambiguous: false };
    if (isBackgroundStrainOf(fs, ms)) return { strain: ms, ambiguous: false };
    return { strain: null, ambiguous: true };
  };

  return (
    <div>
      <PageHeader
        title={t('breeding.title')}
        description={t('breeding.description')}
        action={<button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('breeding.new')}</button>}
      />

      <div className="bg-white p-4 rounded-lg shadow mb-4 flex gap-4 flex-wrap items-center">
        <select value={filterStrainId} onChange={e => handleStrainFilterChange(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">{t('mice.allStrains')}</option>
          {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {substrains.length > 0 && (
          <select value={filterSubstrainId} onChange={e => { setFilterSubstrainId(e.target.value); localStorage.setItem('filter.substrainId', e.target.value); }} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">全サブ系統</option>
            {substrains.map(ss => <option key={ss.id} value={ss.id}>サブ系統 #{ss.number}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={hideEnded} onChange={e => { setHideEnded(e.target.checked); localStorage.setItem('breeding.hideEnded', String(e.target.checked)); }} className="rounded border-gray-300" />
          {t('filter.hideEnded')}
        </label>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('breeding.male')} *</label>
            <select value={form.maleId} onChange={e => setForm({...form, maleId: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.select')}</option>
              {allMales.map((m: any) => <option key={m.id} value={m.id}>{mouseLabel(m)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('breeding.female')} *</label>
            <select value={form.femaleId} onChange={e => setForm({...form, femaleId: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.select')}</option>
              {allFemales.map((f: any) => <option key={f.id} value={f.id}>{mouseLabel(f)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('breeding.startDate')} *</label>
            <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.cage')}</label>
            <select value={form.cageId} onChange={e => setForm({...form, cageId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.unassigned')}</option>
              {cages.map((c: any) => <option key={c.id} value={c.id}>{c.cageCode} ({c._count?.mice ?? 0}/{c.maxCapacity})</option>)}
            </select>
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('common.save')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('mice.strain')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('strains.substrain')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('breeding.male')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('breeding.female')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('common.status')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('breeding.startDate')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('breeding.plugChecks')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('breeding.litters')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('mice.cage')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPairs.map(pair => (
                <tr key={pair.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/breeding/${pair.id}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => {
                      const { strain, ambiguous } = deriveOffspringStrain(pair);
                      if (ambiguous) {
                        return (
                          <span className="flex items-center gap-1">
                            <span className="text-yellow-500 font-medium">⚠️</span>
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: pair.male.strain.color }} />
                            <span className="text-xs">{pair.male.strain.name}</span>
                            <span className="text-slate-400 text-xs">×</span>
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: pair.female.strain.color }} />
                            <span className="text-xs">{pair.female.strain.name}</span>
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap" style={{ backgroundColor: strain!.color }}>
                          {strain!.name}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => {
                      const { substrain, ambiguous } = deriveOffspringSubstrain(pair);
                      if (ambiguous) return <span className="text-yellow-500 text-xs">⚠️</span>;
                      if (!substrain) return <span className="text-slate-300">-</span>;
                      return <span className="px-1.5 py-0.5 rounded-full text-[11px] font-mono font-medium text-white" style={{ backgroundColor: substrain.color }}>#{substrain.number}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">♂ {pair.male.mouseCode}</td>
                  <td className="px-4 py-3 whitespace-nowrap">♀ {pair.female.mouseCode}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pair.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {pair.isActive ? t('breeding.active') : t('breeding.ended')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(pair.startDate)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{pair._count.plugChecks}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{pair._count.litters}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{pair.cage?.cageCode || '-'}</td>
                </tr>
              ))}
              {filteredPairs.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t('breeding.noPairs')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
