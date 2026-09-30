'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';

interface Rack { id: number; name: string; location: string | null; _count: { cages: number }; }

export default function RacksPage() {
  const { t } = useLanguage();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [hideUnused, setHideUnused] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('racks.hideUnused') === 'true';
    return false;
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '' });

  const fetchRacks = async () => { setRacks(await fetch('/api/racks').then(r => r.json())); };
  useEffect(() => { fetchRacks(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/racks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, location: form.location || null }) });
    setForm({ name: '', location: '' }); setShowForm(false); fetchRacks();
  };

  const handleDelete = async (id: number) => { if (!confirm(t('common.confirmDelete'))) return; await fetch(`/api/racks/${id}`, { method: 'DELETE' }); fetchRacks(); };

  const filteredRacks = hideUnused ? racks.filter(r => r._count.cages > 0) : racks;

  return (
    <div>
      <PageHeader title={t('racks.title')} description={t('racks.description')} action={<button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('racks.new')}</button>} />

      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={hideUnused} onChange={e => { setHideUnused(e.target.checked); localStorage.setItem('racks.hideUnused', String(e.target.checked)); }} className="rounded border-gray-300" />
          {t('filter.hideUnused')}
        </label>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">{t('racks.name')} *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('racks.location')}</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-2 flex gap-2"><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">{t('common.save')}</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button></div>
        </form>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr><th className="text-left px-4 py-3 font-medium">{t('racks.name')}</th><th className="text-left px-4 py-3 font-medium">{t('racks.location')}</th><th className="text-left px-4 py-3 font-medium">{t('racks.cageCount')}</th><th className="text-left px-4 py-3 font-medium">{t('strains.actions')}</th></tr></thead>
          <tbody>
            {filteredRacks.map(rack => (
              <tr key={rack.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{rack.name}</td>
                <td className="px-4 py-3">{rack.location || '-'}</td>
                <td className="px-4 py-3">{rack._count.cages}</td>
                <td className="px-4 py-3"><button onClick={() => handleDelete(rack.id)} className="text-red-600 hover:underline text-sm">{t('common.delete')}</button></td>
              </tr>
            ))}
            {filteredRacks.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('racks.noRacks')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
