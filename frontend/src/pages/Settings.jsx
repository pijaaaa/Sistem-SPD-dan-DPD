import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';

const SETTING_META = {
  dpd_submission_deadline_days: {
    label: 'Batas Waktu Pengajuan DPD (hari)',
    description: 'Jumlah hari setelah SPD selesai yang masih boleh mengajukan DPD. Harus bilangan bulat positif.',
    type: 'number',
    step: 1,
    min: 1,
  },
  max_nominal_per_day: {
    label: 'Maksimal Nominal per Hari Dinas (Rp)',
    description: 'Batas rata-rata nominal DPD per hari dinas. Jika melebihi, muncul peringatan saat approval (bukan block). Harus angka positif.',
    type: 'number',
    step: '1000',
    min: 1,
  },
};

const formatIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export default function Settings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const res = await api.get('/api/settings');
      const obj = {};
      res.data.forEach(s => {
        obj[s.key] = s.value;
        if (!(s.key in form)) {
          setForm(prev => ({ ...prev, [s.key]: s.value }));
        }
      });
      return res.data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ['app-settings-history'],
    queryFn: async () => (await api.get('/api/settings/history')).data,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        settings: Object.entries(form).map(([key, value]) => ({ key, value: String(value) })),
      };
      return (await api.put('/api/settings', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['app-settings']);
      queryClient.invalidateQueries(['app-settings-history']);
      setFieldErrors({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      const data = err.response?.data;
      setFieldErrors(data?.errors || {});
      setError(data?.message || 'Gagal menyimpan pengaturan.');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Client-side validation
    const newErrors = {};
    for (const key of Object.keys(SETTING_META)) {
      const val = form[key];
      if (val === undefined || val === null || val === '') {
        newErrors[key] = 'Nilai wajib diisi.';
        continue;
      }
      if (key === 'dpd_submission_deadline_days') {
        if (!/^\d+$/.test(String(val)) || parseInt(val) <= 0) {
          newErrors[key] = 'Harus bilangan bulat positif.';
        }
      }
      if (key === 'max_nominal_per_day') {
        if (!/^\d+(\.\d+)?$/.test(String(val)) || parseFloat(val) <= 0) {
          newErrors[key] = 'Harus angka positif.';
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) return <div className="py-8 text-center">Memuat pengaturan...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Pengaturan Sistem</h1>
      <p className="text-gray-500 text-sm mb-6">Kelola konfigurasi sistem (khusus General Manager)</p>

      {saved && <div className="mb-4 bg-green-50 text-green-600 p-3 rounded">Pengaturan berhasil disimpan.</div>}
      {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
        {Object.keys(SETTING_META).map(key => (
          <div key={key} className="bg-gray-50 rounded-lg p-4">
            <FormField
              label={SETTING_META[key].label}
              type={SETTING_META[key].type}
              step={SETTING_META[key].step}
              min={SETTING_META[key].min}
              value={form[key] ?? ''}
              onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              error={fieldErrors[key] ? { message: fieldErrors[key] } : undefined}
              required
            />
            <p className="text-xs text-gray-500 -mt-2">{SETTING_META[key].description}</p>
            <div className="text-xs text-gray-400 mt-2">
              Nilai saat ini: {key === 'max_nominal_per_day' ? formatIDR(form[key]) : form[key]}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button type="submit" isLoading={updateMutation.isPending}>Simpan Pengaturan</Button>
        </div>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Riwayat Perubahan</h2>
        {!history || history.length === 0 ? (
          <p className="text-gray-500 text-sm">Belum ada perubahan setting.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Kunci</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Nilai Lama</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Nilai Baru</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Pengubah</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{log.key === 'dpd_submission_deadline_days' ? 'Batas Waktu Pengajuan DPD' : 'Maks Nominal per Hari'}</td>
                    <td className="px-4 py-3">{log.key === 'max_nominal_per_day' ? formatIDR(log.old_value) : log.old_value}</td>
                    <td className="px-4 py-3">{log.key === 'max_nominal_per_day' ? formatIDR(log.new_value) : log.new_value}</td>
                    <td className="px-4 py-3">{log.changed_by_name}</td>
                    <td className="px-4 py-3">{new Date(log.changed_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}