import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { Plus } from 'lucide-react';

export default function Employees() {
  const queryClient = useQueryClient();
  const { show: showToast, ToastComponent } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get('/api/master/employees')).data
  });
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/api/master/roles')).data
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/api/master/departments')).data
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, password: data.password || undefined };
      if (editingId) return api.put(`/api/master/employees/${editingId}`, payload);
      return api.post('/api/master/employees', payload);
    },
    onSuccess: () => {
      const message = editingId ? 'Karyawan berhasil diperbarui' : 'Karyawan berhasil ditambahkan';
      showToast(message, 'success');
      queryClient.invalidateQueries(['employees']);
      handleCloseModal();
    },
    onError: (err) => {
      const message = err.response?.data?.message || err.response?.data?.errors?.role_id?.[0] || 'Gagal menyimpan data.';
      setServerError(message);
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/master/employees/${id}`),
    onSuccess: () => {
      showToast('Karyawan berhasil dihapus', 'success');
      queryClient.invalidateQueries(['employees']);
      setDeleteId(null);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Gagal menghapus karyawan';
      showToast(message, 'error');
    }
  });

  const onSubmit = (data) => {
    setServerError('');
    mutation.mutate(data);
  };

  const handleEdit = (emp) => {
    setEditingId(emp.id);
    reset({
      ...emp,
      email: emp.user?.email || '',
      password: '',
      department_id: emp.department_id || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setServerError('');
    reset();
  };

  const columns = [
    { header: 'No. Pekerjaan', accessor: 'employee_number' },
    { header: 'NIP', accessor: 'nip' },
    { header: 'Nama', accessor: 'name' },
    { header: 'Posisi', accessor: 'position' },
    { header: 'Departemen', cell: (row) => row.department?.name || '-' },
    { header: 'Role', cell: (row) => row.role?.name || '-' },
  ];

  return (
    <div>
      {ToastComponent}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Karyawan</h1>
          <p className="text-sm text-gray-600 mt-1">Kelola data karyawan organisasi</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Karyawan
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={employees}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(row) => setDeleteId(row.id)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Karyawan' : 'Tambah Karyawan'}
      >
        {serverError && <div className="mb-3 bg-red-50 text-red-600 p-2 rounded text-sm">{serverError}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="NIP" {...register('nip', { required: 'Wajib' })} error={errors.nip} />
          <FormField label="No. Pekerja" {...register('no_pekerja')} error={errors.no_pekerja} />
          <FormField label="Nama Lengkap" {...register('name', { required: 'Wajib' })} error={errors.name} />
          <FormField label="Email" type="email" {...register('email', { required: 'Wajib' })} error={errors.email} />

          <FormField
            label="Password"
            type="password"
            {...register('password', { required: !editingId ? 'Wajib untuk user baru' : false })}
            error={errors.password}
            placeholder={editingId ? "Kosongkan jika tidak ubah" : ""}
          />

          <FormField label="Posisi" {...register('position')} />

          <FormField
            as="select"
            label="Role"
            {...register('role_id', { required: 'Wajib' })}
            error={errors.role_id}
            options={[{value: '', label: 'Pilih Role...'}, ...roles.map(r => ({value: r.id, label: r.name}))]}
          />

          <FormField
            as="select"
            label="Departemen"
            {...register('department_id', { required: 'Wajib' })}
            error={errors.department_id}
            options={[{value: '', label: 'Pilih Departemen...'}, ...departments.map(d => ({value: d.id, label: d.name}))]}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Batal</Button>
            <Button type="submit" isLoading={mutation.isPending}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Hapus Karyawan"
        message="Apakah Anda yakin? Akun login terkait juga akan terhapus."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
