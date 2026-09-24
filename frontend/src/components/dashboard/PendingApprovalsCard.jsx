import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './StatCard';

const PendingApprovalsCard = ({ data, role }) => {
  const navigate = useNavigate();
  const { spd_pending = 0, dpd_pending = 0, total_pending = 0 } = data?.approvals || {};

  if (total_pending === 0) return null;

  return (
    <Card
      title="Menunggu Approval Saya"
      value={total_pending}
      icon="⏳"
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate('/dpd-approvals')}
    >
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span>SPD: {spd_pending}</span>
        <span>DPD: {dpd_pending}</span>
      </div>
    </Card>
  );
};

export default PendingApprovalsCard;