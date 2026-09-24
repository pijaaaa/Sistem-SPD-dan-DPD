import React from 'react';
import clsx from 'clsx';

export const StatusBadge = ({ status }) => {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800'
  };

  const currentVariant = variants[status?.toLowerCase()] || variants.default;

  return (
    <span className={clsx("px-2 py-1 text-xs font-semibold rounded-full", currentVariant)}>
      {status || 'Unknown'}
    </span>
  );
};