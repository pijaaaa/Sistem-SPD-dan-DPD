import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';

export default function DpdEdit() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['dpd-categories'],
    queryFn: async () => (await api.get('/api/dpd/categories')).data,
  });

  const { data: dpdData, isLoading: dpdLoading } = useQuery({
    queryKey: ['dpd', id],
    queryFn: async () => (await api.get(`/api/dpd/${id}`)).data,
  });

  const [submissionDate, setSubmissionDate] = useState('');
  const [reports, setReports] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (dpdData?.dpd) {
      const dpd = dpdData.dpd;
      setSubmissionDate(dpd.submission_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
      
      if (dpd.reports?.length > 0) {
        setReports(dpd.reports.map(r => ({ id: r.id, title: r.title, description: r.description || '', attachment: null, attachment_path: r.attachment_path })));
      } else {
        setReports([{ title: '', description: '', attachment: null }]);
      }

      if (dpd.expenses?.length > 0) {
        setExpenses(dpd.expenses.map(e => ({ id: e.id, category_id: e.category_id, description: e.description, amount: e.amount, expense_date: e.expense_date?.split('T')[0], attachment: null, attachment_path: e.attachment_path })));
      } else {
        setExpenses([{ category_id: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], attachment: null }]);
      }
    }
  }, [dpdData]);

  const totalNominal = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const updateMutation = useMutation({
    mutationFn: async (formData) => {
      // Laravel uses _method=PUT for multipart/form-data
      formData.append('_method', 'PUT');
      const res = await api.post(`/api/dpd/${id}`, formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dpds']);
      queryClient.invalidateQueries(['dpd', id]);
      navigate(`/dpd/${id}`);
    },
    onError: (err) => {
      const d = err.response?.data;
      setError(d?.message || 'Gagal mengupdate DPD');
      setFieldErrors(d?.errors || {});
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const formData = new FormData();
    formData.append('submission_date', submissionDate);

    const validReports = reports.filter((r) => r.title || r.description || r.attachment || r.id);
    validReports.forEach((r, i) => {
      if (r.id) formData.append(`reports[${i}][id]`, r.id);
      formData.append(`reports[${i}][title]`, r.title);
      if (r.description) formData.append(`reports[${i}][description]`, r.description);
      if (r.attachment) formData.append(`reports[${i}][attachment]`, r.attachment);
    });

    const validExpenses = expenses.filter(
      (e) => e.category_id && e.description && e.amount !== '' && e.amount !== null && e.amount !== undefined,
    );
    
    if (validExpenses.length === 0) {
      setError('Minimal harus ada satu item nota / reimbursement yang lengkap.');
      return;
    }

    validExpenses.forEach((e, i) => {
      if (e.id) formData.append(`expenses[${i}][id]`, e.id);
      formData.append(`expenses[${i}][category_id]`, e.category_id);
      formData.append(`expenses[${i}][description]`, e.description);
      formData.append(`expenses[${i}][amount]`, e.amount);
      formData.append(`expenses[${i}][expense_date]`, e.expense_date);
      if (e.attachment) formData.append(`expenses[${i}][attachment]`, e.attachment);
    });

    updateMutation.mutate(formData);
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

  if (catsLoading || dpdLoading) return <div className="py-8 text-center">Memuat data...</div>;
  if (!dpdData?.dpd) return <div className="py-8 text-center">DPD tidak ditemukan</div>;
  
  const dpd = dpdData.dpd;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit DPD {dpd.dpd_number}</h1>

      {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      {Object.keys(fieldErrors).length > 0 && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded">
          <ul className="list-disc list-inside text-sm">
            {Object.entries(fieldErrors).map(([key, val]) => (
              <li key={key}>
                {key}: {Array.isArray(val) ? val.join(', ') : val}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-semibold">Informasi Dasar</h3>
          <FormField
            label="SPD Terkait"
            value={`${dpd.spd?.spd_number} - ${dpd.spd?.destination}`}
            disabled
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
              <div className="flex justify-between items-center">
                <span className="font-medium">Laporan #{i + 1}</span>
                 {reports.length > 1 && <Button size="sm" variant="danger" onClick={() => removeReport(i)}>Hapus</Button>}
              </div>
              <FormField label="Judul" value={r.title} onChange={(e) => updateReport(i, 'title', e.target.value)} required />
              <FormField label="Deskripsi" as="textarea" value={r.description} onChange={(e) => updateReport(i, 'description', e.target.value)} rows={3} />
              
              <div>
                <FormField label="File (PDF/Gambar)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateReport(i, 'attachment', e.target.files[0])} />
                {r.attachment_path && !r.attachment && (
                  <p className="text-sm text-gray-500 mt-1">File saat ini: <a href={r.attachment_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Lihat file</a> (Kosongkan jika tidak ingin mengubah file)</p>
                )}
              </div>
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
              <div className="flex justify-between items-center">
                <span className="font-medium">Item #{i + 1}</span>
                 {expenses.length > 1 && <Button size="sm" variant="danger" onClick={() => removeExpense(i)}>Hapus</Button>}
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
              <div>
                <FormField label="File Nota (PDF/Gambar)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(ev) => updateExpense(i, 'attachment', ev.target.files[0])} />
                {e.attachment_path && !e.attachment && (
                  <p className="text-sm text-gray-500 mt-1">File saat ini: <a href={e.attachment_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Lihat file</a> (Kosongkan jika tidak ingin mengubah file)</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-right text-2xl font-bold text-blue-700">
            Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalNominal)}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(`/dpd/${id}`)}>Batal</Button>
          <Button type="submit" isLoading={updateMutation.isPending}>Update DPD</Button>
        </div>
      </form>
    </div>
  );
}