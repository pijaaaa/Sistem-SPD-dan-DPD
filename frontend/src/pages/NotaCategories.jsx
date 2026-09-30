import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { DataTable } from '../components/common/DataTable';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { Plus, ReceiptText } from 'lucide-react';

export default function NotaCategories() {
  const queryClient = useQueryClient();
  const { show: showToast, ToastComponent } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['nota-categories'],
    queryFn: async () => (await api.get('/api/master/nota-categories')).data,
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) {
        return api.put(`/api/master/nota-categories/${editingId}`, data);
      }
      return api.post('/api/master/nota-categories', data);
    },
    onSuccess: () => {
      const message = editingId ? 'Kategori nota berhasil diperbarui' : 'Kategori nota berhasil ditambahkan';
      showToast(message, 'success');
      queryClient.invalidateQueries(['nota-categories']);
      handleCloseModal();
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Gagal menyimpan kategori nota';
      showToast(message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/master/nota-categories/${id}`),
    onSuccess: () => {
      showToast('Kategori nota berhasil dihapus', 'success');
      queryClient.invalidateQueries(['nota-categories']);
      setDeleteId(null);
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Gagal menghapus kategori nota';
      showToast(message, 'error');
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  const handleEdit = (category) => {
    setEditingId(category.id);
    reset(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    reset({ code: '', name: '', description: '' });
  };

  const columns = [
    {
      header: 'Kode',
      accessor: 'code',
      cell: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          {row.code}
        </span>
      ),
    },
    { header: 'Nama Kategori', accessor: 'name' },
    { header: 'Deskripsi', accessor: 'description' },
  ];

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ReceiptText className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kategori Nota</h1>
              <p className="text-sm text-gray-600 mt-1">Kelola kategori nota (item reimbursement DPD)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {categories && (
              <span className="text-sm text-gray-500">
                {categories.length} kategori
              </span>
            )}
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable
          columns={columns}
          data={categories}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={(row) => setDeleteId(row.id)}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Kategori Nota' : 'Tambah Kategori Nota'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Kode"
            placeholder="contoh: transport"
            {...register('code', { required: 'Kode wajib diisi' })}
            error={errors.code}
          />
          <FormField
            label="Nama Kategori"
            placeholder="contoh: Transport"
            {...register('name', { required: 'Nama wajib diisi' })}
            error={errors.name}
          />
          <FormField
            label="Deskripsi"
            as="textarea"
            placeholder="Deskripsi kategori nota (opsional)"
            {...register('description')}
            error={errors.description}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Batal</Button>
            <Button type="submit" isLoading={mutation.isPending}>Simpan</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Hapus Kategori Nota"
        message="Apakah Anda yakin ingin menghapus kategori nota ini? Kategori yang sudah digunakan dalam DPD tidak dapat dihapus."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
