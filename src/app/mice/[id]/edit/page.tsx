'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { mouseUrl } from '@/lib/utils';

interface Strain { id: number; name: string; color: string; }
interface Substrain { id: number; number: number; color: string; }
interface Cage { id: number; cageCode: string; maxCapacity: number; _count: { mice: number }; }
interface MouseOption { id: number; mouseCode: string; sex: string; }

export default function EditMousePage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [substrains, setSubstrains] = useState<Substrain[]>([]);
  const [cages, setCages] = useState<Cage[]>([]);
  const [allMice, setAllMice] = useState<MouseOption[]>([]);
  const [form, setForm] = useState({
    mouseCode: '', sex: 'M', birthDate: '', strainId: '', substrainId: '', fatherId: '', motherId: '',
    status: 'alive', cageId: '', note: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/strains').then(r => r.json()),
      fetch('/api/cages').then(r => r.json()),
      fetch(`/api/mice/${id}`).then(r => r.json()),
      fetch('/api/mice').then(r => r.json()),
    ]).then(([strains, cages, mouse, mice]) => {
      setStrains(strains);
      setCages(cages);
      setAllMice(mice);
      const strainId = String(mouse.strainId);
      setForm({
        mouseCode: mouse.mouseCode,
        sex: mouse.sex,
        birthDate: mouse.birthDate ? new Date(mouse.birthDate).toISOString().split('T')[0] : '',
        strainId,
        substrainId: mouse.substrainId ? String(mouse.substrainId) : '',
        fatherId: mouse.fatherId ? String(mouse.fatherId) : '',
        motherId: mouse.motherId ? String(mouse.motherId) : '',
        status: mouse.status,
        cageId: mouse.cageId ? String(mouse.cageId) : '',
        note: mouse.note || '',
      });
      fetch(`/api/strains/${strainId}/substrains`).then(r => r.json()).then(setSubstrains);
    });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('このマウスのデータを完全に削除しますか？この操作は取り消せません。')) return;
    await fetch(`/api/mice/${id}`, { method: 'DELETE' });
    router.push('/mice');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/mice/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mouseCode: form.mouseCode,
        sex: form.sex,
        strainId: Number(form.strainId),
        substrainId: form.substrainId ? Number(form.substrainId) : null,
        birthDate: form.birthDate || null,
        fatherId: form.fatherId ? Number(form.fatherId) : null,
        motherId: form.motherId ? Number(form.motherId) : null,
        status: form.status,
        cageId: form.cageId ? Number(form.cageId) : null,
        note: form.note || null,
      }),
    });
    if (res.ok) router.push(mouseUrl(form.mouseCode));
    else { const data = await res.json(); setError(data.error || t('mice.updateFailed')); }
  };

  return (
    <div>
      <PageHeader title={t('mice.editTitle')} />
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.strain')} *</label>
            {(() => {
              const sel = strains.find(s => String(s.id) === form.strainId);
              return sel ? (
                <div className="mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: sel.color }}>{sel.name}</span>
                </div>
              ) : null;
            })()}
            <select value={form.strainId} onChange={e => { const v = e.target.value; setForm({...form, strainId: v, substrainId: ''}); fetch(`/api/strains/${v}/substrains`).then(r => r.json()).then(setSubstrains); }} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.select')}</option>
              {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('strains.substrain')}</label>
            {(() => {
              const sel = substrains.find(ss => String(ss.id) === form.substrainId);
              return sel ? (
                <div className="mb-1.5">
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-mono font-medium text-white" style={{ backgroundColor: sel.color }}>#{sel.number}</span>
                </div>
              ) : null;
            })()}
            <select value={form.substrainId} onChange={e => setForm({...form, substrainId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={substrains.length === 0}>
              <option value="">{t('mice.noSubstrain')}</option>
              {substrains.map(ss => <option key={ss.id} value={ss.id}>#{ss.number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.mouseCode')} *</label>
            <input value={form.mouseCode} onChange={e => setForm({...form, mouseCode: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
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
              {allMice.filter(m => m.sex === 'M' && String(m.id) !== id).map(m => (
                <option key={m.id} value={m.id}>{m.mouseCode}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('mice.motherId')}</label>
            <select value={form.motherId} onChange={e => setForm({...form, motherId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">{t('common.none')}</option>
              {allMice.filter(m => m.sex === 'F' && String(m.id) !== id).map(m => (
                <option key={m.id} value={m.id}>{m.mouseCode}</option>
              ))}
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
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('common.update')}</button>
          <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">{t('common.delete')}</button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button>
        </div>
      </form>
    </div>
  );
}
