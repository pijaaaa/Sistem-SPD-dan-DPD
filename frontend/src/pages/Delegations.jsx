import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';

export default function Delegations() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get('/api/master/employees')).data,
  });

  const { data: delegations, isLoading } = useQuery({
    queryKey: ['delegations'],
    queryFn: async () => (await api.get('/api/delegations')).data,
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) {
        return api.put(`/api/delegations/${editingId}`, data);
      }
      return api.post('/api/delegations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['delegations']);
      handleCloseModal();
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan delegasi.');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id) => api.post(`/api/delegations/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries(['delegations']);
      setCancelId(null);
    }
  });

  const onSubmit = (data) => mutation.mutate(data);

  const handleOpenCreate = () => {
    setEditingId(null);
    setErrorMsg('');
    reset({
      delegator_id: '',
      delegate_id: '',
      start_date: '',
      end_date: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (del) => {
    setEditingId(del.id);
    setErrorMsg('');
    reset({
      delegator_id: del.delegator_id,
      delegate_id: del.delegate_id,
      start_date: del.start_date,
      end_date: del.end_date,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
    reset({
      delegator_id: '',
      delegate_id: '',
      start_date: '',
      end_date: '',
    });
  };

  const employeeOptions = (employees || []).map(e => ({
    value: e.id,
    label: `${e.name} — ${e.role?.name || ''}`,
  }));

  const displayData = showActiveOnly
    ? (delegations || []).filter(d => d.is_active)
    : (delegations || []);

  const columns = [
    {
      header: 'Delegator (Atasan Asli)',
      cell: row => row.delegator?.name || row.delegator_id,
    },
    {
      header: 'Delegate (Pengganti)',
      cell: row => row.delegate?.name || row.delegate_id,
    },
    { header: 'Mulai', accessor: 'start_date' },
    { header: 'Berakhir', accessor: 'end_date' },
    { header: 'Status', cell: row => (
      row.is_active
        ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>
        : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Nonaktif</span>
    )},
  ];

  const actions = (row) => (
    <>
      {row.is_active && (
        <Button size="sm" variant="secondary" onClick={() => setCancelId(row.id)}>
          Batalkan
        </Button>
      )}
      <Button size="sm" onClick={() => handleEdit(row)} disabled={!row.is_active}>
        Edit
      </Button>
    </>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Delegasi Approval</h1>
          <p className="text-sm text-gray-500 mt-1">Arahkan persetujuan kepada delegate selama periode tertentu.</p>
        </div>
        <Button onClick={handleOpenCreate}>Buat Delegasi</Button>
      </div>

      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Hanya tampilkan yang aktif
        </label>
      </div>

      <DataTable 
        columns={columns} 
        data={displayData} 
        isLoading={isLoading}
        actionsSlot={actions}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={editingId ? 'Edit Delegasi' : 'Buat Delegasi'}
      >
        {errorMsg && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm mb-4">
            {errorMsg}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormField
            as="select"
            label="Delegator (Atasan yang didelegasikan)"
            options={[{ value: '', label: '-- Pilih delegator --' }, ...employeeOptions]}
            {...register('delegator_id', { required: 'Delegator wajib dipilih' })}
            error={errors.delegator_id}
          />
          <FormField
            as="select"
            label="Delegate (Penerima delegasi)"
            options={[{ value: '', label: '-- Pilih delegate --' }, ...employeeOptions]}
            {...register('delegate_id', { required: 'Delegate wajib dipilih' })}
            error={errors.delegate_id}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Tanggal Mulai"
              type="date"
              {...register('start_date', { required: 'Tanggal mulai wajib diisi' })}
              error={errors.start_date}
            />
            <FormField
              label="Tanggal Berakhir"
              type="date"
              {...register('end_date', { required: 'Tanggal berakhir wajib diisi' })}
              error={errors.end_date}
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Batal</Button>
            <Button type="submit" isLoading={mutation.isPending}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelMutation.mutate(cancelId)}
        title="Batalkan Delegasi"
        message="Apakah Anda yakin ingin membatalkan delegasi ini?"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}