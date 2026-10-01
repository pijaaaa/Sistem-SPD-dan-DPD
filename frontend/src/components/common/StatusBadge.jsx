import React from 'react';
import clsx from 'clsx';
import { Clock, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const variants = {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Clock,
      label: 'Menunggu'
    },
    approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      label: 'Disetujui'
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle,
      label: 'Ditolak'
    },
    revisi: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: AlertCircle,
      label: 'Revisi'
    },
    draft: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: FileText,
      label: 'Draft'
    },
    submitted: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Clock,
      label: 'Diajukan'
    },
    cancelled: {
      bg: 'bg-slate-50',
      text: 'text-slate-500',
      border: 'border-slate-200',
      icon: AlertCircle,
      label: 'Dibatalkan'
    },
    default: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: FileText,
      label: 'Tidak Diketahui'
    }
  };

  const variant = variants[status?.toLowerCase()] || variants.default;
  const Icon = variant.icon;

  return (
    <span className={clsx(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border",
      variant.bg,
      variant.text,
      variant.border
    )}>
      <Icon className="w-3.5 h-3.5" />
      {variant.label}
    </span>
  );
};