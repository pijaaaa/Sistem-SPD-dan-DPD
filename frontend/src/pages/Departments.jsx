import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export default function Departments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/api/master/departments');
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) {
        return api.put(`/api/master/departments/${editingId}`, data);
      }
      return api.post('/api/master/departments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/master/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments']);
      setDeleteId(null);
    }
  });

  const onSubmit = (data) => mutation.mutate(data);

  const handleEdit = (dept) => {
    setEditingId(dept.id);
    reset(dept);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset({ code: '', name: '' });
  };

  const columns = [
    { header: 'Kode', accessor: 'code' },
    { header: 'Nama Departemen', accessor: 'name' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Departments</h1>
        <Button onClick={() => setIsModalOpen(true)}>Tambah Departemen</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={departments} 
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={(row) => setDeleteId(row.id)}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={editingId ? 'Edit Departemen' : 'Tambah Departemen'}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormField 
            label="Kode Departemen" 
            {...register('code', { required: 'Kode wajib diisi' })} 
            error={errors.code}
          />
          <FormField 
            label="Nama Departemen" 
            {...register('name', { required: 'Nama wajib diisi' })} 
            error={errors.name}
          />
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Batal</Button>
            <Button type="submit" isLoading={mutation.isPending}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Hapus Departemen"
        message="Apakah Anda yakin ingin menghapus departemen ini?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}