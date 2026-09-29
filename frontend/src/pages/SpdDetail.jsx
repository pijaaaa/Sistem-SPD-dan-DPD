import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');

export default function SpdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rejectChainId, setRejectChainId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const [rejectError, setRejectError] = useState('');

  const { data: spd, isLoading } = useQuery({
    queryKey: ['spd', id],
    queryFn: async () => (await api.get(`/api/spd/${id}`)).data,
  });

  const approveMutation = useMutation({
    mutationFn: async (chainId) => api.post(`/api/spd/approval/${chainId}/approve`),
    onSuccess: () => queryClient.invalidateQueries(['spd', id]),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ chainId, reason }) => api.post(`/api/spd/approval/${chainId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['spd', id]);
      closeReject();
    },
    onError: (err) => {
      setRejectError(err.response?.data?.message || err.response?.data?.errors?.reason?.[0] || 'Gagal menolak SPD');
    },
  });

  const reviseMutation = useMutation({
    mutationFn: async () => api.post(`/api/spd/${id}/revise`),
    onSuccess: () => {
      queryClient.invalidateQueries(['spd', id]);
      queryClient.invalidateQueries(['spds']);
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/api/spd/${id}/export/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Check filename from Content-Disposition
      const disposition = res.headers['content-disposition'];
      let filename = `SPD_${spd?.spd_number}.pdf`;
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

  if (isLoading) return <div className="py-8 text-center">Memuat detail SPD...</div>;

  const isApprover = (spd.status === 'pending' || spd.status === 'draft');
  const showProgress = (spd.status === 'pending' || spd.status === 'rejected' || spd.status === 'approved');
  const myEmployeeId = user?.employee?.id;
  const isParticipant = (spd.employees || []).some(e => e.employee_id === myEmployeeId);
  const mySpdEmployeeId = (spd.employees || []).find(e => e.employee_id === myEmployeeId)?.id;
  const pendingChains = (spd.approvalChains || []).filter(c =>
    c.status === 'pending' &&
    (c.approver_employee_id === myEmployeeId || c.spd_employee_id === mySpdEmployeeId)
  );
  const allChains = (spd.approvalChains || []).filter(c =>
    c.spd_employee_id === mySpdEmployeeId
  );

  const openReject = (chainId) => {
    setRejectChainId(chainId);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(true);
  };
  const closeReject = () => {
    setRejectChainId(null);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(false);
  };
  const submitReject = (e) => {
    e.preventDefault();
    rejectMutation.mutate({ chainId: rejectChainId, reason: rejectReason });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Detail SPD</h1>
        <div className="flex items-center gap-4">
          <StatusBadge status={spd.status} />
          {spd.status === 'rejected' && spd.employees?.some(e => e.employee_id === myEmployeeId && e.is_primary) && (
            <Button onClick={() => reviseMutation.mutate()} isLoading={reviseMutation.isPending} variant="secondary">
              Ajukan Ulang
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
        <h2 className="text-lg font-semibold mb-4">Informasi SPD</h2>
        <div className="grid grid-cols-2 gap-4">
          <p><strong>No. SPD:</strong> {spd.spd_number}</p>
          <p><strong>Status:</strong> <StatusBadge status={spd.status} /></p>
          <p><strong>Tujuan:</strong> {spd.destination}</p>
          <p><strong>Keperluan:</strong> {spd.purpose}</p>
          <p><strong>Periode:</strong> {formatDate(spd.start_date)} s/d {formatDate(spd.end_date)}</p>
          <p><strong>Departemen:</strong> {spd.department?.name || spd.department?.code || '-'}</p>
          <p><strong>Lintas Departemen:</strong> {spd.is_cross_department ? 'Ya' : 'Tidak'}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold mb-4">Peserta SPD</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr><th className="text-left py-2">Nama</th><th className="text-left py-2">Role</th><th className="text-left py-2">Departemen</th><th className="text-left py-2">Pemohon Utama</th></tr>
          </thead>
          <tbody>
            {spd.employees?.map(se => (
              <tr key={se.id} className="border-t">
                <td className="py-2">{se.employee?.user?.name || se.employee?.name}</td>
                <td className="py-2">{se.employee?.role?.name}</td>
                <td className="py-2">{se.employee?.department?.code}</td>
                <td className="py-2">{se.is_primary ? '👑 Ya' : '✕ Tidak'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isApprover && pendingChains.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">Menunggu Persetujuan Anda</h2>
          <div className="space-y-3">
            {pendingChains.map(chain => (
              <div key={chain.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <p>Level {chain.level_order} — {chain.approver?.user?.name || chain.approver?.name || '-'}</p>
                  <p className="text-xs text-gray-500">{chain.approver?.role?.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveMutation.mutate(chain.id)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => openReject(chain.id)}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showProgress && pendingChains.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">Progress Persetujuan Anda</h2>
          <div className="space-y-2">
            {allChains.map(chain => {
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
            {allChains.length === 0 && <p className="text-gray-500">Belum ada rantai approval.</p>}
          </div>
        </div>
      )}

      {spd.status === 'approved' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">DPD</h2>
          {spd.dpd ? (
            <p>DPD sudah ada: <button onClick={() => navigate(`/dpd/${spd.dpd.id}`)} className="text-blue-600 underline hover:text-blue-800"><strong>{spd.dpd.dpd_number}</strong></button></p>
          ) : (
            spd.employees?.some(e => e.employee_id === myEmployeeId && e.is_primary) ? (
              <Button onClick={() => navigate(`/dpd/create?spd_id=${spd.id}`)}>Buat DPD</Button>
            ) : (
              <p className="text-gray-500">Hanya pengaju utama yang dapat membuat DPD.</p>
            )
          )}
        </div>
      )}

      <Modal isOpen={isRejectModalOpen} onClose={closeReject} title="Tolak SPD">
        {rejectError && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">{rejectError}</div>}
        <form onSubmit={submitReject}>
          <FormField as="textarea" label="Alasan Penolakan" rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required placeholder="Tulis alasan..." />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={closeReject}>Batal</Button>
            <Button type="submit" variant="danger" isLoading={rejectMutation.isPending}>Tolak SPD</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}