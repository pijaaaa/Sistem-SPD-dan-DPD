import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from './StatCard';

const MonthlyChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const chartData = data.filter(d => d.spd > 0 || d.dpd > 0);

  if (chartData.length === 0) {
    return (
      <Card title="Aktivitas per Bulan" value="0">
        <p className="text-sm text-gray-500 mt-2">Belum ada data SPD/DPD bulan ini.</p>
      </Card>
    );
  }

  return (
    <Card title="Aktivitas per Bulan" className="col-span-2">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <XAxis dataKey="month_name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="spd" name="SPD" fill="#3b82f6" />
          <Bar dataKey="dpd" name="DPD" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default MonthlyChart;