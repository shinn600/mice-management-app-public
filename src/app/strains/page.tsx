'use client';

import { Fragment, useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { useSession } from 'next-auth/react';

interface Substrain { id: number; number: number; color: string; strainId: number; }
interface Strain {
  id: number;
  name: string;
  geneticBackground: string;
  modificationType: string | null;
  color: string;
  _count: { mice: number };
}
interface OwnerUser { id: number; name: string | null; username: string; }

export default function StrainsPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';
  const currentUserId = Number((session?.user as any)?.id) || null;
  const [strains, setStrains] = useState<Strain[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', geneticBackground: '', modificationType: '', description: '', color: '#4F46E5' });

  // Substrain state
  const [expandedStrainId, setExpandedStrainId] = useState<number | null>(null);
  const [substrains, setSubstrains] = useState<Record<number, Substrain[]>>({});
  const [newSubNum, setNewSubNum] = useState('');
  const [newSubColor, setNewSubColor] = useState('#4F46E5');
  const [subError, setSubError] = useState('');

  // Strain owner ("担当者") state — display-only reference info, admin-editable
  const [owners, setOwners] = useState<Record<number, OwnerUser[]>>({});
  const [allUsers, setAllUsers] = useState<OwnerUser[]>([]);
  const [editingOwnersStrainId, setEditingOwnersStrainId] = useState<number | null>(null);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<number[]>([]);

  const fetchStrains = async () => {
    const res = await fetch('/api/strains');
    const data: Strain[] = await res.json();
    setStrains(data);
    const entries = await Promise.all(
      data.map(async s => {
        const json = await (await fetch(`/api/strains/${s.id}/owners`)).json();
        return [s.id, Array.isArray(json) ? json : []] as const;
      })
    );
    setOwners(Object.fromEntries(entries));
  };

  useEffect(() => { fetchStrains(); }, []);
  useEffect(() => {
    if (isAdmin) fetch('/api/users').then(r => r.json()).then(data => { if (Array.isArray(data)) setAllUsers(data); });
  }, [isAdmin]);

  const startEditOwners = (strainId: number) => {
    setEditingOwnersStrainId(strainId);
    setSelectedOwnerIds((owners[strainId] || []).map(u => u.id));
  };

  const toggleOwnerId = (userId: number) => {
    setSelectedOwnerIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  // 一般ユーザー向け：自分のアカウントの担当ON/OFFのみを切り替える。
  // 対象ユーザーはサーバー側でセッションから決まるため、他人の担当設定は変更できない。
  const isSelfOwner = (strainId: number) =>
    currentUserId != null && (owners[strainId] || []).some(u => u.id === currentUserId);

  const handleToggleSelfOwner = async (strainId: number, isOwner: boolean) => {
    const res = await fetch(`/api/strains/${strainId}/owners`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOwner }),
    });
    if (res.ok) {
      const saved = await res.json();
      if (Array.isArray(saved)) setOwners(prev => ({ ...prev, [strainId]: saved }));
    }
  };

  const handleSaveOwners = async (strainId: number) => {
    const res = await fetch(`/api/strains/${strainId}/owners`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: selectedOwnerIds }),
    });
    if (res.ok) {
      const saved = await res.json();
      if (Array.isArray(saved)) setOwners(prev => ({ ...prev, [strainId]: saved }));
    }
    setEditingOwnersStrainId(null);
  };

  const fetchSubstrains = async (strainId: number) => {
    const res = await fetch(`/api/strains/${strainId}/substrains`);
    const data = await res.json();
    setSubstrains(prev => ({ ...prev, [strainId]: data }));
  };

  const toggleExpand = async (strainId: number) => {
    if (expandedStrainId === strainId) {
      setExpandedStrainId(null);
    } else {
      setExpandedStrainId(strainId);
      await fetchSubstrains(strainId);
      setNewSubNum('');
      setNewSubColor('#4F46E5');
      setSubError('');
    }
  };

  const handleAddSubstrain = async (strainId: number) => {
    setSubError('');
    const num = parseInt(newSubNum);
    if (newSubNum === '' || isNaN(num) || num < 0) { setSubError('0以上の整数を入力してください'); return; }
    const res = await fetch(`/api/strains/${strainId}/substrains`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: num, color: newSubColor }),
    });
    if (!res.ok) { const d = await res.json(); setSubError(d.error || 'エラー'); return; }
    setNewSubNum('');
    await fetchSubstrains(strainId);
  };

  const handleDeleteSubstrain = async (strainId: number, subId: number) => {
    if (!confirm(t('strains.substrainConfirmDelete'))) return;
    const res = await fetch(`/api/strains/${strainId}/substrains?subId=${subId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    await fetchSubstrains(strainId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/strains/${editId}` : '/api/strains';
    const method = editId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ name: '', geneticBackground: '', modificationType: '', description: '', color: '#4F46E5' });
    setShowForm(false);
    setEditId(null);
    fetchStrains();
  };

  const handleEdit = (strain: Strain) => {
    setForm({ name: strain.name, geneticBackground: strain.geneticBackground, modificationType: strain.modificationType || '', description: '', color: strain.color });
    setEditId(strain.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('strains.confirmDelete'))) return;
    await fetch(`/api/strains/${id}`, { method: 'DELETE' });
    fetchStrains();
  };

  return (
    <div>
      <PageHeader
        title={t('strains.title')}
        description={t('strains.description')}
        action={<button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', geneticBackground: '', modificationType: '', description: '', color: '#4F46E5' }); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{`+ ${t('strains.new')}`}</button>}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('strains.name')} *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('strains.background')} *</label>
            <input value={form.geneticBackground} onChange={e => setForm({...form, geneticBackground: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('strains.modification')}</label>
            <input value={form.modificationType} onChange={e => setForm({...form, modificationType: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('strains.color')}</label>
            <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="h-10 w-16 border rounded cursor-pointer" />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{editId ? t('common.update') : t('common.save')}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{t('strains.name')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('strains.background')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('strains.modification')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('strains.mouseCount')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('strains.substrains')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('strains.owners')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('strains.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {strains.map(strain => (
                <Fragment key={strain.id}>
                  <tr className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: strain.color }}>{strain.name}</span>
                    </td>
                    <td className="px-4 py-3">{strain.geneticBackground}</td>
                    <td className="px-4 py-3">{strain.modificationType || '-'}</td>
                    <td className="px-4 py-3">{strain._count.mice}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(strain.id)}
                        className="text-indigo-600 hover:underline text-sm flex items-center gap-1"
                      >
                        {t('strains.substrains')}
                        <span>{expandedStrainId === strain.id ? '▲' : '▼'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {editingOwnersStrainId === strain.id ? (
                        <div className="space-y-1 min-w-[160px]">
                          {allUsers.map(u => (
                            <label key={u.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedOwnerIds.includes(u.id)}
                                onChange={() => toggleOwnerId(u.id)}
                                className="rounded"
                              />
                              {u.name || u.username}
                            </label>
                          ))}
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => handleSaveOwners(strain.id)} className="text-xs text-indigo-600 hover:underline">{t('common.save')}</button>
                            <button onClick={() => setEditingOwnersStrainId(null)} className="text-xs text-gray-500 hover:underline">{t('common.cancel')}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {(owners[strain.id] || []).length === 0 && (
                            <span className="text-xs text-slate-400">{t('strains.noOwners')}</span>
                          )}
                          {(owners[strain.id] || []).map(u => (
                            <span key={u.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              {u.name || u.username}
                            </span>
                          ))}
                          {isAdmin ? (
                            <button onClick={() => startEditOwners(strain.id)} className="text-xs text-indigo-600 hover:underline ml-1">
                              {t('common.edit')}
                            </button>
                          ) : currentUserId != null && (
                            <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer ml-1 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelfOwner(strain.id)}
                                onChange={e => handleToggleSelfOwner(strain.id, e.target.checked)}
                                className="rounded"
                              />
                              {t('strains.ownerSelf')}
                            </label>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleEdit(strain)} className="text-indigo-600 hover:underline text-sm">{t('common.edit')}</button>
                      <button onClick={() => handleDelete(strain.id)} className="text-red-600 hover:underline text-sm">{t('common.delete')}</button>
                    </td>
                  </tr>
                  {expandedStrainId === strain.id && (
                    <tr key={`sub-${strain.id}`} className="bg-indigo-50 border-b">
                      <td colSpan={7} className="px-6 py-3">
                        <p className="text-xs font-semibold text-indigo-700 mb-2">{t('strains.substrains')}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(substrains[strain.id] || []).length === 0 && (
                            <span className="text-xs text-slate-400">{t('strains.noSubstrains')}</span>
                          )}
                          {(substrains[strain.id] || []).map(ss => (
                            <span key={ss.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: ss.color }}>
                              #{ss.number}
                              <label title="色を変更" className="cursor-pointer opacity-70 hover:opacity-100">
                                🎨
                                <input type="color" value={ss.color} onChange={async e => {
                                  const newColor = e.target.value;
                                  await fetch(`/api/strains/${strain.id}/substrains?subId=${ss.id}`, {
                                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ color: newColor }),
                                  });
                                  await fetchSubstrains(strain.id);
                                }} className="sr-only" />
                              </label>
                              <button onClick={() => handleDeleteSubstrain(strain.id, ss.id)} className="opacity-70 hover:opacity-100 ml-0.5">×</button>
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="番号"
                            value={newSubNum}
                            onChange={e => { setNewSubNum(e.target.value); setSubError(''); }}
                            className="border rounded px-2 py-1 text-sm w-24"
                          />
                          <input type="color" value={newSubColor} onChange={e => setNewSubColor(e.target.value)} className="h-8 w-10 border rounded cursor-pointer" title="サブ系統の色" />
                          <button
                            onClick={() => handleAddSubstrain(strain.id)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                          >
                            {t('strains.addSubstrain')}
                          </button>
                          {subError && <span className="text-red-600 text-xs">{subError}</span>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {strains.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t('strains.noStrains')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
