import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';

export default function DpdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: dpd, isLoading } = useQuery({
    queryKey: ['dpd', id],
    queryFn: async () => (await api.get(`/api/dpd/${id}`)).data,
  });

  if (isLoading) return <div className="py-8 text-center">Memuat detail DPD...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Detail DPD</h1>

      <div className="bg-white rounded-lg p-4 mb-6">
        <h2 className="text-lg font-medium">{dpd.dpd_number || 'No DPD Number'}</h2>
        <StatusBadge status={dpd.status} />
        <p><strong>Total Nominal:</strong> {dpd.total_nominal != null ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(dpd.total_nominal) : 'Rp 0'}</p>
        <p><strong>Tanggal Pengajuan:</strong> {dpd.submission_date}</p>
      </div>

      {dpd.spd && (
        <div className="mb-6">
          <h3 className="text-sm font-medium">SPD Terkait</h3>
          <p><strong>No. SPD:</strong> {dpd.spd.spd_number}</p>
          <p><strong>Tujuan:</strong> {dpd.spd.destination}</p>
          <p><strong>Periode:</strong> {dpd.spd.start_date.toLocaleDateString()} s/d {dpd.spd.end_date.toLocaleDateString()}</p>
          <p><strong>Trip Days:</strong> {(dpd.spd.end_date - dpd.spd.start_date).days + 1}</p>
        </div>
      )}

      {dpd.reports?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Laporan Kegiatan</h3>
          {dpd.reports.map((r, i) => (
            <div key={i} className="border rounded p-3 mb-3 bg-gray-50">
              <h4 className="font-medium">{r.title}</h4>
              <p className="text-sm text-gray-600">{r.description}</p>
              {r.attachment_path && (
                <a href={r.attachment_path} target="_blank" rel="noopener" className="text-blue-600 underline">Lihat file</a>
              )}
            </div>
          ))}
        </div>
      )}

      {dpd.expenses?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Item Nota / Reimbursement</h3>
          {dpd.expenses.map((e, i) => (
            <div key={i} className="border rounded p-3 mb-3 bg-gray-50">
              <p><strong>{e.category?.name || e.category_id}</strong></p>
              <p className="text-sm text-gray-600">{e.description}</p>
              <p>Rp {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(e.amount)}</p>
              <p>Tanggal: {e.expense_date.toLocaleDateString()}</p>
              {e.attachment_path && (
                <a href={e.attachment_path} target="_blank" rel="noopener" className="text-blue-600 underline">Lihat file</a>
              )}
            </div>
          ))}
        </div>
      )}

      {dpd.reports?.length === 0 && <p className="text-sm text-gray-500">Belum ada laporan kegiatan.</p>}
      {dpd.expenses?.length === 0 && <p className="text-sm text-gray-500">Belum ada item nota.</p>}
    </div>
  );
}