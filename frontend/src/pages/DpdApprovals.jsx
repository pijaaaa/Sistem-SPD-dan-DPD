import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { ActionButton } from '../components/common/ActionButton';
import { Modal } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { StatusBadge } from '../components/common/StatusBadge';
import { Clock, AlertTriangle } from 'lucide-react';

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

  const [rejectError, setRejectError] = useState('');

  const rejectMutation = useMutation({
    mutationFn: async ({ chainId, reason }) => api.post(`/api/dpd/approval/${chainId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dpd-my-approvals']);
      handleCloseRejectModal();
    },
    onError: (err) => {
      setRejectError(err.response?.data?.message || err.response?.data?.errors?.reason?.[0] || 'Gagal menolak DPD');
    },
  });

  const handleOpenRejectModal = (chain) => {
    setRejectChainId(chain.id);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(true);
  };

  const handleCloseRejectModal = () => {
    setRejectChainId(null);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(false);
  };

  const submitReject = (e) => {
    e.preventDefault();
    rejectMutation.mutate({ chainId: rejectChainId, reason: rejectReason });
  };

  const formatIDR = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  const columns = [
    { header: 'No. DPD', cell: row => <span className="font-medium text-gray-900">{row.dpd?.dpd_number}</span> },
    { header: 'SPD', cell: row => <span className="text-sm text-gray-600">{row.dpd?.spd?.spd_number}</span> },
    { header: 'Tujuan', cell: row => row.dpd?.spd?.destination },
    { header: 'Pengaju', cell: row => <span className="text-sm">{row.dpd?.employee?.user?.name}</span> },
    { header: 'Total Nominal', cell: row => <span className="font-medium text-emerald-700">{formatIDR(row.dpd?.total_nominal)}</span> },
    { header: 'Level', cell: row => (
      <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
        Level {row.level_order}
      </span>
    )},
    {
      header: 'Konteks',
      cell: row => row.delegated_from
        ? <span className="text-xs text-blue-700 font-medium">Atas nama {row.delegated_from.user?.name}</span>
        : <span className="text-xs text-gray-400">—</span>,
    },
    { header: 'Warnings', cell: row => row.dpd?.warnings?.length > 0
        ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            Melebihi plafon
          </span>
        )
        : <span className="text-xs text-gray-400">-</span>
    },
  ];

  const actions = (row) => (
    <>
      <ActionButton
        icon="detail"
        label="Detail"
        variant="ghost"
        onClick={() => setDetailChain(row)}
      />
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
          <h1 className="text-2xl font-bold text-gray-900">Approval DPD</h1>
          <p className="text-sm text-gray-600 mt-1">DPD yang menunggu persetujuan Anda</p>
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

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={handleCloseRejectModal} title="Tolak DPD">
        {rejectError && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm">{rejectError}</div>}
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
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm">
                {detailChain.dpd.warnings.map((w, i) => (
                  <p key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">SPD Terkait</p>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-600">No. SPD:</span> <span className="font-medium">{detailChain.dpd?.spd?.spd_number}</span></p>
                <p><span className="text-gray-600">Tujuan:</span> <span className="font-medium">{detailChain.dpd?.spd?.destination}</span></p>
                <p><span className="text-gray-600">Periode:</span> {detailChain.dpd?.spd?.start_date} s/d {detailChain.dpd?.spd?.end_date}</p>
                <p><span className="text-gray-600">Total Nominal:</span> <span className="font-medium text-emerald-700">{formatIDR(detailChain.dpd?.total_nominal)}</span></p>
              </div>
            </div>

            {detailChain.dpd?.reports?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Laporan Kegiatan</p>
                {detailChain.dpd.reports.map((r, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 bg-white">
                    <p className="font-medium text-sm">{r.title}</p>
                    {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                  </div>
                ))}
              </div>
            )}

            {detailChain.dpd?.expenses?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Item Nota</p>
                {detailChain.dpd.expenses.map((e, i) => (
                  <div key={i} className="border rounded-lg p-3 mb-2 bg-white flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{e.category?.name || 'Kategori'}: {e.description}</p>
                      <p className="text-gray-500 text-xs mt-1">{e.expense_date}</p>
                    </div>
                    <span className="font-semibold text-emerald-700">{formatIDR(e.amount)}</span>
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