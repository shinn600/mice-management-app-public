'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { useLanguage } from '@/components/LanguageContext';

interface Strain { id: number; name: string; }

export default function ExportPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [filterStrainId, setFilterStrainId] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('filter.strainId') || '';
    return '';
  });

  useEffect(() => {
    fetch('/api/strains').then(r => r.json()).then(setStrains);
  }, []);

  const fetchMice = async () => {
    const params = new URLSearchParams();
    if (filterStrainId) params.set('strainId', filterStrainId);
    const res = await fetch(`/api/mice?${params.toString()}`);
    return res.json();
  };

  const handleCSVExport = async () => {
    setLoading(true);
    try {
      const mice = await fetchMice();
      const headers = ['マウスID', '性別', '系統', '生年月日', 'ステータス', 'ケージ', '父親ID', '母親ID', '遺伝子型'];
      const rows = mice.map((m: any) => [
        m.mouseCode,
        m.sex === 'M' ? 'オス' : 'メス',
        m.strain?.name || '',
        m.birthDate ? new Date(m.birthDate).toLocaleDateString('ja-JP') : '',
        m.status === 'alive' ? '生存' : m.status === 'dead' ? '死亡' : '処置済',
        m.cage?.cageCode || '',
        m.father?.mouseCode || '',
        m.mother?.mouseCode || '',
        m.genotypingRecords?.map((g: any) => g.genotypeLabel).join('; ') || '',
      ]);
      const csv = [headers.join(','), ...rows.map((r: string[]) => r.map(c => `"${c}"`).join(','))].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mice_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelExport = async () => {
    setLoading(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const mice = await fetchMice();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('個体一覧');
      ws.columns = [
        { header: 'マウスID', key: 'mouseCode', width: 15 },
        { header: '性別', key: 'sex', width: 8 },
        { header: '系統', key: 'strain', width: 15 },
        { header: '生年月日', key: 'birthDate', width: 12 },
        { header: 'ステータス', key: 'status', width: 10 },
        { header: 'ケージ', key: 'cage', width: 10 },
        { header: '父親ID', key: 'father', width: 15 },
        { header: '母親ID', key: 'mother', width: 15 },
        { header: '遺伝子型', key: 'genotype', width: 15 },
      ];
      ws.getRow(1).font = { bold: true };
      mice.forEach((m: any) => {
        ws.addRow({
          mouseCode: m.mouseCode,
          sex: m.sex === 'M' ? 'オス' : 'メス',
          strain: m.strain?.name || '',
          birthDate: m.birthDate ? new Date(m.birthDate).toLocaleDateString('ja-JP') : '',
          status: m.status === 'alive' ? '生存' : m.status === 'dead' ? '死亡' : '処置済',
          cage: m.cage?.cageCode || '',
          father: m.father?.mouseCode || '',
          mother: m.mother?.mouseCode || '',
          genotype: m.genotypingRecords?.map((g: any) => g.genotypeLabel).join('; ') || '',
        });
      });
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mice_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('export.title')} description={t('export.description')} />

      <div className="mb-6 max-w-xs">
        <label className="block text-sm font-medium mb-1">{t('mice.strain')}</label>
        <select value={filterStrainId} onChange={e => { setFilterStrainId(e.target.value); localStorage.setItem('filter.strainId', e.target.value); }} className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="">{t('mice.allStrains')}</option>
          {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="font-semibold mb-2">{t('export.csv')}</h2>
          <p className="text-sm text-slate-500 mb-4">{t('export.csvDesc')}</p>
          <button onClick={handleCSVExport} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50">
            {loading ? t('common.processing') : t('export.csvDownload')}
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="font-semibold mb-2">{t('export.excel')}</h2>
          <p className="text-sm text-slate-500 mb-4">{t('export.excelDesc')}</p>
          <button onClick={handleExcelExport} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
            {loading ? t('common.processing') : t('export.excelDownload')}
          </button>
        </div>
      </div>
    </div>
  );
}
