import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { Button } from '../components/common/Button';
import { ActionButton } from '../components/common/ActionButton';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../utils/dateFormat';
import { CheckCircle2, Clock } from 'lucide-react';

export default function Approvals() {
  const queryClient = useQueryClient();
  const [rejectChainId, setRejectChainId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['my-approvals'],
    queryFn: async () => (await api.get('/api/spd/my-approvals')).data,
    refetchInterval: 60000
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
    { header: 'No. SPD', cell: row => <span className="font-medium text-gray-900">{row.spd?.spd_number}</span> },
    { header: 'Tujuan', cell: row => row.spd?.destination },
    { header: 'Tanggal', cell: row => <span className="text-sm">{`${formatDate(row.spd?.start_date)} s/d ${formatDate(row.spd?.end_date)}`}</span> },
    { header: 'Karyawan', cell: row => row.spdEmployee?.employee?.name || '(Grup/Semua)' },
    { header: 'Level', cell: row => (
      <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
        Level {row.level_order}
      </span>
    )},
    {
      header: 'Konteks',
      cell: row => row.delegated_from
        ? <span className="text-xs text-blue-700 font-medium">Atas nama {row.delegated_from.name}</span>
        : <span className="text-xs text-gray-400">—</span>,
    },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
  ];

  const actions = (row) => (
    <>
      <ActionButton 
        icon="approve"
        label="Approve"
        variant="success"
        onClick={() => approveMutation.mutate(row.id)}
        disabled={approveMutation.isPending || rejectMutation.isPending}
        isLoading={approveMutation.isPending}
      />
      <ActionButton 
        icon="reject"
        label="Reject"
        variant="danger"
        onClick={() => handleOpenRejectModal(row)}
        disabled={approveMutation.isPending || rejectMutation.isPending}
      />
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval SPD</h1>
          <p className="text-sm text-gray-600 mt-1">SPD yang menunggu persetujuan Anda</p>
        </div>
        {approvals?.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">{approvals.length} menunggu</span>
          </div>
        )}
      </div>
      
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