import React from 'react';
import { Clock, FileText, Upload } from 'lucide-react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  submitted: 'bg-blue-100 text-blue-800 border-blue-200',
};

const RecentActivities = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h3>
        <p className="text-sm text-gray-500">Belum ada aktivitas terbaru</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Aktivitas Terbaru</h3>
      <div className="space-y-4">
        {data.map((activity, index) => (
          <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <div className={`p-2 rounded-lg ${activity.type === 'SPD' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
              {activity.type === 'SPD' ? (
                <FileText className="w-5 h-5 text-emerald-600" />
              ) : (
                <Upload className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.employee}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md border font-medium ${statusColors[activity.status] || statusColors.pending}`}>
                  {activity.status}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{activity.created_at}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivities;
