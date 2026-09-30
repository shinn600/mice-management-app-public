'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { mouseUrl } from '@/lib/utils';
import { SEX_LABELS } from '@/lib/constants';

interface Rack { id: number; name: string; location: string | null; _count: { cages: number }; }
interface CageMouse { id: number; mouseCode: string; sex: string; status: string; strain: { name: string; color: string } | null; }
interface Cage { id: number; cageCode: string; maxCapacity: number; shelfNumber: string | null; note: string | null; rack: { name: string } | null; _count: { mice: number }; }

export default function CagesPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'cages' | 'racks'>('cages');

  // --- Cage state ---
  const [cages, setCages] = useState<Cage[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [hideEmpty, setHideEmpty] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('cages.hideEmpty') === 'true';
    return false;
  });
  const [showCageForm, setShowCageForm] = useState(false);
  const [cageForm, setCageForm] = useState({ cageCode: '', maxCapacity: 5, rackId: '', shelfNumber: '', note: '' });
  const [expandedCageId, setExpandedCageId] = useState<number | null>(null);
  const [cageMice, setCageMice] = useState<Record<number, CageMouse[]>>({});

  // --- Rack state ---
  const [hideUnused, setHideUnused] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('racks.hideUnused') === 'true';
    return false;
  });
  const [showRackForm, setShowRackForm] = useState(false);
  const [rackForm, setRackForm] = useState({ name: '', location: '' });

  const fetchAll = async () => {
    const [c, r] = await Promise.all([
      fetch('/api/cages').then(r => r.json()),
      fetch('/api/racks').then(r => r.json()),
    ]);
    setCages(c);
    setRacks(r);
  };
  useEffect(() => { fetchAll(); }, []);

  const handleToggleCage = async (id: number) => {
    if (expandedCageId === id) {
      setExpandedCageId(null);
      return;
    }
    setExpandedCageId(id);
    if (!cageMice[id]) {
      const data = await fetch(`/api/cages/${id}`).then(r => r.json());
      setCageMice(prev => ({ ...prev, [id]: data.mice || [] }));
    }
  };

  // --- Cage handlers ---
  const handleCageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/cages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...cageForm,
        maxCapacity: Number(cageForm.maxCapacity),
        rackId: cageForm.rackId ? Number(cageForm.rackId) : null,
        shelfNumber: cageForm.shelfNumber || null,
        note: cageForm.note || null,
      }),
    });
    setCageForm({ cageCode: '', maxCapacity: 5, rackId: '', shelfNumber: '', note: '' });
    setShowCageForm(false);
    fetchAll();
  };
  const handleCageDelete = async (id: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    await fetch(`/api/cages/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // --- Rack handlers ---
  const handleRackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/racks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: rackForm.name, location: rackForm.location || null }),
    });
    setRackForm({ name: '', location: '' });
    setShowRackForm(false);
    fetchAll();
  };
  const handleRackDelete = async (id: number) => {
    if (!confirm(t('common.confirmDelete'))) return;
    await fetch(`/api/racks/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const filteredCages = hideEmpty ? cages.filter(c => c._count.mice > 0) : cages;
  const filteredRacks = hideUnused ? racks.filter(r => r._count.cages > 0) : racks;

  return (
    <div>
      <PageHeader
        title={t('cages.title')}
        description={t('cages.description')}
        action={
          tab === 'cages'
            ? <button onClick={() => setShowCageForm(!showCageForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('cages.new')}</button>
            : <button onClick={() => setShowRackForm(!showRackForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('racks.new')}</button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setTab('cages')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'cages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('nav.cages')}
        </button>
        <button
          onClick={() => setTab('racks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'racks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('nav.racks')}
        </button>
      </div>

      {/* --- Cages Tab --- */}
      {tab === 'cages' && (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={hideEmpty} onChange={e => { setHideEmpty(e.target.checked); localStorage.setItem('cages.hideEmpty', String(e.target.checked)); }} className="rounded border-gray-300" />
              {t('filter.hideEmpty')}
            </label>
            <span className="text-xs text-slate-400">※ アカウントに紐づいたマウスのみ名前が表示されます</span>
          </div>

          {showCageForm && (
            <form onSubmit={handleCageSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('cages.code')} *</label><input value={cageForm.cageCode} onChange={e => setCageForm({...cageForm, cageCode: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('cages.maxCapacity')}</label><input type="number" min={1} value={cageForm.maxCapacity} onChange={e => setCageForm({...cageForm, maxCapacity: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('cages.rack')}</label><select value={cageForm.rackId} onChange={e => setCageForm({...cageForm, rackId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">{t('common.unassigned')}</option>{racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              <div className="col-span-3 flex gap-2"><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">{t('common.save')}</button><button type="button" onClick={() => setShowCageForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button></div>
            </form>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium w-6"></th>
                    <th className="text-left px-4 py-3 font-medium">{t('cages.code')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('cages.capacity')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('cages.rack')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('strains.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCages.map(cage => (
                    <Fragment key={cage.id}>
                      <tr
                        className={`border-b cursor-pointer hover:bg-slate-50 ${expandedCageId === cage.id ? 'bg-indigo-50' : ''}`}
                        onClick={() => handleToggleCage(cage.id)}
                      >
                        <td className="px-4 py-3 text-slate-400 text-xs select-none">
                          {expandedCageId === cage.id ? '▼' : '▶'}
                        </td>
                        <td className="px-4 py-3 font-medium">{cage.cageCode}</td>
                        <td className="px-4 py-3">
                          <span className={cage._count.mice >= cage.maxCapacity ? 'text-red-600 font-medium' : ''}>
                            {cage._count.mice} / {cage.maxCapacity}
                          </span>
                        </td>
                        <td className="px-4 py-3">{cage.rack?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); handleCageDelete(cage.id); }}
                            className="text-red-600 hover:underline text-sm"
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      </tr>
                      {expandedCageId === cage.id && (
                        <tr key={`${cage.id}-mice`} className="bg-indigo-50 border-b">
                          <td colSpan={5} className="px-8 py-3">
                            {!cageMice[cage.id] ? (
                              <span className="text-slate-400 text-xs">{t('common.loading')}</span>
                            ) : cageMice[cage.id].length === 0 ? (
                              <span className="text-slate-400 text-xs">{t('cages.noMice')}</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {cageMice[cage.id].map(m => (
                                  <Link
                                    key={m.id}
                                    href={mouseUrl(m.mouseCode)}
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white hover:opacity-80"
                                    style={{ backgroundColor: m.strain?.color ?? '#6B7280' }}
                                  >
                                    {SEX_LABELS[m.sex]} {m.mouseCode}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {filteredCages.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('cages.noCages')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- Racks Tab --- */}
      {tab === 'racks' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={hideUnused} onChange={e => { setHideUnused(e.target.checked); localStorage.setItem('racks.hideUnused', String(e.target.checked)); }} className="rounded border-gray-300" />
              {t('filter.hideUnused')}
            </label>
          </div>

          {showRackForm && (
            <form onSubmit={handleRackSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t('racks.name')} *</label><input value={rackForm.name} onChange={e => setRackForm({...rackForm, name: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">{t('racks.location')}</label><input value={rackForm.location} onChange={e => setRackForm({...rackForm, location: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div className="col-span-2 flex gap-2"><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">{t('common.save')}</button><button type="button" onClick={() => setShowRackForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button></div>
            </form>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('racks.name')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('racks.location')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('racks.cageCount')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('strains.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRacks.map(rack => (
                    <tr key={rack.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{rack.name}</td>
                      <td className="px-4 py-3">{rack.location || '-'}</td>
                      <td className="px-4 py-3">{rack._count.cages}</td>
                      <td className="px-4 py-3"><button onClick={() => handleRackDelete(rack.id)} className="text-red-600 hover:underline text-sm">{t('common.delete')}</button></td>
                    </tr>
                  ))}
                  {filteredRacks.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('racks.noRacks')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
