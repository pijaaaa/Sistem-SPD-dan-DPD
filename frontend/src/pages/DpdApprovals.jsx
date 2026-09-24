import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { StatusBadge } from '../components/common/StatusBadge';

export default function DpdApprovals() {
  const queryClient = useQueryClient();
  const [rejectChainId, setRejectChainId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [detailChain, setDetailChain] = useState(null);

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['dpd-my-approvals'],
    queryFn: async () => (await api.get('/api/dpd/my-approvals')).data,
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: async (chainId) => api.post(`/api/dpd/approval/${chainId}/approve`),
    onSuccess: () => queryClient.invalidateQueries(['dpd-my-approvals']),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ chainId, reason }) => api.post(`/api/dpd/approval/${chainId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dpd-my-approvals']);
      handleCloseRejectModal();
    },
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

  const formatIDR = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const columns = [
    { header: 'No. DPD', cell: row => row.dpd?.dpd_number },
    { header: 'SPD', cell: row => row.dpd?.spd?.spd_number },
    { header: 'Tujuan', cell: row => row.dpd?.spd?.destination },
    { header: 'Pengaju', cell: row => row.dpd?.employee?.user?.name },
    { header: 'Total Nominal', cell: row => formatIDR(row.dpd?.total_nominal) },
    { header: 'Level', accessor: 'level_order' },
    {
      header: 'Konteks',
      cell: row => row.delegated_from
        ? <span className="text-xs text-blue-700">Atas nama {row.delegated_from.user?.name}</span>
        : <span className="text-xs text-gray-500">—</span>,
    },
    { header: 'Warnings', cell: row => row.dpd?.warnings?.length > 0
        ? <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs">⚠ Melebihi plafon</span>
        : <span className="text-xs text-gray-400">-</span>
    },
  ];

  const actions = (row) => (
    <>
      <Button size="sm" variant="ghost" onClick={() => setDetailChain(row)}>Detail</Button>
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
      <h1 className="text-2xl font-bold mb-6">Approval DPD Saya</h1>

      <DataTable
        columns={columns}
        data={approvals}
        isLoading={isLoading}
        actionsSlot={actions}
      />

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={handleCloseRejectModal} title="Tolak DPD">
        <form onSubmit={submitReject}>
          <FormField
            as="textarea"
            label="Alasan Penolakan"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            placeholder="Tulis alasan (minimal 10 karakter)..."
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={handleCloseRejectModal}>Batal</Button>
            <Button type="submit" variant="danger" isLoading={rejectMutation.isPending}>Tolak DPD</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailChain} onClose={() => setDetailChain(null)} title={`Detail DPD - ${detailChain?.dpd?.dpd_number || ''}`}>
        {detailChain && (
          <div className="space-y-4">
            {detailChain.dpd?.warnings?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm">
                {detailChain.dpd.warnings.map((w, i) => (
                  <p key={i}>⚠ {w}</p>
                ))}
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">SPD Terkait</p>
              <p><strong>No. SPD:</strong> {detailChain.dpd?.spd?.spd_number}</p>
              <p><strong>Tujuan:</strong> {detailChain.dpd?.spd?.destination}</p>
              <p><strong>Periode:</strong> {detailChain.dpd?.spd?.start_date} s/d {detailChain.dpd?.spd?.end_date}</p>
              <p><strong>Total Nominal:</strong> {formatIDR(detailChain.dpd?.total_nominal)}</p>
            </div>

            {detailChain.dpd?.reports?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Laporan Kegiatan</p>
                {detailChain.dpd.reports.map((r, i) => (
                  <div key={i} className="border rounded p-2 mb-2 bg-gray-50">
                    <p className="font-medium">{r.title}</p>
                    {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
                  </div>
                ))}
              </div>
            )}

            {detailChain.dpd?.expenses?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Item Nota</p>
                {detailChain.dpd.expenses.map((e, i) => (
                  <div key={i} className="border rounded p-2 mb-2 bg-gray-50 flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{e.category?.name || 'Kategori'}: {e.description}</p>
                      <p className="text-gray-500">{e.expense_date}</p>
                    </div>
                    <span className="font-semibold">{formatIDR(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {detailChain.delegated_from && (
              <p className="text-xs text-blue-700">
                Ditindak atas nama {detailChain.delegated_from.user?.name} (delegasi)
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}