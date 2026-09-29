import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { ActionButton } from '../components/common/ActionButton';
import { StatusBadge } from '../components/common/StatusBadge';

const periodeCell = (r) => {
  const s = new Date(r.start_date);
  const e = new Date(r.end_date);
  return s.toLocaleDateString('id-ID') + ' s/d ' + e.toLocaleDateString('id-ID');
};

export default function MyRequests() {
  const navigate = useNavigate();

  const {
    data: spds = [],
    isLoading: spdLoading,
    isError: spdError,
    error: spdErrObj,
  } = useQuery({
    queryKey: ['my-spds'],
    queryFn: async () => (await api.get('/api/spd')).data,
  });

  const {
    data: dpds = [],
    isLoading: dpdLoading,
    isError: dpdError,
  } = useQuery({
    queryKey: ['my-dpds'],
    queryFn: async () => (await api.get('/api/dpd')).data,
  });

  const spdColumns = [
    { header: 'No. SPD', cell: (r) => r.spd_number },
    { header: 'Tujuan', cell: (r) => r.destination },
    { header: 'Periode', cell: periodeCell },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const dpdColumns = [
    { header: 'No. DPD', cell: (r) => r.dpd_number },
    { header: 'SPD', cell: (r) => r.spd?.spd_number },
    {
      header: 'Total',
      cell: (r) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
          r.total_nominal || 0,
        ),
    },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const spdActions = (row) => (
    <ActionButton
      icon="detail"
      label="Detail"
      variant="primary"
      onClick={() => navigate(`/spd/${row.id}`)}
    />
  );

  const dpdActions = (row) => (
    <ActionButton
      icon="detail"
      label="Detail"
      variant="primary"
      onClick={() => navigate(`/dpd/${row.id}`)}
    />
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SPD & DPD Saya</h1>
        <Button variant="secondary" size="sm" onClick={() => navigate('/spd/create')}>
          Buat SPD
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">SPD yang Terlibat</h2>
        {spdError ? (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            Gagal memuat SPD: {spdErrObj?.message || 'unknown error'}
          </div>
        ) : (
          <DataTable columns={spdColumns} data={spds} isLoading={spdLoading} actionsSlot={spdActions} />
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">DPD yang Diajukan</h2>
        {dpdError ? (
          <div className="bg-red-50 text-red-600 p-3 rounded">Gagal memuat DPD.</div>
        ) : (
          <DataTable columns={dpdColumns} data={dpds} isLoading={dpdLoading} actionsSlot={dpdActions} />
        )}
      </div>
    </div>
  );
}
