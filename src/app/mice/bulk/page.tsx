'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';
import { STATUS_LABELS } from '@/lib/constants';
import { isBackgroundStrainOf } from '@/lib/utils';

interface Strain { id: number; name: string; geneticBackground: string | null; }
interface Substrain { id: number; number: number; color: string; }
interface Cage { id: number; cageCode: string; maxCapacity: number; _count: { mice: number }; }
interface MouseOption { id: number; mouseCode: string; sex: string; strainId: number; }

interface Row {
  _prefix: string;
  mouseCodeSuffix: string;
  sex: string;
  strainId: string;
  substrainId: string;
  birthDate: string;
  status: string;
  cageId: string;
  fatherId: string;
  motherId: string;
  note: string;
  _result?: 'ok' | 'error';
  _error?: string;
}

const emptyRow = (): Row => ({
  _prefix: '', mouseCodeSuffix: '', sex: 'M', strainId: '', substrainId: '', birthDate: '', status: 'alive',
  cageId: '', fatherId: '', motherId: '', note: '',
});

const fullMouseCode = (row: Row) => row._prefix ? row._prefix + row.mouseCodeSuffix : row.mouseCodeSuffix;

const INITIAL_ROWS = 5;

export default function BulkImportPage() {
  const { t, locale } = useLanguage();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [substrainsMap, setSubstrainsMap] = useState<Record<string, Substrain[]>>({});
  const [cages, setCages] = useState<Cage[]>([]);
  const [allMice, setAllMice] = useState<MouseOption[]>([]);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: INITIAL_ROWS }, emptyRow));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Bulk change state
  const [bulkStrainId, setBulkStrainId] = useState('');
  const [bulkSubstrainId, setBulkSubstrainId] = useState('');
  const [bulkSex, setBulkSex] = useState('');
  const [bulkBirthDate, setBulkBirthDate] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkCageId, setBulkCageId] = useState('');
  const [bulkFatherId, setBulkFatherId] = useState('');
  const [bulkMotherId, setBulkMotherId] = useState('');

  useEffect(() => {
    fetch('/api/strains').then(r => r.json()).then(setStrains);
    fetch('/api/cages').then(r => r.json()).then(setCages);
    fetch('/api/mice').then(r => r.json()).then(setAllMice);
  }, []);

  const update = (i: number, field: keyof Row, value: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  // Parent selection options: mice of the selected strain first, then mice of the strain
  // registered as its genetic background appended below — crosses with the background
  // strain are always possible.
  const parentOptions = (sex: string, strainId: string) => {
    const bySelectedStrain = allMice.filter(m => m.sex === sex && (!strainId || m.strainId === Number(strainId)));
    const selectedStrain = strains.find(s => s.id === Number(strainId));
    const backgroundStrainId = selectedStrain && strains.find(s => isBackgroundStrainOf(s, selectedStrain))?.id;
    if (!strainId || backgroundStrainId === undefined || Number(strainId) === backgroundStrainId) return bySelectedStrain;
    const backgroundMice = allMice.filter(m => m.sex === sex && m.strainId === backgroundStrainId);
    return [...bySelectedStrain, ...backgroundMice];
  };

  const fetchSubstrainsForStrain = async (strainId: string) => {
    if (!strainId || substrainsMap[strainId]) return;
    const res = await fetch(`/api/strains/${strainId}/substrains`);
    const data = await res.json();
    setSubstrainsMap(prev => ({ ...prev, [strainId]: data }));
  };

  const handleStrainChange = async (i: number, strainId: string) => {
    if (!strainId) {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, strainId: '', substrainId: '', _prefix: '', mouseCodeSuffix: '' } : r));
      return;
    }
    const strain = strains.find(s => String(s.id) === strainId);
    if (!strain) return;
    const newPrefix = `${strain.name}-`;
    fetchSubstrainsForStrain(strainId);
    try {
      const res = await fetch(`/api/mice?strainId=${strainId}&countOnly=1`);
      const { count } = await res.json();
      setRows(prev => {
        let offset = 0;
        for (let j = 0; j < i; j++) {
          if (prev[j].strainId === strainId && prev[j]._result !== 'error') offset++;
        }
        return prev.map((r, idx) => idx === i
          ? { ...r, strainId, substrainId: '', _prefix: newPrefix, mouseCodeSuffix: String(count + offset + 1).padStart(4, '0') }
          : r
        );
      });
    } catch {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, strainId, substrainId: '', _prefix: newPrefix } : r));
    }
  };

  const handleBulkStrainChange = async (strainId: string) => {
    setBulkStrainId(strainId);
    setBulkSubstrainId('');
    if (!strainId) return;
    const strain = strains.find(s => String(s.id) === strainId);
    if (!strain) return;
    const newPrefix = `${strain.name}-`;
    fetchSubstrainsForStrain(strainId);
    try {
      const res = await fetch(`/api/mice?strainId=${strainId}&countOnly=1`);
      const { count } = await res.json();
      setRows(prev => {
        let offset = 0;
        return prev.map(r => {
          if (r._result) return r;
          const suffix = String(count + offset + 1).padStart(4, '0');
          offset++;
          return { ...r, strainId, substrainId: '', _prefix: newPrefix, mouseCodeSuffix: suffix };
        });
      });
    } catch {
      setRows(prev => prev.map(r => r._result ? r : { ...r, strainId, substrainId: '', _prefix: newPrefix }));
    }
  };

  const handleBulkSubstrainChange = (substrainId: string) => {
    setBulkSubstrainId(substrainId);
    setRows(prev => prev.map(r => r._result ? r : { ...r, substrainId }));
  };

  const handleBulkSexChange = (sex: string) => {
    setBulkSex(sex);
    if (sex) setRows(prev => prev.map(r => r._result ? r : { ...r, sex }));
  };

  const handleBulkBirthDateChange = (date: string) => {
    setBulkBirthDate(date);
    if (date) setRows(prev => prev.map(r => r._result ? r : { ...r, birthDate: date }));
  };

  const handleBulkStatusChange = (status: string) => {
    setBulkStatus(status);
    if (status) setRows(prev => prev.map(r => r._result ? r : { ...r, status }));
  };

  const handleBulkCageChange = (cageId: string) => {
    setBulkCageId(cageId);
    setRows(prev => prev.map(r => r._result ? r : { ...r, cageId }));
  };

  const handleBulkFatherChange = (fatherId: string) => {
    setBulkFatherId(fatherId);
    setRows(prev => prev.map(r => r._result ? r : { ...r, fatherId }));
  };

  const handleBulkMotherChange = (motherId: string) => {
    setBulkMotherId(motherId);
    setRows(prev => prev.map(r => r._result ? r : { ...r, motherId }));
  };

  const addRow = async () => {
    const baseRow: Row = {
      ...emptyRow(),
      sex: bulkSex || 'M',
      birthDate: bulkBirthDate,
      status: bulkStatus || 'alive',
      cageId: bulkCageId,
      fatherId: bulkFatherId,
      motherId: bulkMotherId,
      strainId: bulkStrainId,
      substrainId: bulkSubstrainId,
      _prefix: bulkStrainId ? (strains.find(s => String(s.id) === bulkStrainId)?.name + '-' || '') : '',
    };
    if (bulkStrainId) {
      try {
        const res = await fetch(`/api/mice?strainId=${bulkStrainId}&countOnly=1`);
        const { count } = await res.json();
        setRows(prev => {
          const offset = prev.filter(r => r.strainId === bulkStrainId && !r._result).length;
          return [...prev, { ...baseRow, mouseCodeSuffix: String(count + offset + 1).padStart(4, '0') }];
        });
        return;
      } catch { /* fall through */ }
    }
    setRows(prev => [...prev, baseRow]);
  };

  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const validateRow = (row: Row): string | null => {
    if (!row.mouseCodeSuffix.trim()) return locale === 'ja' ? 'マウスIDは必須です' : 'Mouse ID is required';
    if (!row.sex) return locale === 'ja' ? '性別は必須です' : 'Sex is required';
    if (!row.strainId) return locale === 'ja' ? '系統は必須です' : 'Strain is required';
    if (!row.birthDate) return locale === 'ja' ? '生年月日は必須です' : 'Birth date is required';
    return null;
  };

  const handleSubmit = async () => {
    let hasNewErrors = false;
    const validated = rows.map(row => {
      if (!fullMouseCode(row).trim() || row._result) return row;
      const err = validateRow(row);
      if (err) { hasNewErrors = true; return { ...row, _result: 'error' as const, _error: err }; }
      return row;
    });
    if (hasNewErrors) {
      setRows(validated);
      return;
    }

    const toSubmit = validated.filter(r => fullMouseCode(r).trim() && !r._result);
    if (toSubmit.length === 0) return;
    setSubmitting(true);
    const results = await Promise.allSettled(
      validated.map(async (row) => {
        if (!fullMouseCode(row).trim() || row._result) return row;
        try {
          const res = await fetch('/api/mice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mouseCode: fullMouseCode(row).trim(),
              sex: row.sex,
              strainId: row.strainId ? Number(row.strainId) : undefined,
              substrainId: row.substrainId ? Number(row.substrainId) : null,
              birthDate: row.birthDate || null,
              status: row.status,
              cageId: row.cageId ? Number(row.cageId) : null,
              fatherId: row.fatherId ? Number(row.fatherId) : null,
              motherId: row.motherId ? Number(row.motherId) : null,
              note: row.note || null,
            }),
          });
          if (res.ok) return { ...row, _result: 'ok' as const };
          const data = await res.json();
          return { ...row, _result: 'error' as const, _error: data.error || 'Error' };
        } catch (e: any) {
          return { ...row, _result: 'error' as const, _error: e.message };
        }
      })
    );
    setRows(results.map(r => (r.status === 'fulfilled' ? r.value : rows[0])));
    setDone(true);
    setSubmitting(false);
    fetch('/api/mice').then(r => r.json()).then(setAllMice);
  };

  const successCount = rows.filter(r => r._result === 'ok').length;
  const errorCount = rows.filter(r => r._result === 'error').length;
  const pendingCount = rows.filter(r => fullMouseCode(r).trim() && !r._result).length;

  const inp = 'w-full border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-400';
  const sel = 'w-full border rounded px-1 py-1 text-xs focus:outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400';
  const bulkSel = 'border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400';

  return (
    <div>
      <PageHeader
        title={locale === 'ja' ? '一括登録' : 'Bulk Register'}
        description={locale === 'ja' ? '複数のマウスを表形式で一括登録します' : 'Register multiple mice at once in a table format'}
      />

      {done && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${errorCount === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-800'}`}>
          {locale === 'ja'
            ? `登録完了: 成功 ${successCount}件 / 失敗 ${errorCount}件`
            : `Done: ${successCount} succeeded / ${errorCount} failed`}
        </div>
      )}

      {/* Bulk change panel */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-start gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('mice.strain')}</label>
          <select value={bulkStrainId} onChange={e => handleBulkStrainChange(e.target.value)} className={bulkSel}>
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {(substrainsMap[bulkStrainId] || []).length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('strains.substrain')}</label>
            <select value={bulkSubstrainId} onChange={e => handleBulkSubstrainChange(e.target.value)} className={bulkSel}>
              <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
              {(substrainsMap[bulkStrainId] || []).map(ss => <option key={ss.id} value={ss.id}>#{ss.number}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('mice.sex')}</label>
          <select value={bulkSex} onChange={e => handleBulkSexChange(e.target.value)} className={bulkSel}>
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            <option value="M">♂</option>
            <option value="F">♀</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('mice.birthDate')}</label>
          <input type="date" value={bulkBirthDate} onChange={e => handleBulkBirthDateChange(e.target.value)} className={bulkSel} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('mice.status')}</label>
          <select value={bulkStatus} onChange={e => handleBulkStatusChange(e.target.value)} className={bulkSel}>
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{locale === 'ja' ? v.ja : v.en}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('mice.cage')}</label>
          <select value={bulkCageId} onChange={e => handleBulkCageChange(e.target.value)} className={bulkSel}>
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            {cages.map(c => <option key={c.id} value={c.id}>{c.cageCode} ({c._count.mice}/{c.maxCapacity})</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('mice.fatherId')}</label>
          <select value={bulkFatherId} onChange={e => handleBulkFatherChange(e.target.value)} className={bulkSel}>
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            {parentOptions('M', bulkStrainId).map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">{t('mice.motherId')}</label>
          <select value={bulkMotherId} onChange={e => handleBulkMotherChange(e.target.value)} className={bulkSel}>
            <option value="">{locale === 'ja' ? '個別設定' : 'Per row'}</option>
            {parentOptions('F', bulkStrainId).map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400 self-center">{locale === 'ja' ? '※ 一括変更は未登録行に適用' : '* Bulk changes apply to pending rows'}</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto mb-4">
        <table className="text-xs border-collapse min-w-[1150px] w-full">
          <thead>
            <tr className="bg-slate-50 border-b text-slate-600">
              <th className="px-2 py-2 text-center font-medium w-8">#</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{t('mice.strain')} *</th>
              <th className="px-2 py-2 text-left font-medium min-w-[90px]">{t('strains.substrain')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[140px]">{t('mice.mouseCode')} *</th>
              <th className="px-2 py-2 text-left font-medium w-14">{t('mice.sex')} *</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{t('mice.birthDate')} *</th>
              <th className="px-2 py-2 text-left font-medium min-w-[80px]">{t('mice.status')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[100px]">{t('mice.cage')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{t('mice.fatherId')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[120px]">{t('mice.motherId')}</th>
              <th className="px-2 py-2 text-left font-medium min-w-[130px]">{t('common.memo')}</th>
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
                  <select value={row.strainId} onChange={e => handleStrainChange(i, e.target.value)} className={sel} disabled={!!row._result}>
                    <option value=""></option>
                    {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={row.substrainId} onChange={e => update(i, 'substrainId', e.target.value)} className={sel} disabled={!!row._result || !(substrainsMap[row.strainId]?.length)}>
                    <option value=""></option>
                    {(substrainsMap[row.strainId] || []).map(ss => <option key={ss.id} value={ss.id}>#{ss.number}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  {row._result === 'ok' ? (
                    <span className="text-green-700 font-medium px-1.5 text-xs">✓ {fullMouseCode(row)}</span>
                  ) : (
                    <div>
                      {row._prefix ? (
                        <div className="flex items-center border rounded overflow-hidden text-xs focus-within:ring-1 focus-within:ring-indigo-400">
                          <span className="px-1.5 py-1 bg-slate-100 text-slate-500 border-r select-none whitespace-nowrap">{row._prefix}</span>
                          <input
                            value={row.mouseCodeSuffix}
                            onChange={e => update(i, 'mouseCodeSuffix', e.target.value)}
                            className="flex-1 px-1.5 py-1 focus:outline-none min-w-0 disabled:bg-slate-50 disabled:text-slate-400"
                            placeholder="0001"
                            disabled={!!row._result}
                          />
                        </div>
                      ) : (
                        <input
                          value=""
                          readOnly
                          className={inp + ' bg-slate-50 text-slate-400 cursor-not-allowed'}
                          placeholder={locale === 'ja' ? '← 系統を選択' : '← Select strain'}
                        />
                      )}
                      {row._error && <p className="text-red-600 text-[10px] mt-0.5 leading-tight">{row._error}</p>}
                    </div>
                  )}
                </td>
                <td className="px-1 py-1">
                  <select value={row.sex} onChange={e => update(i, 'sex', e.target.value)} className={sel} disabled={!!row._result}>
                    <option value="M">♂</option>
                    <option value="F">♀</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input type="date" value={row.birthDate} onChange={e => update(i, 'birthDate', e.target.value)} className={inp} disabled={!!row._result} />
                </td>
                <td className="px-1 py-1">
                  <select value={row.status} onChange={e => update(i, 'status', e.target.value)} className={sel} disabled={!!row._result}>
                    <option value="alive">{t('status.alive')}</option>
                    <option value="dead">{t('status.dead')}</option>
                    <option value="processed">{t('status.processed')}</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={row.cageId} onChange={e => update(i, 'cageId', e.target.value)} className={sel} disabled={!!row._result}>
                    <option value=""></option>
                    {cages.map(c => <option key={c.id} value={c.id}>{c.cageCode} ({c._count.mice}/{c.maxCapacity})</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={row.fatherId} onChange={e => update(i, 'fatherId', e.target.value)} className={sel} disabled={!!row._result}>
                    <option value=""></option>
                    {parentOptions('M', row.strainId).map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <select value={row.motherId} onChange={e => update(i, 'motherId', e.target.value)} className={sel} disabled={!!row._result}>
                    <option value=""></option>
                    {parentOptions('F', row.strainId).map(m => <option key={m.id} value={m.id}>{m.mouseCode}</option>)}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input value={row.note} onChange={e => update(i, 'note', e.target.value)} className={inp} disabled={!!row._result} />
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
        <button
          onClick={addRow}
          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm"
        >
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
