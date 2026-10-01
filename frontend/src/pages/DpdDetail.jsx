import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { FilePreviewModal } from '../components/common/FilePreviewModal';
import { PageLoader } from '../components/common/Loading';
import { useToast } from '../components/common/Toast';
import { FileText, ReceiptText, MapPin, Clock, ArrowLeft, AlertCircle, Download } from 'lucide-react';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');
const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function DpdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { show: showToast, ToastComponent } = useToast();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [filePreview, setFilePreview] = useState({ isOpen: false, url: null, name: null });

  const { data, isLoading } = useQuery({
    queryKey: ['dpd', id],
    queryFn: async () => (await api.get(`/api/dpd/${id}`)).data,
  });

  const validateMutation = useMutation({
    mutationFn: async () => (await api.post(`/api/dpd/${id}/validate-submission`, { dpd_id: id })).data,
  });

  const submitMutation = useMutation({
    mutationFn: async () => await api.post(`/api/dpd/${id}/generate-approval-chain`),
    onSuccess: () => {
      queryClient.invalidateQueries(['dpd', id]);
      setIsSubmitModalOpen(false);
      showToast('DPD berhasil diajukan untuk persetujuan', 'success');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Gagal mengajukan DPD', 'error');
    },
  });

  const reviseMutation = useMutation({
    mutationFn: async () => await api.post(`/api/dpd/${id}/revise`),
    onSuccess: () => {
      queryClient.invalidateQueries(['dpd', id]);
      queryClient.invalidateQueries(['dpds']);
      showToast('DPD berhasil dikembalikan ke draft untuk revisi', 'success');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Gagal memproses revisi DPD', 'error');
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/api/dpd/${id}/export/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const disposition = res.headers['content-disposition'];
      let filename = `DPD_${dpd?.dpd_number}.pdf`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const match = disposition.match(/filename=(.+)/);
        if (match) filename = match[1].trim();
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      showToast('PDF DPD berhasil diunduh', 'success');
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Gagal mengunduh PDF', 'error');
    },
  });

  if (isLoading) return <PageLoader />;

  const dpd = data.dpd;
  const tripDays = data.trip_days;

  if (!dpd) return <div className="py-12 text-center">Data DPD tidak ditemukan.</div>;

  const isCreator = dpd.employee_id === user?.employee?.id;
  const isParticipant = isCreator || (dpd.spd?.employees || []).some(e => e.employee_id === user?.employee?.id);

  const handleOpenSubmit = async () => {
    try {
      await validateMutation.mutateAsync();
      setIsSubmitModalOpen(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Validasi gagal. Periksa data DPD Anda.', 'error');
    }
  };

  const confirmSubmit = () => {
    submitMutation.mutate();
  };

  const openFilePreview = (url, name) => {
    setFilePreview({ isOpen: true, url, name });
  };

  const closeFilePreview = () => {
    setFilePreview({ isOpen: false, url: null, name: null });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {ToastComponent}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dpd')} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{dpd.dpd_number || '-'}</h1>
            <p className="text-sm text-gray-600 mt-1">Detail DPD</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={dpd.status} />
          {isParticipant && (
            <Button
              variant="secondary"
              onClick={() => downloadPdfMutation.mutate()}
              isLoading={downloadPdfMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          )}
          {dpd.status === 'rejected' && isCreator && (
            <Button variant="secondary" size="sm" onClick={() => reviseMutation.mutate()} isLoading={reviseMutation.isPending}>
              Revisi
            </Button>
          )}
          {dpd.status === 'draft' && isCreator && (
            <Button onClick={handleOpenSubmit} isLoading={validateMutation.isPending}>
              Ajukan DPD
            </Button>
          )}
        </div>
      </div>

      {/* Informasi DPD */}
      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Informasi DPD</h3>
              <p className="text-emerald-100 text-sm">Detail nomor, status, dan nominal</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">No. DPD</p>
              <p className="font-medium text-gray-900">{dpd.dpd_number || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
              <StatusBadge status={dpd.status} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Nominal</p>
              <p className="font-medium text-emerald-700">{formatCurrency(dpd.total_nominal)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tanggal Pengajuan</p>
              <p className="font-medium text-gray-900">{formatDate(dpd.submission_date)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Pengaju</p>
              <p className="font-medium text-gray-900">{dpd.employee?.user?.name || '-'}</p>
            </div>
            {dpd.spm_date && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Tanggal SPM</p>
                <p className="font-medium text-gray-900">{formatDate(dpd.spm_date)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Persetujuan */}
      {dpd.approvalChains?.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Progress Persetujuan</h3>
                <p className="text-purple-100 text-sm">Riwayat persetujuan DPD</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {dpd.approvalChains.map(chain => {
              const rejectLog = chain.logs?.find(log => log.action === 'rejected');
              return (
                <div key={chain.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                        {chain.level_order}
                      </span>
                      <span className="font-medium text-gray-900">
                        {chain.approver?.user?.name || chain.approver?.name || '-'}
                      </span>
                    </div>
                    <StatusBadge status={chain.status} />
                  </div>
                  {rejectLog && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-red-900">Alasan Penolakan</p>
                        <p className="text-sm text-red-700 mt-0.5">{rejectLog.rejection_reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SPD Terkait */}
      {dpd.spd && (
        <div className="bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-100 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">SPD Terkait</h3>
                <p className="text-cyan-100 text-sm">Informasi perjalanan dinas</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">No. SPD</p>
                <p className="font-medium text-gray-900">{dpd.spd.spd_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Tujuan</p>
                <p className="font-medium text-gray-900">{dpd.spd.destination}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Periode</p>
                <p className="font-medium text-gray-900">{formatDate(dpd.spd.start_date)} s/d {formatDate(dpd.spd.end_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Jumlah Hari</p>
                <p className="font-medium text-gray-900">{tripDays} hari</p>
              </div>
            </div>

            {dpd.spd.employees?.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Peserta SPD</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Nama</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Pemohon Utama</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dpd.spd.employees.map(se => (
                        <tr key={se.id}>
                          <td className="py-2 px-3">
                            {se.employee?.user?.name || se.employee?.name || '-'}
                          </td>
                          <td className="py-2 px-3">
                            {se.is_primary ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                Ya
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">Tidak</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Laporan Kegiatan */}
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Laporan Kegiatan</h3>
              <p className="text-indigo-100 text-sm">Laporan dari perjalanan dinas</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {dpd.reports?.length > 0 ? (
            <div className="space-y-4">
              {dpd.reports.map((r, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-1">{r.title}</h4>
                  {r.description && <p className="text-sm text-gray-600 mb-2">{r.description}</p>}
                  {r.attachment_urls && r.attachment_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {r.attachment_urls.map((url, idx) => (
                        <Button
                          key={idx}
                          variant="secondary"
                          size="sm"
                          onClick={() => openFilePreview(url, `${r.title} - File ${idx + 1}`)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          File {idx + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium">Belum ada laporan kegiatan</p>
              <p className="text-xs text-gray-400 mt-1">Laporan dapat ditambahkan saat membuat atau mengedit DPD</p>
            </div>
          )}
        </div>
      </div>

      {/* Item Nota / Reimbursement */}
      <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Item Nota / Reimbursement</h3>
              <p className="text-amber-100 text-sm">Rincian biaya yang dikajukan</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {dpd.expenses?.length > 0 ? (
            <div className="space-y-4">
              {dpd.expenses.map((e, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {e.category?.name || e.category_id}
                    </span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(e.amount)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{e.description}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Tanggal: {formatDate(e.expense_date)}
                  </p>
                  {e.attachment_urls && e.attachment_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {e.attachment_urls.map((url, idx) => (
                        <Button
                          key={idx}
                          variant="secondary"
                          size="sm"
                          onClick={() => openFilePreview(url, `Nota ${e.category?.name} - File ${idx + 1}`)}
                        >
                          <ReceiptText className="w-4 h-4 mr-2" />
                          File {idx + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-gray-200 pt-4 flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Total Keseluruhan</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(dpd.total_nominal)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ReceiptText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium">Belum ada item nota</p>
              <p className="text-xs text-gray-400 mt-1">Item nota dapat ditambahkan saat membuat DPD</p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Ajukan DPD">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Apakah Anda yakin ingin mengajukan DPD ini?</p>
          <p className="text-xs text-gray-500">Setelah diajukan, DPD tidak dapat diedit lagi.</p>

          {validateMutation.data?.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Peringatan
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {validateMutation.data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>Batal</Button>
            <Button onClick={confirmSubmit} isLoading={submitMutation.isPending}>Ya, Ajukan DPD</Button>
          </div>
        </div>
      </Modal>

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={filePreview.isOpen}
        onClose={closeFilePreview}
        fileUrl={filePreview.url}
        fileName={filePreview.name}
      />
    </div>
  );
}
