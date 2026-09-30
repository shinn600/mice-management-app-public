'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { formatDate, todayString } from '@/lib/date-utils';
import { useLanguage } from '@/components/LanguageContext';
import { mouseUrl } from '@/lib/utils';

export default function ComplianceDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [approval, setApproval] = useState<any>(null);
  const [mice, setMice] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mouseId: '', usageDate: todayString(), purpose: '', note: '' });

  const fetchApproval = async () => {
    const res = await fetch(`/api/compliance/${id}`);
    if (res.ok) setApproval(await res.json());
  };

  useEffect(() => {
    fetchApproval();
    fetch('/api/mice?status=alive').then(r => r.json()).then(setMice);
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/compliance/${id}/usages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mouseId: Number(form.mouseId), usageDate: form.usageDate, purpose: form.purpose || null, note: form.note || null }),
    });
    setForm({ mouseId: '', usageDate: todayString(), purpose: '', note: '' }); setShowForm(false); fetchApproval();
  };

  if (!approval) return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;

  const totalUsages = approval.totalUsages ?? approval.usages.length;
  const ratio = totalUsages / approval.allowedCount;

  return (
    <div>
      <PageHeader title={`承認: ${approval.approvalNumber}`} description={approval.title} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div className={`h-3 rounded-full ${ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
              </div>
              <span className="text-lg font-bold">{totalUsages} / {approval.allowedCount}</span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">開始日</dt><dd>{formatDate(approval.startDate)}</dd></div>
              <div><dt className="text-slate-500">終了日</dt><dd>{formatDate(approval.endDate)}</dd></div>
            </dl>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold">{t('compliance.usageRecords')}</h2>
                <span className="text-xs text-slate-400">※ アカウントに紐づいたマウスのみ名前が表示されます</span>
              </div>
              <button onClick={() => setShowForm(!showForm)} className="text-sm text-indigo-600 hover:underline">{t('compliance.addUsage')}</button>
            </div>
            {showForm && (
              <form onSubmit={handleSubmit} className="mb-4 p-3 bg-slate-50 rounded-lg grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium mb-1">{t('compliance.mouse')} *</label><select value={form.mouseId} onChange={e => setForm({...form, mouseId: e.target.value})} required className="w-full border rounded px-2 py-1.5 text-sm"><option value="">{t('common.select')}</option>{mice.map((m: any) => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}</select></div>
                <div><label className="block text-xs font-medium mb-1">{t('compliance.usageDate')} *</label><input type="date" value={form.usageDate} onChange={e => setForm({...form, usageDate: e.target.value})} required className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div><label className="block text-xs font-medium mb-1">{t('compliance.purpose')}</label><input value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
                <div className="flex items-end"><button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">{t('common.add')}</button></div>
              </form>
            )}
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className="text-left px-3 py-2">{t('compliance.mouse')}</th><th className="text-left px-3 py-2">系統</th><th className="text-left px-3 py-2">{t('compliance.usageDate')}</th><th className="text-left px-3 py-2">{t('compliance.purpose')}</th></tr></thead>
              <tbody>
                {approval.usages.map((u: any) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2"><Link href={mouseUrl(u.mouse.mouseCode)} className="text-indigo-600 hover:underline">{u.mouse.mouseCode}</Link></td>
                    <td className="px-3 py-2">{u.mouse.strain.name}</td>
                    <td className="px-3 py-2">{formatDate(u.usageDate)}</td>
                    <td className="px-3 py-2">{u.purpose || '-'}</td>
                  </tr>
                ))}
                {approval.usages.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">{t('compliance.noRecords')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
