import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { Button } from './common/Button';

export default function MainLayout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', roles: ['super_admin', 'admin_departemen', 'user', 'team_manager', 'manager', 'general_manager'] },
    { name: 'Buat SPD', path: '/spd/create', roles: ['admin_departemen'] },
    { name: 'SPD & DPD Saya', path: '/my-requests', roles: ['user', 'team_manager', 'manager', 'general_manager', 'admin_departemen'] },
    { name: 'Approval Saya', path: '/approvals', roles: ['team_manager', 'manager', 'general_manager'] },
    { name: 'Delegasi', path: '/delegations', roles: ['general_manager'] },
    { name: 'Master Data (Dept)', path: '/departments', roles: ['super_admin'] },
    { name: 'Master Data (Emp)', path: '/employees', roles: ['super_admin'] },
  ];

  const visibleNavItems = navItems.filter(item => 
    item.roles.includes(user?.employee?.role?.name)
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-700">SPD & DPD</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {visibleNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.path 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.employee?.role?.name}</p>
          </div>
          <Button variant="secondary" className="w-full text-sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8">
          <h2 className="text-lg font-medium text-gray-800">
            {visibleNavItems.find(i => i.path === location.pathname)?.name || 'Sistem SPD & DPD'}
          </h2>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}