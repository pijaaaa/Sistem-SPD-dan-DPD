import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
  const textColor = isSuccess ? 'text-emerald-900' : 'text-red-900';
  const iconColor = isSuccess ? 'text-emerald-500' : 'text-red-500';
  const Icon = isSuccess ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-lg border ${bgColor} shadow-lg animate-in slide-in-from-top-2 fade-in duration-300`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className={`flex-shrink-0 mt-0.5 hover:opacity-70 transition ${textColor}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState(null);

  const show = (message, type = 'success', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const ToastComponent = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onClose={() => setToast(null)}
    />
  ) : null;

  return { show, ToastComponent };
};
