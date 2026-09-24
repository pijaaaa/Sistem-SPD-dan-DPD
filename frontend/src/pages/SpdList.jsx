import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';

export default function SpdList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');

  const { data: spds, isLoading } = useQuery({
    queryKey: ['spds', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      return (await api.get(`/api/spd${params}`)).data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/spd/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['spds', statusFilter]),
  });

  const columns = [
    { header: 'No. SPD', cell: row => row.spd_number },
    { header: 'Tujuan', cell: row => row.destination },
    { header: 'Periode', cell: row => {
      const s = new Date(row.start_date), e = new Date(row.end_date);
      return s.toLocaleDateString('id-ID') + ' s/d ' + e.toLocaleDateString('id-ID');
    }},
    { header: 'Departemen', cell: row => row.department?.code || '' },
    { header: 'Lintas Dept', cell: row => row.is_cross_department ? 'Ya' : 'Tidak' },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
  ];

  const actions = (row) => (
    <>
      <Button size="sm" onClick={() => navigate(`/spd/${row.id}`)}>Detail</Button>
      {row.status === 'approved' && (
        <Button size="sm" variant="secondary" onClick={() => navigate(`/dpd/create?spd_id=${row.id}`)}>
          Buat DPD
        </Button>
      )}
    </>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daftar SPD</h1>
        <Button variant="secondary" size="sm" onClick={() => navigate('/spd/create')}>Buat SPD</Button>
      </div>

      <div className="mb-4 space-x-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1 rounded text-sm ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          Semua
        </button>
        {['pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-sm capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={spds}
        isLoading={isLoading}
        actionsSlot={actions}
      />
    </div>
  );
}