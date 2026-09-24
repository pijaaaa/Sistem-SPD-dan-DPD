import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Departments from './pages/Departments';
import Employees from './pages/Employees';

import Approvals from './pages/Approvals';
import Delegations from './pages/Delegations';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DashboardPlaceholder = () => (
  <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
    <h3 className="text-lg font-semibold mb-2">Selamat Datang</h3>
    <p className="text-gray-600">Pilih menu di sidebar untuk memulai.</p>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPlaceholder />} />
        
        {/* Placeholder routes */}
        <Route path="/spd/create" element={<div>Placeholder Buat SPD</div>} />
        <Route path="/my-requests" element={<div>Placeholder SPD & DPD Saya</div>} />
        <Route path="/approvals" element={
          <ProtectedRoute roles={['team_manager', 'manager', 'general_manager']}>
            <Approvals />
          </ProtectedRoute>
        } />
        <Route path="/delegations" element={
          <ProtectedRoute requireRole="general_manager">
            <Delegations />
          </ProtectedRoute>
        } />
        
        {/* Master Data Routes - Super Admin Only */}
        <Route path="/departments" element={
          <ProtectedRoute requireRole="super_admin">
            <Departments />
          </ProtectedRoute>
        } />
        <Route path="/employees" element={
          <ProtectedRoute requireRole="super_admin">
            <Employees />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;