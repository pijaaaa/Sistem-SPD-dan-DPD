import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { StatusBadge } from '../components/common/StatusBadge';

export default function Approvals() {
  const queryClient = useQueryClient();
  const [rejectChainId, setRejectChainId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['my-approvals'],
    queryFn: async () => (await api.get('/api/spd/my-approvals')).data,
    refetchInterval: 60000 // auto-refresh setiap 1 menit (karena krusial)
  });

  const approveMutation = useMutation({
    mutationFn: async (chainId) => api.post(`/api/spd/approval/${chainId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-approvals']);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ chainId, reason }) => api.post(`/api/spd/approval/${chainId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-approvals']);
      handleCloseRejectModal();
    }
  });

  const handleOpenRejectModal = (chain) => {
    setRejectChainId(chain.id);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleCloseRejectModal = () => {
    setRejectChainId(null);
    setRejectReason('');
    setIsRejectModalOpen(false);
  };

  const submitReject = (e) => {
    e.preventDefault();
    rejectMutation.mutate({ chainId: rejectChainId, reason: rejectReason });
  };

  const columns = [
    { header: 'No. SPD', cell: row => row.spd?.spd_number },
    { header: 'Tujuan', cell: row => row.spd?.destination },
    { header: 'Tanggal', cell: row => `${row.spd?.start_date} s/d ${row.spd?.end_date}` },
    { header: 'Karyawan', cell: row => row.spdEmployee?.employee?.name || '(Grup/Semua)' },
    { header: 'Level', accessor: 'level_order' },
    {
      header: 'Konteks',
      cell: row => row.delegated_from
        ? <span className="text-xs text-blue-700">Atas nama {row.delegated_from.name}</span>
        : <span className="text-xs text-gray-500">—</span>,
    },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
  ];

  const actions = (row) => (
    <>
      <Button 
        size="sm" 
        onClick={() => approveMutation.mutate(row.id)}
        disabled={approveMutation.isPending || rejectMutation.isPending}
      >
        Approve
      </Button>
      <Button 
        size="sm" 
        variant="danger" 
        onClick={() => handleOpenRejectModal(row)}
        disabled={approveMutation.isPending || rejectMutation.isPending}
      >
        Reject
      </Button>
    </>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Approval SPD Saya</h1>
      
      <DataTable 
        columns={columns} 
        data={approvals} 
        isLoading={isLoading}
        actionsSlot={actions}
      />

      <Modal 
        isOpen={isRejectModalOpen} 
        onClose={handleCloseRejectModal}
        title="Tolak SPD"
      >
        <form onSubmit={submitReject}>
          <FormField 
            as="textarea"
            label="Alasan Penolakan" 
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            placeholder="Tulis alasan..."
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={handleCloseRejectModal}>Batal</Button>
            <Button type="submit" variant="danger" isLoading={rejectMutation.isPending}>Tolak SPD</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}