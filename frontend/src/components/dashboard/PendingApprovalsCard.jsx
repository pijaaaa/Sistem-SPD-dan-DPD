import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './StatCard';
import { Clock } from 'lucide-react';

const PendingApprovalsCard = ({ data, role }) => {
  const navigate = useNavigate();
  const { spd_pending = 0, dpd_pending = 0, total_pending = 0 } = data?.approvals || {};

  if (total_pending === 0) return null;

  return (
    <Card
      title="Menunggu Approval Saya"
      value={total_pending}
      icon="⏳"
      className="cursor-pointer hover:shadow-xl transition-all border-l-4 border-l-yellow-400"
    >
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Pending Items</span>
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <button
            onClick={() => navigate('/approvals')}
            className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
          >
            SPD: {spd_pending}
          </button>
          <button
            onClick={() => navigate('/dpd-approvals')}
            className="flex-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition-colors"
          >
            DPD: {dpd_pending}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default PendingApprovalsCard;