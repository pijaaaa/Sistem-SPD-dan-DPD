import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');
const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

export default function DpdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

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
    },
  });

  const reviseMutation = useMutation({
    mutationFn: async () => await api.post(`/api/dpd/${id}/revise`),
    onSuccess: () => {
      queryClient.invalidateQueries(['dpd', id]);
      queryClient.invalidateQueries(['dpds']);
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
  });

  if (isLoading) return <div className="py-8 text-center">Memuat detail DPD...</div>;

  const dpd = data.dpd;
  const tripDays = data.trip_days;

  if (!dpd) return <div className="py-8 text-center">Data DPD tidak ditemukan.</div>;

  const isCreator = dpd.employee_id === user?.employee?.id;
  const isParticipant = isCreator || (dpd.spd?.employees || []).some(e => e.employee_id === user?.employee?.id);

  const handleOpenSubmit = async () => {
    await validateMutation.mutateAsync();
    setIsSubmitModalOpen(true);
  };

  const confirmSubmit = () => {
    submitMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Detail DPD</h1>
        <div className="flex items-center gap-4">
          <StatusBadge status={dpd.status} />
          {dpd.status === 'draft' && isCreator && (
            <Button onClick={handleOpenSubmit} isLoading={validateMutation.isPending}>
              Ajukan DPD
            </Button>
          )}
          {dpd.status === 'rejected' && isCreator && (
            <Button onClick={() => reviseMutation.mutate()} isLoading={reviseMutation.isPending} variant="secondary">
              Revisi (Kembali ke Draft)
            </Button>
          )}
          {isParticipant && (
            <button
              onClick={() => downloadPdfMutation.mutate()}
              className="text-sm text-gray-600 underline hover:text-gray-800"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold mb-4">Informasi DPD</h2>
        <div className="grid grid-cols-2 gap-4">
          <p><strong>No. DPD:</strong> {dpd.dpd_number || '-'}</p>
          <p><strong>Status:</strong> <StatusBadge status={dpd.status} /></p>
          <p><strong>Total Nominal:</strong> {formatCurrency(dpd.total_nominal)}</p>
          <p><strong>Tanggal Pengajuan:</strong> {formatDate(dpd.submission_date)}</p>
          <p><strong>Pengaju:</strong> {dpd.employee?.user?.name || '-'}</p>
          {dpd.spm_date && <p><strong>Tanggal SPM:</strong> {formatDate(dpd.spm_date)}</p>}
        </div>
      </div>

      {dpd.approvalChains?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">Progress Persetujuan</h2>
          <div className="space-y-2">
            {dpd.approvalChains.map(chain => {
              const rejectLog = chain.logs?.find(log => log.action === 'rejected');
              return (
                <div key={chain.id} className="border p-3 rounded text-sm bg-gray-50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Level {chain.level_order} — {chain.approver?.user?.name || '-'}</span>
                    <StatusBadge status={chain.status} />
                  </div>
                  {rejectLog && (
                    <div className="mt-2 text-red-600 bg-red-50 p-2 rounded border border-red-100">
                      <strong>Alasan Penolakan:</strong> {rejectLog.rejection_reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dpd.spd && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">SPD Terkait</h2>
          <div className="grid grid-cols-2 gap-4">
            <p><strong>No. SPD:</strong> {dpd.spd.spd_number}</p>
            <p><strong>Tujuan:</strong> {dpd.spd.destination}</p>
            <p><strong>Periode:</strong> {formatDate(dpd.spd.start_date)} s/d {formatDate(dpd.spd.end_date)}</p>
            <p><strong>Jumlah Hari:</strong> {tripDays} hari</p>
          </div>

          {dpd.spd.employees?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Peserta SPD</h3>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2">Nama</th>
                    <th className="text-left py-2">Pemohon Utama</th>
                  </tr>
                </thead>
                <tbody>
                  {dpd.spd.employees.map(se => (
                    <tr key={se.id} className="border-t">
                      <td className="py-2">{se.employee?.user?.name || se.employee?.name || '-'}</td>
                      <td className="py-2">{se.is_primary ? 'Ya' : 'Tidak'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold mb-4">Laporan Kegiatan</h2>
        {dpd.reports?.length > 0 ? (
          dpd.reports.map((r, i) => (
            <div key={i} className="border rounded p-3 mb-3 bg-gray-50">
              <h4 className="font-medium">{r.title}</h4>
              <p className="text-sm text-gray-600">{r.description}</p>
              {r.attachment_path && (
                <a href={r.attachment_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">Lihat file</a>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">Belum ada laporan kegiatan.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold mb-4">Item Nota / Reimbursement</h2>
        {dpd.expenses?.length > 0 ? (
          dpd.expenses.map((e, i) => (
            <div key={i} className="border rounded p-3 mb-3 bg-gray-50">
              <p><strong>{e.category?.name || e.category_id}</strong></p>
              <p className="text-sm text-gray-600">{e.description}</p>
              <p>{formatCurrency(e.amount)}</p>
              <p className="text-sm text-gray-500">Tanggal: {formatDate(e.expense_date)}</p>
              {e.attachment_path && (
                <a href={e.attachment_path} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">Lihat file</a>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">Belum ada item nota.</p>
        )}
      </div>

      <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Ajukan DPD">
        <div className="space-y-4">
          <p>Apakah Anda yakin ingin mengajukan DPD ini? Setelah diajukan, DPD tidak dapat diedit lagi.</p>
          
          {validateMutation.data?.warnings?.length > 0 && (
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded border border-yellow-200 text-sm">
              <p className="font-semibold mb-1">Peringatan:</p>
              <ul className="list-disc pl-5">
                {validateMutation.data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>Batal</Button>
            <Button onClick={confirmSubmit} isLoading={submitMutation.isPending}>Ya, Ajukan DPD</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}