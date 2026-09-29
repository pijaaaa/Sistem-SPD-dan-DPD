import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { ActionButton } from '../components/common/ActionButton';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';
import { useToast } from '../components/common/Toast';

export default function DpdList() {
  const queryClient = useQueryClient();
  const { show: showToast, ToastComponent } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: dpds, isLoading } = useQuery({
    queryKey: ['dpds'],
    queryFn: async () => (await api.get('/api/dpd')).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/dpd/${id}`),
    onSuccess: () => {
      showToast('DPD berhasil dihapus', 'success');
      queryClient.invalidateQueries(['dpds']);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Gagal menghapus DPD';
      showToast(message, 'error');
    }
  });

  const columns = [
    { header: 'No. DPD', cell: row => <span className="font-medium text-gray-900">{row.dpd_number}</span> },
    { header: 'SPD', cell: row => <span className="text-sm text-gray-600">{row.spd?.spd_number}</span> },
    { header: 'Tujuan', cell: row => row.spd?.destination },
    { header: 'Pembuat', cell: row => <span className="text-sm">{row.employee?.user?.name}</span> },
    { header: 'Tanggal Pengajuan', cell: row => <span className="text-sm">{row.submission_date}</span> },
    { header: 'Total', cell: row => <span className="font-medium text-emerald-700">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.total_nominal || 0)}</span> },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
  ];

  const actions = (row) => {
    const isCreator = row.employee_id === user?.employee?.id;

    return (
      <>
        <ActionButton
          icon="detail"
          label="Detail"
          variant="primary"
          onClick={() => navigate(`/dpd/${row.id}`)}
        />
        {row.status === 'draft' && isCreator && (
          <>
            <ActionButton
              icon="edit"
              label="Edit"
              variant="secondary"
              onClick={() => navigate(`/dpd/${row.id}/edit`)}
            />
            <ActionButton
              icon="hapus"
              label="Hapus"
              variant="danger"
              onClick={() => deleteMutation.mutate(row.id)}
              isLoading={deleteMutation.isPending}
            />
          </>
        )}
      </>
    );
  };

  return (
    <div>
      {ToastComponent}
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daftar DPD</h1>
            <p className="text-sm text-gray-600 mt-1">Deklarasi Perjalanan Dinas yang telah dibuat</p>
          </div>
          <Button onClick={() => navigate('/dpd/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Buat DPD Baru
          </Button>
        </div>

      <DataTable
        columns={columns}
        data={dpds}
        isLoading={isLoading}
        actionsSlot={actions}
      />
      </div>
    </div>
  );
}