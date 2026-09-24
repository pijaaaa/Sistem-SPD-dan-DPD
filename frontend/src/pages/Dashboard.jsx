import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, StatGroup } from '../components/dashboard/StatCard';
import MonthlyChart from '../components/dashboard/MonthlyChart';
import PendingApprovalsCard from '../components/dashboard/PendingApprovalsCard';
import { useAuth } from '../context/AuthContext';

const SuperAdminDashboard = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card title="Total Employee" value={data.totals.employees} icon="👥" />
    <Card title="Total Department" value={data.totals.departments} icon="🏢" />
    <Card title="Total SPD" value={data.totals.spd.total} icon="📄">
      <StatGroup label="Status SPD" data={data.totals.spd} />
    </Card>
    <Card title="Total DPD" value={data.totals.dpd.total} icon="🧾">
      <StatGroup label="Status DPD" data={data.totals.dpd} />
    </Card>
  </div>
);

const UserDashboard = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card title="SPD Saya" value={data.user_stats.spd.total} icon="📄">
      <StatGroup label="Status" data={data.user_stats.spd} />
    </Card>
    <Card title="DPD Saya" value={data.user_stats.dpd.total} icon="🧾">
      <StatGroup label="Status" data={data.user_stats.dpd} />
    </Card>
    {data.approvals?.total_pending > 0 && (
      <div className="md:col-span-2">
        <PendingApprovalsCard data={data} role="approver" />
      </div>
    )}
  </div>
);

const AdminDashboard = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card title="SPD Saya" value={data.user_stats.spd.total} icon="📄">
      <StatGroup label="Status" data={data.user_stats.spd} />
    </Card>
    <Card title="DPD Saya" value={data.user_stats.dpd.total} icon="🧾">
      <StatGroup label="Status" data={data.user_stats.dpd} />
    </Card>
    <PendingApprovalsCard data={data} role="approver" />
    <div className="md:col-span-2 lg:col-span-3">
      <MonthlyChart data={data.monthly_chart} />
    </div>
  </div>
);

const GeneralManagerDashboard = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card title="SPD Saya" value={data.user_stats.spd.total} icon="📄">
      <StatGroup label="Status" data={data.user_stats.spd} />
    </Card>
    <Card title="DPD Saya" value={data.user_stats.dpd.total} icon="🧾">
      <StatGroup label="Status" data={data.user_stats.dpd} />
    </Card>
    <Card title="DPD Aktif" value={data.delegations?.active_count || 0} icon="📤">
      {data.delegations?.list?.length > 0 && (
        <div className="mt-3 space-y-2">
          {data.delegations.list.map((d, i) => (
            <p key={i} className="text-xs text-gray-500">
              {d.delegator?.user?.name || '-'} → {d.delegate?.user?.name || '-'}
            </p>
          ))}
        </div>
      )}
    </Card>
    <PendingApprovalsCard data={data} role="approver" />
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/api/dashboard')).data,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <div className="py-8 text-center text-gray-500">Memuat dashboard...</div>;

  if (!data) return <div className="text-center py-8">Gagal memuat dashboard.</div>;

  const renderByRole = () => {
    switch (data.role) {
      case 'super_admin':
        return <SuperAdminDashboard data={data} />;
      case 'general_manager':
        return <GeneralManagerDashboard data={data} />;
      case 'admin_departemen':
        return <AdminDashboard data={data} />;
      default:
        return <UserDashboard data={data} />;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-gray-500">
          Halo, {user?.name || data.role}
        </span>
      </div>
      {renderByRole()}
    </div>
  );
}