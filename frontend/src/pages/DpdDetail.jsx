import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal, ConfirmDialog } from '../components/common/Modal';

export default function DpdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: dpd, isLoading } = useQuery({
    queryKey: ['dpd', id],
    queryFn: async () => (await api.get(`/api/dpd/${id}`)).data,
  });

  if (isLoading) return <div className="py-8 text-center">Memuat detail DPD...</div>;

  const tripDays = dpd.spd ? dpd.spd.start_date.diffInDays(dpd.spd.end_date) + 1 : 0;

  // Remove attachment from state for modal confirm
  const deleteDpd = () => {
    if (dpd.status !== 'draft') {
      return;
    }
    api.delete(`/api/dpd/${id}`).then(() => {
      queryClient.invalidateQueries(['dpds']);
      navigate('/dpd');
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/api/dpd/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['dpds']);
      navigate('/dpd');
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Detail DPD</h1>
        {dpd.status === 'draft' && (
          <Button variant="danger" 
            onClick={() => deleteMutation.mutate(id)} 
            disabled={deleteMutation.isPending}>
            Hapus DPD
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">{dpd.dpd_number}</h2>
          <StatusBadge status={dpd.status} />
        </div>

        {/* SPD Info */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">SPD Terkait</h3>
          {dpd.spd && (
            <>
              <p><strong>No. SPD:</strong> {dpd.spd.spd_number}</p>
              <p><strong>Tujuan:</strong> {dpd.spd.destination}</p>
              <p><strong>Periode:</strong> {dpd.spd.start_date.toLocaleDateString()} s/d {dpd.spd.end_date.toLocaleDateString()}</p>
              <p><strong>Trip Days:</strong> {tripDays}</p>
            </>
          )}
        </div>

        {/* Laporan Kegiatan */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Laporan Kegiatan</h3>
          {dpd.reports.length > 0 ? (
            <div>
              {dpd.reports.map((r, i) => (
                <div key={i} className="border rounded p-3 mb-3 bg-gray-50">
                  <h4 className="font-medium mb-1">{r.title}</h4>
                  {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
                  {r.attachment_path && (
                    <a href={new URL(r.attachment_path, window.location.pathname).href} target="_blank" rel="noopener" className="text-blue-600 underline">Lihat file</a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada laporan kegiatan.</p>
          )}
        </div>

        {/* Item Nota */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Item Nota / Reimbursement</h3>
          {dpd.expenses.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {dpd.expenses.map((e, i) => (
                <div key={i} className="border rounded p-3 bg-gray-50">
                  <p><strong>{e.category?.name || e.category_id}</strong></p>
                  <p className="text-sm text-gray-600">{e.description}</p>
                  <p>Rp {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(e.amount)}</p>
                  <p>Tanggal: {e.expense_date.toLocaleDateString()}</p>
                  {e.attachment_path && (
                    <a href={new URL(e.attachment_path, window.location.pathname).href} target="_blank" rel="noopener" className="text-blue-600 underline">Lihat file</a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Belum ada item nota.</p>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-right text-2xl font-bold text-blue-700">
            Total Nominal: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(dpd.total_nominal || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}