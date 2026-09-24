import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { StatusBadge } from '../components/common/StatusBadge';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');

export default function SpdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rejectChainId, setRejectChainId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

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
    onSuccess: () => queryClient.invalidateQueries(['spd', id]),
  });

  if (isLoading) return <div className="py-8 text-center">Memuat detail SPD...</div>;

  const isApprover = (spd.status === 'pending' || spd.status === 'draft');
  const pendingChains = (spd.approvalChains || []).filter(c => c.status === 'pending');

  const openReject = (chainId) => {
    setRejectChainId(chainId);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };
  const closeReject = () => {
    setRejectChainId(null);
    setRejectReason('');
    setIsRejectModalOpen(false);
  };
  const submitReject = (e) => {
    e.preventDefault();
    rejectMutation.mutate({ chainId: rejectChainId, reason: rejectReason });
    closeReject();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Detail SPD</h1>
        <StatusBadge status={spd.status} />
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

      {isApprover && pendingChains.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">Progress Persetujuan</h2>
          <div>
            {(spd.approvalChains || []).map(chain => (
              <div key={chain.id} className="border-b py-2 text-sm flex justify-between">
                <span>Level {chain.level_order} — {chain.approver?.user?.name || '-'}</span>
                <StatusBadge status={chain.status} />
              </div>
            ))}
            {(spd.approvalChains || []).length === 0 && <p className="text-gray-500">Belum ada rantai approval.</p>}
          </div>
        </div>
      )}

      {spd.status === 'approved' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-semibold mb-4">DPD</h2>
          {spd.dpd ? (
            <p>DPD sudah ada: <strong>{spd.dpd.dpd_number}</strong></p>
          ) : (
            <Button onClick={() => navigate(`/dpd/create?spd_id=${spd.id}`)}>Buat DPD</Button>
          )}
        </div>
      )}

      <Modal isOpen={isRejectModalOpen} onClose={closeReject} title="Tolak SPD">
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