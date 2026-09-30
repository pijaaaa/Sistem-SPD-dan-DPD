import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { FormField } from '../components/common/FormField';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MapPin, Calendar, Users, FileText, Download, CheckCircle2, AlertCircle, DollarSign } from 
'lucide-react';
import { PageLoader } from '../components/common/Loading';
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');

export default function SpdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rejectChainId, setRejectChainId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const [rejectError, setRejectError] = useState('');

  const { data: spd, isLoading } = useQuery({
    queryKey: ['spd', id],
    queryFn: async () => (await api.get(`/api/spd/${id}`)).data,
  });

  const approveMutation = useMutation({
    mutationFn: async (chainId) => api.post(`/api/spd/approval/${chainId}/approve`),
    onSuccess: () => queryClient.invalidateQueries(['spd', id]),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ chainId, reason }) => api.post(`/api/spd/approval/${chainId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['spd', id]);
      closeReject();
    },
    onError: (err) => {
      setRejectError(err.response?.data?.message || err.response?.data?.errors?.reason?.[0] || 'Gagal menolak SPD');
    },
  });

  const reviseMutation = useMutation({
    mutationFn: async () => api.post(`/api/spd/${id}/revise`),
    onSuccess: () => {
      queryClient.invalidateQueries(['spd', id]);
      queryClient.invalidateQueries(['spds']);
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/api/spd/${id}/export/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const disposition = res.headers['content-disposition'];
      let filename = `SPD_${spd?.spd_number}.pdf`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const match = disposition.match(/filename=(.+)/);
        if (match) filename = match[1].trim();
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  if (isLoading) return <PageLoader />;

  const isApprover = (spd.status === 'pending' || spd.status === 'draft');
  const showProgress = (spd.status === 'pending' || spd.status === 'rejected' || spd.status === 'approved');
  const myEmployeeId = user?.employee?.id;
  const isParticipant = (spd.employees || []).some(e => e.employee_id === myEmployeeId);
  const mySpdEmployeeId = (spd.employees || []).find(e => e.employee_id === myEmployeeId)?.id;
  const pendingChains = (spd.approvalChains || []).filter(c =>
    c.status === 'pending' &&
    (c.approver_employee_id === myEmployeeId || c.spd_employee_id === mySpdEmployeeId)
  );
  const allChains = (spd.approvalChains || []).filter(c =>
    c.spd_employee_id === mySpdEmployeeId
  );

  const openReject = (chainId) => {
    setRejectChainId(chainId);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(true);
  };
  const closeReject = () => {
    setRejectChainId(null);
    setRejectReason('');
    setRejectError('');
    setIsRejectModalOpen(false);
  };
  const submitReject = (e) => {
    e.preventDefault();
    rejectMutation.mutate({ chainId: rejectChainId, reason: rejectReason });
  };

  const tripDays = spd.start_date && spd.end_date 
    ? Math.ceil((new Date(spd.end_date) - new Date(spd.start_date)) / (1000 * 60 * 60 * 24)) + 1 
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/spd')} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{spd.spd_number}</h1>
            <p className="text-sm text-gray-600 mt-1">Detail Surat Perjalanan Dinas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={spd.status} />
          {spd.status === 'rejected' && spd.employees?.some(e => e.employee_id === myEmployeeId && e.is_primary) && (
            <Button onClick={() => reviseMutation.mutate()} isLoading={reviseMutation.isPending} variant="secondary">
              Ajukan Ulang
            </Button>
          )}
          {isParticipant && (
            <Button 
              variant="secondary"
              onClick={() => downloadPdfMutation.mutate()}
              isLoading={downloadPdfMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tujuan */}
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-blue-600 font-semibold uppercase">Tujuan</p>
              <p className="font-semibold text-gray-900 mt-1">{spd.destination}</p>
            </div>
          </div>
        </div>

        {/* Durasi */}
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-emerald-600 font-semibold uppercase">Durasi</p>
              <p className="font-semibold text-gray-900 mt-1">{tripDays} Hari</p>
              <p className="text-xs text-gray-500 mt-1">{formatDate(spd.start_date)} - {formatDate(spd.end_date)}</p>
            </div>
          </div>
        </div>

        {/* Peserta */}
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-purple-600 font-semibold uppercase">Peserta</p>
              <p className="font-semibold text-gray-900 mt-1">{spd.employees?.length || 0} Orang</p>
            </div>
          </div>
        </div>
      </div>

      {/* Informasi SPD */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Informasi SPD</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">No. SPD</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{spd.spd_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Keperluan</p>
              <p className="text-sm text-gray-700 mt-1">{spd.purpose}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Departemen</p>
              <p className="inline-flex items-center gap-2 mt-1">
                <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                  {spd.department?.code || '-'}
                </span>
                <span className="text-sm text-gray-600">{spd.department?.name || '-'}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Lintas Departemen</p>
              <p className="mt-1">
                {spd.is_cross_department ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Ya (Multi-Department)
                  </span>
                ) : (
                  <span className="text-sm text-gray-600">Tidak</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Peserta SPD */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Peserta SPD</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Departemen</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {spd.employees?.map(se => (
                <tr key={se.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{se.employee?.user?.name || se.employee?.name}</td>
                  <td className="px-6 py-4 text-gray-600">{se.employee?.role?.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                      {se.employee?.department?.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {se.is_primary ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Utama
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Peserta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menunggu Persetujuan Anda */}
      {isApprover && pendingChains.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Menunggu Persetujuan Anda</h2>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {pendingChains.map(chain => (
              <div key={chain.id} className="border border-amber-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Level {chain.level_order}</p>
                    <p className="text-sm text-gray-600 mt-1">{chain.approver?.user?.name || chain.approver?.name || '-'}</p>
                    <p className="text-xs text-gray-500 mt-1">{chain.approver?.role?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => approveMutation.mutate(chain.id)}
                      isLoading={approveMutation.isPending}
                      disabled={rejectMutation.isPending}
                    >
                      Setuju
                    </Button>
                    <Button 
                      size="sm" 
                      variant="danger" 
                      onClick={() => openReject(chain.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      Tolak
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Persetujuan */}
      {showProgress && pendingChains.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Progress Persetujuan</h2>
          </div>
          <div className="p-6">
            {allChains.length === 0 ? (
              <p className="text-gray-500">Belum ada rantai approval.</p>
            ) : (
              <div className="space-y-3">
                {allChains.map((chain, idx) => {
                  const rejectLog = chain.logs?.find(log => log.action === 'rejected');
                  const approveLog = chain.logs?.find(log => log.action === 'approved');
                  return (
                    <div key={chain.id} className="relative">
                      {idx < allChains.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-200"></div>
                      )}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            chain.status === 'approved' ? 'bg-emerald-500' :
                            chain.status === 'rejected' ? 'bg-red-500' :
                            'bg-gray-300'
                          }`}>
                            {chain.status === 'approved' ? <CheckCircle2 className="w-6 h-6" /> :
                             chain.status === 'rejected' ? <AlertCircle className="w-6 h-6" /> :
                             '?'}
                          </div>
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">Level {chain.level_order} — {chain.approver?.user?.name || '-'}</p>
                            <StatusBadge status={chain.status} />
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{chain.approver?.role?.name}</p>
                          {(approveLog || rejectLog) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(approveLog?.created_at || rejectLog?.created_at).toLocaleDateString('id-ID')}
                            </p>
                          )}
                          {rejectLog && (
                            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                              <p className="text-xs font-semibold text-red-900 mb-1">Alasan Penolakan:</p>
                              <p className="text-sm text-red-700">{rejectLog.rejection_reason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DPD Section */}
      {spd.status === 'approved' && (
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Deklarasi Perjalanan Dinas</h2>
            </div>
          </div>
          <div className="p-6">
            {spd.dpd ? (
              <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                <div>
                  <p className="text-sm text-green-700">DPD sudah dibuat:</p>
                  <p className="text-lg font-semibold text-green-900 mt-1">{spd.dpd.dpd_number}</p>
                </div>
                <Button variant="primary" onClick={() => navigate(`/dpd/${spd.dpd.id}`)}>
                  Lihat Detail
                </Button>
              </div>
            ) : spd.employees?.some(e => e.employee_id === myEmployeeId && e.is_primary) ? (
              <Button onClick={() => navigate(`/dpd/create?spd_id=${spd.id}`)}>
                <FileText className="w-4 h-4 mr-2" />
                Buat DPD Baru
              </Button>
            ) : (
              <p className="text-gray-500">Hanya pengaju utama yang dapat membuat DPD.</p>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={closeReject} title="Tolak SPD">
        {rejectError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{rejectError}</span>
          </div>
        )}
        <form onSubmit={submitReject}>
          <FormField 
            as="textarea" 
            label="Alasan Penolakan" 
            rows={4} 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)} 
            required 
            placeholder="Tulis alasan penolakan SPD..." 
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={closeReject}>Batal</Button>
            <Button type="submit" variant="danger" isLoading={rejectMutation.isPending}>Tolak SPD</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}