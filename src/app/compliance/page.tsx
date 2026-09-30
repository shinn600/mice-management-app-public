'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { formatDate, todayString } from '@/lib/date-utils';
import { useLanguage } from '@/components/LanguageContext';

interface Approval { id: number; approvalNumber: string; title: string; allowedCount: number; startDate: string | null; endDate: string | null; _count: { usages: number }; }

export default function CompliancePage() {
  const { t } = useLanguage();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ approvalNumber: '', title: '', allowedCount: 1, startDate: todayString(), endDate: '', note: '' });

  const fetchApprovals = async () => { setApprovals(await fetch('/api/compliance').then(r => r.json())); };
  useEffect(() => { fetchApprovals(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/compliance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, allowedCount: Number(form.allowedCount), startDate: form.startDate || null, endDate: form.endDate || null, note: form.note || null }) });
    setForm({ approvalNumber: '', title: '', allowedCount: 1, startDate: todayString(), endDate: '', note: '' }); setShowForm(false); fetchApprovals();
  };

  const handleDelete = async (id: number) => { if (!confirm(t('common.confirmDelete'))) return; await fetch(`/api/compliance/${id}`, { method: 'DELETE' }); fetchApprovals(); };

  return (
    <div>
      <PageHeader title={t('compliance.title')} description={t('compliance.description')} action={<button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">{t('compliance.new')}</button>} />
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">{t('compliance.approvalNumber')} *</label><input value={form.approvalNumber} onChange={e => setForm({...form, approvalNumber: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('compliance.experimentTitle')} *</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('compliance.allowedCount')} *</label><input type="number" min={1} value={form.allowedCount} onChange={e => setForm({...form, allowedCount: Number(e.target.value)})} required className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('compliance.startDate')}</label><input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('compliance.endDate')}</label><input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="col-span-2 flex gap-2"><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">{t('common.save')}</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">{t('common.cancel')}</button></div>
        </form>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('compliance.approvalNumber')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('compliance.experimentTitle')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('compliance.period')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('compliance.usage')}</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map(a => {
                const ratio = a._count.usages / a.allowedCount;
                const barColor = ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-yellow-500' : 'bg-green-500';
                return (
                  <tr key={a.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/compliance/${a.id}`}>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{a.approvalNumber}</td>
                    <td className="px-4 py-3">{a.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(a.startDate)} ~ {formatDate(a.endDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                        </div>
                        <span className="font-medium">{a._count.usages} / {a.allowedCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {ratio >= 1 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{t('compliance.exceeded')}</span>}
                      {ratio >= 0.8 && ratio < 1 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{t('compliance.remaining')}</span>}
                      {ratio < 0.8 && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>}
                    </td>
                  </tr>
                );
              })}
              {approvals.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('compliance.noApprovals')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
