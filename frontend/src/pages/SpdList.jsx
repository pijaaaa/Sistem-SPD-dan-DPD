import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { ActionButton } from '../components/common/ActionButton';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Plus, Filter } from 'lucide-react';
import { useToast } from '../components/common/Toast';

export default function SpdList() {
  const queryClient = useQueryClient();
  const { show: showToast, ToastComponent } = useToast();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
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
    onSuccess: () => {
      showToast('SPD berhasil dihapus', 'success');
      queryClient.invalidateQueries(['spds', statusFilter]);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Gagal menghapus SPD';
      showToast(message, 'error');
    }
  });

  const canCreateSpd = hasRole('user') || hasRole('team_manager') || hasRole('manager');

  const columns = [
    { header: 'No. SPD', cell: row => <span className="font-medium text-gray-900">{row.spd_number}</span> },
    { header: 'Tujuan', cell: row => row.destination },
    { header: 'Periode', cell: row => {
      const s = new Date(row.start_date), e = new Date(row.end_date);
      return <span className="text-sm">{s.toLocaleDateString('id-ID')} s/d {e.toLocaleDateString('id-ID')}</span>;
    }},
    { header: 'Departemen', cell: row => <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">{row.department?.code || '-'}</span> },
    { header: 'Lintas Dept', cell: row => row.is_cross_department ? <span className="text-amber-600 text-xs font-medium">Ya</span> : <span className="text-gray-400 text-xs">Tidak</span> },
    { header: 'Status', cell: row => <StatusBadge status={row.status} /> },
  ];

  const actions = (row) => {
    const isPrimary = row.employees?.some(e => e.employee_id === user?.employee?.id && e.is_primary);
    return (
      <>
        <ActionButton
          icon="detail"
          label="Detail"
          variant="primary"
          onClick={() => navigate(`/spd/${row.id}`)}
        />
        {row.status === 'approved' && !row.dpd && isPrimary && (
          <ActionButton
            icon="buat"
            label="Buat DPD"
            variant="secondary"
            onClick={() => navigate(`/dpd/create?spd_id=${row.id}`)}
          />
        )}
        {row.dpd && (
          <ActionButton
            icon="lihat"
            label="Lihat DPD"
            variant="secondary"
            onClick={() => navigate(`/dpd/${row.dpd.id}`)}
          />
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
            <h1 className="text-2xl font-bold text-gray-900">Daftar SPD</h1>
            <p className="text-sm text-gray-600 mt-1">Kelola semua surat perjalanan dinas</p>
          </div>
          {canCreateSpd && (
            <Button variant="primary" onClick={() => navigate('/spd/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Buat SPD Baru
            </Button>
          )}
        </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter Status:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !statusFilter 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            Semua
          </button>
          {['pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                statusFilter === s 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {s === 'pending' ? 'Menunggu' : s === 'approved' ? 'Disetujui' : 'Ditolak'}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={spds}
        isLoading={isLoading}
        actionsSlot={actions}
      />
      </div>
    </div>
  );
}
