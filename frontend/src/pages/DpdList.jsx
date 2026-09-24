import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';

export default function DpdList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: dpds, isLoading } = useQuery({
    queryKey: ['dpds'],
    queryFn: async () => (await api.get('/api/dpd')).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/dpd/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['dpds']),
  });

  const columns = [
    { header: 'No. DPD', cell: row => row.dpd_number },
    { header: 'SPD', cell: row => row.spd?.spd_number },
    { header: 'Tujuan', cell: row => row.spd?.destination },
    { header: 'Pembuat', cell: row => row.employee?.user?.name },
    { header: 'Tanggal Pengajuan', accessor: 'submission_date' },
    { header: 'Total', cell: row => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.total_nominal || 0) },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
  ];

  const actions = (row) => (
    <div className="flex justify-end gap-2">
      <Button size="sm" onClick={() => navigate(`/dpd/${row.id}`)}>Detail</Button>
      {row.status === 'draft' && (
        <>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/dpd/${row.id}/edit`)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(row.id)} disabled={deleteMutation.isPending}>Hapus</Button>
        </>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daftar DPD</h1>
        <Button onClick={() => navigate('/dpd/create')}>Buat DPD</Button>
      </div>

      <DataTable
        columns={columns}
        data={dpds}
        isLoading={isLoading}
        actionsSlot={actions}
      />
    </div>
  );
}