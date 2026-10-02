import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, StatGroup } from '../components/dashboard/StatCard';
import PendingApprovalsCard from '../components/dashboard/PendingApprovalsCard';
import MonthlyChart from '../components/dashboard/MonthlyChart';
import DepartmentChart from '../components/dashboard/DepartmentChart';
import StatusChart from '../components/dashboard/StatusChart';
import RecentActivities from '../components/dashboard/RecentActivities';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner, PageLoader, SkeletonCard } from '../components/common/Loading';

const SuperAdminDashboard = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card title="Total Karyawan" value={data.totals.employees} icon="👥" />
      <Card title="Total Departemen" value={data.totals.departments} icon="🏢" />
      <Card title="Total SPD" value={data.totals.spd.total} icon="📄">
        <StatGroup label="Status SPD" data={data.totals.spd} />
      </Card>
      <Card title="Total DPD" value={data.totals.dpd.total} icon="🧾">
        <StatGroup label="Status DPD" data={data.totals.dpd} />
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MonthlyChart data={data.monthly_stats} title="Tren SPD & DPD (6 Bulan Terakhir)" />
      <StatusChart spdData={data.totals.spd} dpdData={data.totals.dpd} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DepartmentChart data={data.department_stats} />
      <RecentActivities data={data.recent_activities} />
    </div>
  </div>
);

const UserDashboard = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

    {data.monthly_stats && data.monthly_stats.length > 0 && (
      <MonthlyChart data={data.monthly_stats} title="Aktivitas SPD & DPD Saya (6 Bulan Terakhir)" />
    )}
  </div>
);

const GeneralManagerDashboard = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card title="SPD Saya" value={data.user_stats.spd.total} icon="📄">
        <StatGroup label="Status" data={data.user_stats.spd} />
      </Card>
      <Card title="DPD Saya" value={data.user_stats.dpd.total} icon="🧾">
        <StatGroup label="Status" data={data.user_stats.dpd} />
      </Card>
      <Card title="Delegasi Aktif" value={data.delegations?.active_count || 0} icon="📤">
        {data.delegations?.list?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            {data.delegations.list.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-emerald-50 p-2 rounded-lg">
                <span className="font-medium text-gray-700">{d.delegator?.user?.name || '-'}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-emerald-700">{d.delegate?.user?.name || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>

    <PendingApprovalsCard data={data} role="approver" />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <MonthlyChart data={data.monthly_stats} title="Tren SPD & DPD (6 Bulan Terakhir)" />
      <DepartmentChart data={data.department_stats} />
    </div>
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
      <div>
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded-lg w-64 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900 text-lg">Gagal memuat dashboard</h3>
          <p className="text-sm text-red-700 mt-1">{error.response?.data?.message || error.message}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Selamat datang kembali, {user?.name} 👋
        </h1>
        <p className="text-gray-600">
          Sistem Perjalanan Dinas SPD & DPD
        </p>
      </div>
      {renderByRole()}
    </div>
  );
}
