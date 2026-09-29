import React from 'react';
import clsx from 'clsx';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit, 
  Trash2, 
  FilePlus, 
  FileText,
  Ban,
  Loader2
} from 'lucide-react';

const iconMap = {
  approve: CheckCircle,
  reject: XCircle,
  detail: Eye,
  edit: Edit,
  hapus: Trash2,
  delete: Trash2,
  buat: FilePlus,
  lihat: FileText,
  batalkan: Ban,
};

export const ActionButton = ({ 
  icon, 
  label, 
  variant = 'primary', 
  onClick, 
  disabled, 
  isLoading,
  className 
}) => {
  const IconComponent = iconMap[icon?.toLowerCase()] || Eye;

  const variantStyles = {
    primary: 'text-emerald-600 hover:bg-emerald-50 border-emerald-200',
    success: 'text-emerald-600 hover:bg-emerald-50 border-emerald-200',
    danger: 'text-red-600 hover:bg-red-50 border-red-200',
    secondary: 'text-slate-600 hover:bg-slate-50 border-slate-200',
    ghost: 'text-slate-600 hover:bg-slate-50 border-transparent',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={clsx(
        'flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-md border transition-all',
        'min-w-[65px] disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        className
      )}
      title={label}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <IconComponent className="w-4 h-4" />
      )}
      <span className="text-[9px] font-semibold leading-tight text-center">{label}</span>
    </button>
  );
};
