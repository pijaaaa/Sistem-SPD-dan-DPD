import React from 'react';
import { TrendingUp, Users, Building2, FileText, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const iconMap = {
  '📄': <FileText className="w-6 h-6 text-emerald-600" />,
  '🧾': <FileText className="w-6 h-6 text-blue-600" />,
  '👥': <Users className="w-6 h-6 text-emerald-600" />,
  '🏢': <Building2 className="w-6 h-6 text-teal-600" />,
  '📤': <Zap className="w-6 h-6 text-amber-600" />,
  '⏳': <TrendingUp className="w-6 h-6 text-yellow-600" />,
};

const Card = ({ title, value, subtitle, icon, children, className, trend }) => (
  <div className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-100 p-6 ${className || ''}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">{title}</p>
        <div className="flex items-baseline gap-3">
          <p className="text-4xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend.direction === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {trend.direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {icon && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 shadow-sm">
          {iconMap[icon] || <div className="text-2xl">{icon}</div>}
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

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-600 font-medium mb-1">Pending</p>
          <p className="text-lg font-bold text-amber-700">{counts.pending}</p>
        </div>
        <div className="text-center p-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-xs text-emerald-600 font-medium mb-1">Approved</p>
          <p className="text-lg font-bold text-emerald-700">{counts.approved}</p>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
          <p className="text-xs text-red-600 font-medium mb-1">Rejected</p>
          <p className="text-lg font-bold text-red-700">{counts.rejected}</p>
        </div>
      </div>
    </div>
  );
};

export { Card, StatGroup };
