import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, requireRole, roles = [] }) => {
  const { user, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Memuat...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const checkRoles = requireRole ? [requireRole] : roles;
  const isAuthorized = checkRoles.length === 0 || checkRoles.some(r => hasRole(r));

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold text-red-600">Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <a href="/" className="text-blue-600 hover:underline">Kembali ke Beranda</a>
      </div>
    );
  }

  return children;
};