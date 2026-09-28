import React from 'react';
import clsx from 'clsx';

export const StatusBadge = ({ status }) => {
  const variants = {
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    approved: 'bg-green-50 text-green-700 border border-green-200',
    rejected: 'bg-red-50 text-red-700 border border-red-200',
    draft: 'bg-gray-50 text-gray-700 border border-gray-200',
    submitted: 'bg-blue-50 text-blue-700 border border-blue-200',
    cancelled: 'bg-gray-50 text-gray-500 border border-gray-200',
    default: 'bg-gray-50 text-gray-700 border border-gray-200'
  };

  const currentVariant = variants[status?.toLowerCase()] || variants.default;

  return (
    <span className={clsx("px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center", currentVariant)}>
      {status || 'Unknown'}
    </span>
  );
};