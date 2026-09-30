import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { useToast } from '../components/common/Toast';
import { FileText, ReceiptText, ArrowLeft } from 'lucide-react';

export default function DpdEdit() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { show: showToast, ToastComponent } = useToast();

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['nota-categories'],
    queryFn: async () => (await api.get('/api/master/nota-categories')).data,
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
      showToast('DPD berhasil diperbarui', 'success');
      navigate(`/dpd/${id}`);
    },
    onError: (err) => {
      const d = err.response?.data;
      setError(d?.message || 'Gagal mengupdate DPD');
      setFieldErrors(d?.errors || {});
      showToast(d?.message || 'Gagal mengupdate DPD', 'error');
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

  const addReport = () => {
    setReports([...reports, { title: '', description: '', attachment: null }]);
    showToast('Laporan kegiatan ditambahkan', 'success');
  };
  const removeReport = (idx) => {
    setReports(reports.filter((_, i) => i !== idx));
    showToast('Laporan kegiatan dihapus', 'success');
  };
  const updateReport = (idx, field, value) => {
    const r = [...reports];
    r[idx] = { ...r[idx], [field]: value };
    setReports(r);
  };

  const addExpense = () => {
    setExpenses([...expenses, { category_id: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], attachment: null }]);
    showToast('Item nota ditambahkan', 'success');
  };
  const removeExpense = (idx) => {
    setExpenses(expenses.filter((_, i) => i !== idx));
    showToast('Item nota dihapus', 'success');
  };
  const updateExpense = (idx, field, value) => {
    const e = [...expenses];
    e[idx] = { ...e[idx], [field]: value };
    setExpenses(e);
  };

  if (catsLoading || dpdLoading) return <div className="py-12 text-center">Memuat data...</div>;
  if (!dpdData?.dpd) return <div className="py-12 text-center">DPD tidak ditemukan</div>;
  
  const dpd = dpdData.dpd;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {ToastComponent}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit DPD {dpd.dpd_number}</h1>
          <p className="text-sm text-gray-600 mt-1">Perbarui informasi DPD</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/dpd/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-red-600 text-xs">✕</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Terjadi Kesalahan</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {Object.keys(fieldErrors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-red-600 text-xs">✕</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Validasi Gagal</p>
            <ul className="list-disc list-inside text-sm text-red-700 mt-1">
              {Object.entries(fieldErrors).map(([key, val]) => (
                <li key={key}>
                  {key}: {Array.isArray(val) ? val.join(', ') : val}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informasi Dasar */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Informasi Dasar</h3>
                <p className="text-emerald-100 text-sm">SPD terkait dan tanggal pengajuan</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
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
        </div>

        {/* Laporan Kegiatan */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Laporan Kegiatan</h3>
                  <p className="text-blue-100 text-sm">Opsional</p>
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addReport}>
                + Tambah
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {reports.map((r, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Laporan #{i + 1}</span>
                  {reports.length > 1 && <Button size="sm" variant="danger" onClick={() => removeReport(i)}>Hapus</Button>}
                </div>
                <FormField label="Judul" value={r.title} onChange={(e) => updateReport(i, 'title', e.target.value)} placeholder="Judul laporan kegiatan..." required />
                <FormField label="Deskripsi" as="textarea" value={r.description} onChange={(e) => updateReport(i, 'description', e.target.value)} placeholder="Deskripsi laporan..." rows={3} />
                <div>
                  <FormField label="File (PDF/Gambar)" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateReport(i, 'attachment', e.target.files[0])} />
                  {r.attachment_path && !r.attachment && (
                    <p className="text-sm text-gray-500 mt-1">File saat ini: <a href={r.attachment_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Lihat file</a> (Kosongkan jika tidak ingin mengubah file)</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Item Nota / Reimbursement */}
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <ReceiptText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Item Nota / Reimbursement</h3>
                  <p className="text-amber-100 text-sm">Minimal 1 item</p>
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addExpense}>
                + Tambah
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {expenses.map((e, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Item #{i + 1}</span>
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
                <FormField label="Deskripsi" value={e.description} onChange={(ev) => updateExpense(i, 'description', ev.target.value)} placeholder="Deskripsi item nota..." required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Nominal (Rp)" type="number" step="1000" min="0" value={e.amount} onChange={(ev) => updateExpense(i, 'amount', ev.target.value)} placeholder="0" required />
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
        </div>

        {/* Total */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-700">Total Nominal</span>
            <span className="text-2xl font-bold text-emerald-700">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalNominal)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => navigate(`/dpd/${id}`)}>Batal</Button>
          <Button type="submit" isLoading={updateMutation.isPending}>
            <FileText className="w-4 h-4 mr-2" />
            Update DPD
          </Button>
        </div>
      </form>
    </div>
  );
}
