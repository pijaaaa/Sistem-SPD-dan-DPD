import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  CheckSquare, 
  FolderOpen,
  Settings,
  Users,
  Building2,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function MainLayout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['super_admin', 'user', 'team_manager', 'manager', 'general_manager'] },
    { name: 'Buat SPD', path: '/spd/create', icon: FileText, roles: ['user', 'team_manager', 'manager'] },
    { name: 'Daftar SPD', path: '/spd', icon: FolderOpen, roles: ['user', 'team_manager', 'manager', 'general_manager', 'super_admin'] },
    { name: 'Approval SPD', path: '/approvals', icon: CheckSquare, roles: ['team_manager', 'manager', 'general_manager'] },
    { name: 'Approval DPD', path: '/dpd-approvals', icon: CheckSquare, roles: ['team_manager', 'manager', 'general_manager'] },
    { name: 'Daftar DPD', path: '/dpd', icon: Upload, roles: ['user', 'team_manager', 'manager', 'general_manager'] },
    { name: 'Delegasi', path: '/delegations', icon: Users, roles: ['general_manager'] },
    { name: 'Pengaturan', path: '/settings', icon: Settings, roles: ['general_manager'] },
    { name: 'Departemen', path: '/departments', icon: Building2, roles: ['super_admin'] },
    { name: 'Karyawan', path: '/employees', icon: Users, roles: ['super_admin'] },
  ];

  const visibleNavItems = navItems.filter(item => 
    item.roles.includes(user?.employee?.role?.name)
  );

  const menuSections = [
    {
      title: 'MENU UTAMA',
      items: visibleNavItems.filter(item => 
        ['Dashboard', 'Buat SPD', 'Daftar SPD', 'Approval SPD', 'Approval DPD', 'Daftar DPD'].includes(item.name)
      )
    },
    {
      title: 'PENGATURAN',
      items: visibleNavItems.filter(item => 
        ['Delegasi', 'Pengaturan', 'Departemen', 'Karyawan'].includes(item.name)
      )
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 h-screen bg-emerald-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-emerald-800/50">
            <div className="flex flex-col items-center gap-2">
              <img src="/logo1-D2NqUgDL.png" alt="Logo" className="w-full h-auto object-contain px-4" />
              <div className="text-center">
                <h1 className="text-white font-bold text-lg">SPD & DPD</h1>
                <p className="text-emerald-200 text-sm">Sistem Perjalanan Dinas</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-6">
            {menuSections.map((section) => section.items.length > 0 && (
              <div key={section.title} className="mb-6">
                <h3 className="px-6 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <nav className="space-y-1 px-3">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={clsx(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          isActive 
                            ? "bg-primary-500 text-white shadow-lg" 
                            : "text-emerald-100 hover:bg-emerald-800/50 hover:text-white"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-emerald-800/50">
            <div className="mb-4 px-2">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-emerald-300 truncate">{user?.email}</p>
              <p className="text-xs text-emerald-200 mt-1 truncate capitalize">
                {user?.employee?.role?.name?.replace('_', ' ')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-800/50 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar Sistem
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              {visibleNavItems.find(i => i.path === location.pathname)?.name || 'Sistem SPD & DPD'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.employee?.role?.name?.replace('_', ' ')}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}