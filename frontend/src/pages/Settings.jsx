import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { Settings as SettingsIcon, Clock, DollarSign, History, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { PageLoader } from '../components/common/Loading';
import { formatCurrency } from '../utils/currency';

const SETTING_META = {
  dpd_submission_deadline_days: {
    label: 'Batas Waktu Pengajuan DPD (hari)',
    description: 'Jumlah hari setelah SPD selesai yang masih boleh mengajukan DPD. Harus bilangan bulat positif.',
    type: 'number',
    step: 1,
    min: 1,
    icon: Clock,
    color: 'emerald',
  },
  max_nominal_per_day: {
    label: 'Maksimal Nominal per Hari Dinas (Rp)',
    description: 'Batas rata-rata nominal DPD per hari dinas. Jika melebihi, muncul peringatan saat approval (bukan block). Harus angka positif.',
    type: 'number',
    step: '1000',
    min: 1,
    icon: DollarSign,
    color: 'blue',
  },
};

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

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-white/20 rounded-lg p-3">
            <SettingsIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Pengaturan Sistem</h1>
            <p className="text-emerald-100 mt-1">Kelola konfigurasi sistem (khusus General Manager)</p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Berhasil Disimpan!</p>
            <p className="text-sm text-green-700">Pengaturan telah berhasil diperbarui.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Gagal Menyimpan</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(SETTING_META).map(key => {
            const meta = SETTING_META[key];
            const Icon = meta.icon;
            const colorClasses = {
              emerald: {
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                icon: 'bg-emerald-100 text-emerald-600',
                text: 'text-emerald-900',
              },
              blue: {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                icon: 'bg-blue-100 text-blue-600',
                text: 'text-blue-900',
              },
            };
            const colors = colorClasses[meta.color];

            return (
              <div key={key} className={`${colors.bg} border-2 ${colors.border} rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`${colors.icon} rounded-lg p-3`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold ${colors.text} mb-1`}>{meta.label}</h3>
                    <p className="text-sm text-gray-600">{meta.description}</p>
                  </div>
                </div>
                
                <FormField
                  type={meta.type}
                  step={meta.step}
                  min={meta.min}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  error={fieldErrors[key] ? { message: fieldErrors[key] } : undefined}
                  required
                />
                
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nilai Saat Ini</p>
                  <p className={`text-lg font-bold ${colors.text}`}>
                    {key === 'max_nominal_per_day' ? formatCurrency(form[key]) : `${form[key]} hari`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={updateMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            Simpan Pengaturan
          </Button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-900">Riwayat Perubahan</h2>
          </div>
        </div>

        {!history || history.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Belum ada perubahan setting</p>
            <p className="text-sm text-gray-400 mt-1">Riwayat akan muncul setelah Anda mengubah pengaturan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kunci</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nilai Lama</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nilai Baru</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Pengubah</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Waktu</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {history.map((log, i) => (
                  <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {log.key === 'dpd_submission_deadline_days' ? 'Batas Waktu Pengajuan DPD' : 'Maks Nominal per Hari'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.key === 'max_nominal_per_day' ? formatCurrency(log.old_value) : `${log.old_value} hari`}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-emerald-700">
                      {log.key === 'max_nominal_per_day' ? formatCurrency(log.new_value) : `${log.new_value} hari`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.changed_by_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.changed_at).toLocaleString('id-ID')}</td>
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