'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { todayString } from '@/lib/date-utils';
import { mouseUrl } from '@/lib/utils';

interface Strain { id: number; name: string; }
interface Substrain { id: number; number: number; }
interface Cage { id: number; cageCode: string; maxCapacity: number; _count: { mice: number }; }
interface MouseOption { id: number; mouseCode: string; sex: string; }

export default function NewMousePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [substrains, setSubstrains] = useState<Substrain[]>([]);
  const [cages, setCages] = useState<Cage[]>([]);
  const [allMice, setAllMice] = useState<MouseOption[]>([]);
  const [form, setForm] = useState({
    sex: 'M', birthDate: todayString(), strainId: '', substrainId: '', fatherId: '', motherId: '',
    status: 'alive', cageId: '', note: '',
  });
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/strains').then(r => r.json()).then(setStrains);
    fetch('/api/cages').then(r => r.json()).then(setCages);
    fetch('/api/mice').then(r => r.json()).then(setAllMice);
  }, []);

  const handleStrainChange = async (strainId: string) => {
    setForm(f => ({ ...f, strainId, substrainId: '' }));
    setSubstrains([]);
    if (!strainId) { setPrefix(''); setSuffix(''); return; }
    const strain = strains.find(s => String(s.id) === strainId);
    if (!strain) return;
    setPrefix(`${strain.name}-`);
    setLoadingCode(true);
    try {
      const [countRes, subRes] = await Promise.all([
        fetch(`/api/mice?strainId=${strainId}&countOnly=1`),
        fetch(`/api/strains/${strainId}/substrains`),
      ]);
      const { count } = await countRes.json();
      setSuffix(String(count + 1).padStart(4, '0'));
      setSubstrains(await subRes.json());
    } finally {
      setLoadingCode(false);
    }
  };

  const mouseCode = prefix + suffix;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!mouseCode) { setError('マウスIDを入力してください'); return; }
    const res = await fetch('/api/mice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        mouseCode,
        strainId: Number(form.strainId),
        substrainId: form.substrainId ? Number(form.substrainId) : null,
        fatherId: form.fatherId ? Number(form.fatherId) : null,
        motherId: form.motherId ? Number(form.motherId) : null,
        cageId: form.cageId ? Number(form.cageId) : null,
        birthDate: form.birthDate || null,
        note: form.note || null,
      }),
    });
    if (res.ok) {
      router.push(mouseUrl((await res.json()).mouseCode));
    } else {
      setError((await res.json()).error || t('mice.registerFailed'));
    }
  };

  return (
    <div>
      <PageHeader title={t('mice.newTitle')} />
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.strain')} *</label>
            <select value={form.strainId} onChange={e => handleStrainChange(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.select')}</option>
              {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('strains.substrain')}</label>
            <select value={form.substrainId} onChange={e => setForm({...form, substrainId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={substrains.length === 0}>
              <option value="">{substrains.length === 0 ? '（系統を先に選択）' : t('mice.noSubstrain')}</option>
              {substrains.map(ss => <option key={ss.id} value={ss.id}>#{ss.number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.mouseCode')} *</label>
            {prefix ? (
              <div className="flex items-center border rounded-lg overflow-hidden text-sm focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="px-3 py-2 bg-slate-100 text-slate-600 border-r select-none whitespace-nowrap">{prefix}</span>
                <input value={suffix} onChange={e => setSuffix(e.target.value)} required disabled={loadingCode} className="flex-1 px-3 py-2 focus:outline-none min-w-0 disabled:opacity-50" placeholder="0001" />
              </div>
            ) : (
              <input value="" readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" placeholder="← 先に系統を選択" />
            )}
            {mouseCode && <p className="text-xs text-slate-400 mt-1">登録ID: {mouseCode}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.sex')} *</label>
            <select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="M">{t('mice.male')}</option>
              <option value="F">{t('mice.female')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.birthDate')}</label>
            <input type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.fatherId')}</label>
            <select value={form.fatherId} onChange={e => setForm({...form, fatherId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.none')}</option>
              {allMice.filter(m => m.sex === 'M').map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.motherId')}</label>
            <select value={form.motherId} onChange={e => setForm({...form, motherId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.none')}</option>
              {allMice.filter(m => m.sex === 'F').map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.cage')}</label>
            <select value={form.cageId} onChange={e => setForm({...form, cageId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.unassigned')}</option>
              {cages.map(c => <option key={c.id} value={c.id}>{c.cageCode} ({c._count.mice}/{c.maxCapacity})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.status')}</label>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="alive">{t('status.alive')}</option>
              <option value="dead">{t('status.dead')}</option>
              <option value="processed">{t('status.processed')}</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">{t('common.memo')}</label>
            <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('common.save')}</button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button>
        </div>
      </form>
    </div>
  );
}
