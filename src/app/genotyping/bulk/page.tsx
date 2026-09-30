'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { PCR_RESULTS, GENOTYPE_COLORS, IDENTIFICATION_METHODS, EAR_PUNCH_POSITIONS } from '@/lib/constants';
import { todayString } from '@/lib/date-utils';

interface MouseOption { id: number; mouseCode: string; strain: { name: string } | null; }

interface Row {
  mouseId: string;
  targetGene: string;
  pcrResult: string;
  testedDate: string;
  identificationMethod: string;
  identificationDetail: string;
  identificationNote: string;
  _result?: 'ok' | 'error';
  _error?: string;
}

const emptyRow = (): Row => ({
  mouseId: '', targetGene: '', pcrResult: 'wt/wt', testedDate: todayString(),
  identificationMethod: '', identificationDetail: '', identificationNote: '',
});

const INITIAL_ROWS = 5;

export default function BulkGenotypingPage() {
  return (
    <Suspense>
      <BulkGenotypingContent />
    </Suspense>
  );
}

function BulkGenotypingContent() {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const [allMice, setAllMice] = useState<MouseOption[]>([]);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: INITIAL_ROWS }, emptyRow));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [bulkTestedDate, setBulkTestedDate] = useState(todayString());
  const [bulkPcrResult, setBulkPcrResult] = useState('');
  const [bulkIdMethod, setBulkIdMethod] = useState('');

  useEffect(() => {
    fetch('/api/mice').then(r => r.json()).then(setAllMice);
  }, []);

  // Pre-fill rows from URL params once mice are loaded
  useEffect(() => {
    if (initialized || allMice.length === 0) return;
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        const prefilledRows = ids.map(id => {
          const mouse = allMice.find(m => String(m.id) === id);
          return {
            ...emptyRow(),
            mouseId: id,
            targetGene: mouse?.strain?.name || '',
          };
        });
        setRows(prefilledRows);
      }
    }
    setInitialized(true);
  }, [allMice, searchParams, initialized]);

  const update = (i: number, field: keyof Row, value: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleMouseChange = (i: number, mouseId: string) => {
    const mouse = allMice.find(m => String(m.id) === mouseId);
    setRows(prev => prev.map((r, idx) => idx === i
      ? { ...r, mouseId, targetGene: r.targetGene || mouse?.strain?.name || '' }
      : r
    ));
  };

  const handleMethodChange = (i: number, method: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, identificationMethod: method, identificationDetail: '' } : r));
  };

  const handleBulkDateChange = (date: string) => {
    setBulkTestedDate(date);
    setRows(prev => prev.map(r => r._result ? r : { ...r, testedDate: date }));
  };

  const handleBulkPcrChange = (pcr: string) => {
    setBulkPcrResult(pcr);
    if (pcr) setRows(prev => prev.map(r => r._result ? r : { ...r, pcrResult: pcr }));
  };

  const handleBulkIdMethodChange = (method: string) => {
    setBulkIdMethod(method);
    if (method) setRows(prev => prev.map(r => r._result ? r : { ...r, identificationMethod: method, identificationDetail: '' }));
  };

  const addRow = () => setRows(prev => [...prev, { ...emptyRow(), testedDate: bulkTestedDate, pcrResult: bulkPcrResult || 'wt/wt', identificationMethod: bulkIdMethod }]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const validateRow = (row: Row): string | null => {
    if (!row.mouseId) return locale === 'ja' ? 'マウスを選択してください' : 'Mouse is required';
    if (!row.targetGene.trim()) return locale === 'ja' ? '対象遺伝子は必須です' : 'Target gene is required';
    if (!row.pcrResult) return locale === 'ja' ? 'PCR結果は必須です' : 'PCR result is required';
    return null;
  };

  const handleSubmit = async () => {
    let hasNewErrors = false;
    const validated = rows.map(row => {
      if (!row.mouseId || row._result) return row;
      const err = validateRow(row);
      if (err) { hasNewErrors = true; return { ...row, _result: 'error' as const, _error: err }; }
      return row;
    });
    if (hasNewErrors) {
      setRows(validated);
      return;
    }

    const toSubmit = validated.filter(r => r.mouseId && !r._result);
    if (toSubmit.length === 0) return;
    setSubmitting(true);
    const results = await Promise.allSettled(
      validated.map(async (row) => {
        if (!row.mouseId || row._result) return row;
        try {
          // 1. Create genotyping record
          const res = await fetch('/api/genotyping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mouseId: Number(row.mouseId),
              targetGene: row.targetGene.trim(),
              pcrResult: row.pcrResult,
              testedDate: row.testedDate || null,
              note: row.identificationNote.trim() || null,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            return { ...row, _result: 'error' as const, _error: data.error || 'Error' };
          }

          // 2. Update mouse identificationMethod/Detail if provided
          if (row.identificationMethod) {
            const updateData: any = { identificationMethod: row.identificationMethod };
            if (row.identificationDetail) updateData.identificationDetail = row.identificationDetail;
            await fetch(`/api/mice/${row.mouseId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData),
            });
          }

          return { ...row, _result: 'ok' as const };
        } catch (e: any) {
          return { ...row, _result: 'error' as const, _error: e.message };
        }
      })
    );
    setRows(results.map(r => (r.status === 'fulfilled' ? r.value : rows[0])));
    setDone(true);
    setSubmitting(false);
  };

  const successCount = rows.filter(r => r._result === 'ok').length;
  const errorCount = rows.filter(r => r._result === 'error').length;
  const pendingCount = rows.filter(r => r.mouseId && !r._result).length;

  const inp = 'w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-400';
  const sel = 'w-full border rounded px-1 py-1 text-xs focus:outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <div>
      <PageHeader
        title={locale === 'ja' ? 'ジェノタイピング一括登録' : 'Bulk Genotyping'}
        description={locale === 'ja' ? '複数のジェノタイピング記録を表形式で一括登録します' : 'Register multiple genotyping records at once'}
      />

      {done && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${errorCount === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-800'}`}>
          {locale === 'ja'
            ? `登録完了: 成功 ${successCount}件 / 失敗 ${errorCount}件`
            : `Done: ${successCount} succeeded / ${errorCount} failed`}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{locale === 'ja' ? '検査日' : 'Test Date'}</label>
          <input type="date" value={bulkTestedDate} onChange={e => handleBulkDateChange(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{locale === 'ja' ? 'PCR結果' : 'PCR Result'}</label>
          <select value={bulkPcrResult} onChange={e => handleBulkPcrChange(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            {PCR_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{locale === 'ja' ? '識別法' : 'ID Method'}</label>
          <select value={bulkIdMethod} onChange={e => handleBulkIdMethodChange(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            {Object.entries(IDENTIFICATION_METHODS).map(([k, v]) => <option key={k} value={k}>{locale === 'ja' ? v.ja : v.en}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400">{locale === 'ja' ? '※ 一括変更は未登録行に適用' : '* Bulk changes apply to pending rows'}</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto mb-4">
        <table className="text-xs border-collapse min-w-[1050px] w-full">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-600">
              <th className="px-2 py-2 text-center font-medium w-8">#</th>
              <th className="px-2 py-2 text-left font-medium min-w-[180px]">{locale === 'ja' ? 'マウス' : 'Mouse'} *</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{t('genotyping.gene')} *</th>
              <th className="px-2 py-2 text-left font-medium min-w-[100px]">{t('genotyping.pcr')} *</th>
              <th className="px-2 py-2 text-left font-medium w-20">{t('genotyping.genotype')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{t('genotyping.testDate')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[90px]">{t('mice.idMethod')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[90px]">{locale === 'ja' ? '位置/番号' : 'Position'}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[100px]">{t('mice.idNote')}</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b ${
                  row._result === 'ok' ? 'bg-green-50' :
                  row._result === 'error' ? 'bg-red-50' :
                  'hover:bg-slate-50/60'
                }`}
              >
                <td className="px-2 py-1 text-slate-400 text-center text-[11px]">{i + 1}</td>
                <td className="px-1 py-1">
                  {row._result === 'ok' ? (
                    <span className="text-green-700 font-medium px-1.5 text-xs">✓ {allMice.find(m => String(m.id) === row.mouseId)?.mouseCode || row.mouseId}</span>
                  ) : (
                    <div>
                      <select value={row.mouseId} onChange={e => handleMouseChange(i, e.target.value)} className={sel} disabled={!!row._result}>
                        <option value="">{t('common.select')}</option>
                        {allMice.map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
                      </select>
                      {row._error && <p className="text-red-600 text-[10px] mt-0.5 leading-tight">{row._error}</p>}
                    </div>
                  )}
                </td>
                <td className="px-1 py-1">
                  <input value={row.targetGene} onChange={e => update(i, 'targetGene', e.target.value)} className={inp} disabled={!!row._result} />
                </td>
                <td className="px-1 py-1">
                  <select value={row.pcrResult} onChange={e => update(i, 'pcrResult', e.target.value)} className={sel} disabled={!!row._result}>
                    {PCR_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: GENOTYPE_COLORS[row.pcrResult]?.bg, color: GENOTYPE_COLORS[row.pcrResult]?.text }}>
                    {row.pcrResult}
                  </span>
                </td>
                <td className="px-1 py-1">
                  <input type="date" value={row.testedDate} onChange={e => update(i, 'testedDate', e.target.value)} className={inp} disabled={!!row._result} />
                </td>
                <td className="px-1 py-1">
                  <select value={row.identificationMethod} onChange={e => handleMethodChange(i, e.target.value)} className={sel} disabled={!!row._result}>
                    <option value=""></option>
                    {Object.entries(IDENTIFICATION_METHODS).map(([k, v]) => <option key={k} value={k}>{locale === 'ja' ? v.ja : v.en}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  {row.identificationMethod === 'ear_punch' ? (
                    <select value={row.identificationDetail} onChange={e => update(i, 'identificationDetail', e.target.value)} className={sel} disabled={!!row._result}>
                      <option value=""></option>
                      {EAR_PUNCH_POSITIONS.map(p => <option key={p.value} value={p.value}>{locale === 'ja' ? p.ja : p.en}</option>)}
                    </select>
                  ) : row.identificationMethod === 'finger_cut' ? (
                    <input type="number" min="1" max="20" value={row.identificationDetail} onChange={e => update(i, 'identificationDetail', e.target.value)} className={inp} disabled={!!row._result} />
                  ) : (
                    <span className="text-slate-300 text-center block">-</span>
                  )}
                </td>
                <td className="px-1 py-1">
                  <input value={row.identificationNote} onChange={e => update(i, 'identificationNote', e.target.value)} className={inp} disabled={!!row._result} />
                </td>
                <td className="px-1 py-1 text-center">
                  {!row._result && (
                    <button onClick={() => removeRow(i)} title="Delete row" className="text-slate-300 hover:text-red-500 text-base leading-none font-bold">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <button onClick={addRow} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm">
          {locale === 'ja' ? '+ 行を追加' : '+ Add Row'}
        </button>

        {pendingCount > 0 && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            {submitting
              ? (locale === 'ja' ? '登録中...' : 'Registering...')
              : locale === 'ja'
                ? `一括登録 (${pendingCount}件)`
                : `Register All (${pendingCount})`}
          </button>
        )}

        {done && errorCount > 0 && (
          <button
            onClick={() => {
              setRows(prev => prev
                .filter(r => r._result !== 'ok')
                .map(r => ({ ...r, _result: undefined, _error: undefined }))
              );
              setDone(false);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            {locale === 'ja' ? '失敗分をリセット' : 'Reset Failed'}
          </button>
        )}

        {!done && errorCount > 0 && (
          <button
            onClick={() => {
              setRows(prev => prev.map(r => r._result === 'error' ? { ...r, _result: undefined, _error: undefined } : r));
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            {locale === 'ja' ? 'エラーをクリア' : 'Clear Errors'}
          </button>
        )}

        <Link href="/mice" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">
          {t('common.backToList')}
        </Link>
      </div>
    </div>
  );
}
