import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { StatusBadge } from '../components/common/StatusBadge';

export default function DpdCreate() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['dpd-categories'],
    queryFn: async () => (await api.get('/api/dpd/categories')).data,
  });

  const { data: approvedSpds, isLoading: spdsLoading } = useQuery({
    queryKey: ['approved-spds'],
    queryFn: async () => (await api.get('/api/spd/approved')).data,
  });

  const [spdId, setSpdId] = useState('');
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [reports, setReports] = useState([{ title: '', description: '', attachment: null }]);
  const [expenses, setExpenses] = useState([{ category_id: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], attachment: null }]);
  const [error, setError] = useState('');

  const totalNominal = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/api/dpd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dpds']);
      navigate('/dpd');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal membuat DPD');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const formData = new FormData();
    formData.append('spd_id', spdId);
    formData.append('submission_date', submissionDate);

    reports.forEach((r, i) => {
      formData.append(`reports[${i}][title]`, r.title);
      if (r.description) formData.append(`reports[${i}][description]`, r.description);
      if (r.attachment) formData.append(`reports[${i}][attachment]`, r.attachment);
    });

    expenses.forEach((e, i) => {
      if (!e.description || !e.amount || !e.category_id) return;
      formData.append(`expenses[${i}][category_id]`, e.category_id);
      formData.append(`expenses[${i}][description]`, e.description);
      formData.append(`expenses[${i}][amount]`, e.amount);
      formData.append(`expenses[${i}][expense_date]`, e.expense_date);
      if (e.attachment) formData.append(`expenses[${i}][attachment]`, e.attachment);
    });

    createMutation.mutate(formData);
  };

  const addReport = () => setReports([...reports, { title: '', description: '', attachment: null }]);
  const removeReport = (idx) => setReports(reports.filter((_, i) => i !== idx));
  const updateReport = (idx, field, value) => {
    const r = [...reports];
    r[idx] = { ...r[idx], [field]: value };
    setReports(r);
  };

  const addExpense = () => setExpenses([...expenses, { category_id: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], attachment: null }]);
  const removeExpense = (idx) => setExpenses(expenses.filter((_, i) => i !== idx));
  const updateExpense = (idx, field, value) => {
    const e = [...expenses];
    e[idx] = { ...e[idx], [field]: value };
    setExpenses(e);
  };

  if (catsLoading) return <div className="py-8 text-center">Memuat kategori...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Buat DPD Baru</h1>

      {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-semibold">Informasi Dasar</h3>
          <FormField
            label="SPD (Approved)"
            as="select"
            value={spdId}
            onChange={(e) => setSpdId(e.target.value)}
            options={approvedSpds?.map(s => ({ value: s.id, label: `${s.spd_number} - ${s.destination}` })) || []}
            required
          />
          <FormField
            label="Tanggal Pengajuan"
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
            required
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Laporan Kegiatan (Opsional)</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addReport}>+ Tambah</Button>
          </div>
          {reports.map((r, i) => (
            <div key={i} className="border rounded p-4 space-y-3 bg-gray-50">
              <div className="flex justify-between">
                <span className="font-medium">Laporan #{i + 1}</span>
                {reports.length > 1 && <Button variant="ghost" size="sm" variant="danger" onClick={() => removeReport(i)}>Hapus</Button>}
              </div>
              <FormField label="Judul" value={r.title} onChange={(e) => updateReport(i, 'title', e.target.value)} required />
              <FormField label="Deskripsi" as="textarea" value={r.description} onChange={(e) => updateReport(i, 'description', e.target.value)} rows={3} />
              <FormField label="File (PDF/Gambar)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateReport(i, 'attachment', e.target.files[0])} />
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Item Nota / Reimbursement (Minimal 1)</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addExpense}>+ Tambah</Button>
          </div>
          {expenses.map((e, i) => (
            <div key={i} className="border rounded p-4 space-y-3 bg-gray-50">
              <div className="flex justify-between">
                <span className="font-medium">Item #{i + 1}</span>
                {expenses.length > 1 && <Button variant="ghost" size="sm" variant="danger" onClick={() => removeExpense(i)}>Hapus</Button>}
              </div>
              <FormField
                label="Kategori"
                as="select"
                value={e.category_id}
                onChange={(ev) => updateExpense(i, 'category_id', ev.target.value)}
                options={categories?.map(c => ({ value: c.id, label: c.name })) || []}
                required
              />
              <FormField label="Deskripsi" value={e.description} onChange={(ev) => updateExpense(i, 'description', ev.target.value)} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nominal (Rp)" type="number" step="1000" min="0" value={e.amount} onChange={(ev) => updateExpense(i, 'amount', ev.target.value)} required />
                <FormField label="Tanggal" type="date" value={e.expense_date} onChange={(ev) => updateExpense(i, 'expense_date', ev.target.value)} required />
              </div>
              <FormField label="File Nota (PDF/Gambar)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(ev) => updateExpense(i, 'attachment', ev.target.files[0])} />
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-right text-2xl font-bold text-blue-700">
            Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalNominal)}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/dpd')}>Batal</Button>
          <Button type="submit" isLoading={createMutation.isPending}>Simpan DPD</Button>
        </div>
      </form>
    </div>
  );
}