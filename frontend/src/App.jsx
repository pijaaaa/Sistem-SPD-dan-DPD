import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import NotaCategories from './pages/NotaCategories';
import Approvals from './pages/Approvals';
import Delegations from './pages/Delegations';
import DpdList from './pages/DpdList';
import DpdCreate from './pages/DpdCreate';
import DpdEdit from './pages/DpdEdit';
import DpdDetail from './pages/DpdDetail';
import DpdApprovals from './pages/DpdApprovals';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import SpdList from './pages/SpdList';
import SpdCreate from './pages/SpdCreate';
import SpdDetail from './pages/SpdDetail';
import MyRequests from './pages/MyRequests';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DashboardPlaceholder = () => <Dashboard />;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPlaceholder />} />
        
        {/* SPD Routes - Milestone 3 */}
         <Route path="/spd/create" element={
            <ProtectedRoute roles={['user', 'team_manager', 'manager', 'super_admin']}><SpdCreate /></ProtectedRoute>
         } />
        <Route path="/spd" element={<SpdList />} />
        <Route path="/spd/:id" element={<SpdDetail />} />
         <Route path="/my-requests" element={<MyRequests />} />
         <Route path="/approvals" element={
           <ProtectedRoute roles={['team_manager', 'manager', 'general_manager', 'super_admin']}>
             <Approvals />
           </ProtectedRoute>
         } />
         <Route path="/dpd-approvals" element={
           <ProtectedRoute roles={['team_manager', 'manager', 'general_manager', 'super_admin']}>
             <DpdApprovals />
           </ProtectedRoute>
         } />
         <Route path="/settings" element={
           <ProtectedRoute roles={['general_manager', 'super_admin']}>
             <Settings />
           </ProtectedRoute>
         } />
         <Route path="/delegations" element={
           <ProtectedRoute roles={['general_manager', 'super_admin']}>
             <Delegations />
           </ProtectedRoute>
         } />
        
        {/* DPD Routes - Milestone 6 */}
        <Route path="/dpd/create" element={<DpdCreate />} />
        <Route path="/dpd" element={<DpdList />} />
        <Route path="/dpd/:id/edit" element={<DpdEdit />} />
        <Route path="/dpd/:id" element={<DpdDetail />} />
        
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
        <Route path="/nota-categories" element={
          <ProtectedRoute requireRole="super_admin">
            <NotaCategories />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;