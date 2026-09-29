import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, StatGroup } from '../components/dashboard/StatCard';
import PendingApprovalsCard from '../components/dashboard/PendingApprovalsCard';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const SuperAdminDashboard = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card title="Total Karyawan" value={data.totals.employees} icon="👥" />
    <Card title="Total Departemen" value={data.totals.departments} icon="🏢" />
    <Card title="Total SPD" value={data.totals.spd.total} icon="📄">
      <StatGroup label="Status SPD" data={data.totals.spd} />
    </Card>
    <Card title="Total DPD" value={data.totals.dpd.total} icon="🧾">
      <StatGroup label="Status DPD" data={data.totals.dpd} />
    </Card>
  </div>
);

const UserDashboard = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="SPD Saya" value={data.user_stats.spd.total} icon="📄">
        <StatGroup label="Status" data={data.user_stats.spd} />
      </Card>
      <Card title="DPD Saya" value={data.user_stats.dpd.total} icon="🧾">
        <StatGroup label="Status" data={data.user_stats.dpd} />
      </Card>
    </div>
    {data.approvals?.total_pending > 0 && (
      <PendingApprovalsCard data={data} role="approver" />
    )}
  </div>
);

const GeneralManagerDashboard = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card title="SPD Saya" value={data.user_stats.spd.total} icon="📄">
        <StatGroup label="Status" data={data.user_stats.spd} />
      </Card>
      <Card title="DPD Saya" value={data.user_stats.dpd.total} icon="🧾">
        <StatGroup label="Status" data={data.user_stats.dpd} />
      </Card>
      <Card title="Delegasi Aktif" value={data.delegations?.active_count || 0} icon="📤">
        {data.delegations?.list?.length > 0 && (
          <div className="mt-3 space-y-2">
            {data.delegations.list.map((d, i) => (
              <p key={i} className="text-xs text-gray-600">
                <span className="font-medium">{d.delegator?.user?.name || '-'}</span> → <span className="font-medium">{d.delegate?.user?.name || '-'}</span>
              </p>
            ))}
          </div>
        )}
      </Card>
    </div>
    <PendingApprovalsCard data={data} role="approver" />
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/api/dashboard')).data,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded-lg w-48 mx-auto"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Gagal memuat dashboard</h3>
          <p className="text-sm text-red-700">{error.response?.data?.message || error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const renderByRole = () => {
    switch (data.role) {
      case 'super_admin':
        return <SuperAdminDashboard data={data} />;
      case 'general_manager':
        return <GeneralManagerDashboard data={data} />;
      default:
        return <UserDashboard data={data} />;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Selamat datang kembali, {user?.name}
        </h1>
        <p className="text-gray-600 text-sm">
          Sistem Pengumpulan Media SPD & DPD
        </p>
      </div>
      {renderByRole()}
    </div>
  );
}