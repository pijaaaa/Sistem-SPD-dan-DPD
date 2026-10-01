import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  revisi: '#f59e0b',
  draft: '#6b7280',
  submitted: '#3b82f6',
};

const StatusChart = ({ spdData, dpdData }) => {
  const data = [
    { name: 'SPD Pending', value: spdData?.pending || 0, color: COLORS.pending },
    { name: 'SPD Approved', value: spdData?.approved || 0, color: COLORS.approved },
    { name: 'SPD Rejected', value: spdData?.rejected || 0, color: COLORS.rejected },
    { name: 'DPD Pending', value: dpdData?.pending || 0, color: COLORS.submitted },
    { name: 'DPD Approved', value: dpdData?.approved || 0, color: COLORS.approved },
    { name: 'DPD Revisi', value: dpdData?.revisi || dpdData?.rejected || 0, color: COLORS.revisi },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status SPD & DPD</h3>
        <p className="text-sm text-gray-500">Belum ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Status SPD & DPD</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusChart;
