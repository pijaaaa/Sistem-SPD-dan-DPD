import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './StatCard';
import { Clock, ArrowRight } from 'lucide-react';

const PendingApprovalsCard = ({ data, role }) => {
  const navigate = useNavigate();
  const { spd_pending = 0, dpd_pending = 0, total_pending = 0 } = data?.approvals || {};

  if (total_pending === 0) return null;

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-sm hover:shadow-lg transition-all border-2 border-yellow-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-yellow-400 rounded-lg p-2">
              <Clock className="w-5 h-5 text-yellow-900" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Menunggu Approval Saya</h3>
          </div>
          <p className="text-4xl font-bold text-yellow-900">{total_pending}</p>
          <p className="text-sm text-yellow-700 mt-1">Item memerlukan persetujuan Anda</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => navigate('/approvals')}
          className="group flex items-center justify-between px-4 py-4 bg-white hover:bg-emerald-50 border-2 border-emerald-200 rounded-xl transition-all shadow-sm hover:shadow-md"
        >
          <div className="text-left">
            <p className="text-xs text-gray-500 font-semibold uppercase">SPD Pending</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{spd_pending}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <button
          onClick={() => navigate('/dpd-approvals')}
          className="group flex items-center justify-between px-4 py-4 bg-white hover:bg-blue-50 border-2 border-blue-200 rounded-xl transition-all shadow-sm hover:shadow-md"
        >
          <div className="text-left">
            <p className="text-xs text-gray-500 font-semibold uppercase">DPD Pending</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{dpd_pending}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default PendingApprovalsCard;
