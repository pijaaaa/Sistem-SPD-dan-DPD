import React from 'react';
import { BarChart3, Building2, Sparkles } from 'lucide-react';

const iconMap = {
  '📄': <BarChart3 className="w-8 h-8 text-blue-400" />,
  '🧾': <BarChart3 className="w-8 h-8 text-purple-400" />,
  '👥': <BarChart3 className="w-8 h-8 text-green-400" />,
  '🏢': <Building2 className="w-8 h-8 text-indigo-400" />,
  '📤': <Sparkles className="w-8 h-8 text-yellow-400" />,
};

const Card = ({ title, value, subtitle, icon, children, className }) => (
  <div className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 p-6 ${className || ''}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <p className="text-sm text-gray-500 font-medium mb-2">{title}</p>
        <p className="text-4xl font-bold text-gray-800">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
      </div>
      {icon && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3">
          {iconMap[icon] || <div className="text-3xl">{icon}</div>}
        </div>
      )}
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
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium border border-yellow-100">
          {counts.pending} Pending
        </span>
        <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-100">
          {counts.approved} Approved
        </span>
        <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-100">
          {counts.rejected} Rejected
        </span>
      </div>
    </div>
  );
};

export { Card, StatGroup };