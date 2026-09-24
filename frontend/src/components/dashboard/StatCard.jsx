import React from 'react';

const Card = ({ title, value, subtitle, icon, children, className }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className || ''}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {icon && <div className="text-3xl opacity-20">{icon}</div>}
    </div>
    {children}
  </div>
);

const StatGroup = ({ label, data = {} }) => {
  const counts = {
    pending: data.pending || 0,
    approved: data.approved || 0,
    rejected: data.rejected || 0,
  };
  const total = (counts.pending || 0) + (counts.approved || 0) + (counts.rejected || 0);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">{label}: {total} total</p>
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">{counts.pending} pending</span>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">{counts.approved} approved</span>
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs">{counts.rejected} rejected</span>
      </div>
    </div>
  );
};

export { Card, StatGroup };