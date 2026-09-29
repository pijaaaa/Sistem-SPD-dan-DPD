import React from 'react';
import { TrendingUp, Users, Building2, FileText, Zap } from 'lucide-react';

const iconMap = {
  '📄': <FileText className="w-6 h-6 text-emerald-600" />,
  '🧾': <FileText className="w-6 h-6 text-teal-600" />,
  '👥': <Users className="w-6 h-6 text-emerald-600" />,
  '🏢': <Building2 className="w-6 h-6 text-teal-600" />,
  '📤': <Zap className="w-6 h-6 text-amber-600" />,
};

const Card = ({ title, value, subtitle, icon, children, className }) => (
  <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 p-6 ${className || ''}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {icon && (
        <div className="bg-emerald-50 rounded-lg p-2.5">
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
      <div className="flex flex-wrap gap-2">
        {counts.pending > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium border border-amber-100">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            {counts.pending} Menunggu
          </span>
        )}
        {counts.approved > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {counts.approved} Disetujui
          </span>
        )}
        {counts.rejected > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-medium border border-red-100">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {counts.rejected} Ditolak
          </span>
        )}
      </div>
    </div>
  );
};

export { Card, StatGroup };