import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import api from '../services/api';
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
  X,
  ReceiptText,
  ChevronDown,
  Edit3,
  Lock
} from 'lucide-react';

export default function MainLayout() {
  const { user, logout, hasRole, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [editNameModalOpen, setEditNameModalOpen] = useState(false);
  const [editPasswordModalOpen, setEditPasswordModalOpen] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const handleLogout = async () => {
    await logout();
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      const res = await api.put('/api/profile/name', { name: newName });
      updateUser(res.data);
      setFormSuccess('Nama berhasil diperbarui.');
      setTimeout(() => {
        setFormSuccess('');
        setEditNameModalOpen(false);
      }, 1500);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal memperbarui nama.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (newPassword !== newPasswordConfirm) {
      setFormError('Konfirmasi password tidak cocok.');
      return;
    }
    try {
      const res = await api.put('/api/profile/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirm,
      });
      setFormSuccess(res.data.message || 'Password berhasil diperbarui.');
      setTimeout(() => {
        setFormSuccess('');
        setEditPasswordModalOpen(false);
      }, 1500);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal memperbarui password.');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['super_admin', 'user', 'team_manager', 'manager', 'general_manager'] },
    { name: 'Buat SPD', path: '/spd/create', icon: FileText, roles: ['user', 'team_manager', 'manager', 'super_admin'] },
    { name: 'Daftar SPD', path: '/spd', icon: FolderOpen, roles: ['user', 'team_manager', 'manager', 'general_manager', 'super_admin'] },
    { name: 'Approval SPD', path: '/approvals', icon: CheckSquare, roles: ['team_manager', 'manager', 'general_manager', 'super_admin'] },
    { name: 'Approval DPD', path: '/dpd-approvals', icon: CheckSquare, roles: ['team_manager', 'manager', 'general_manager', 'super_admin'] },
    { name: 'Daftar DPD', path: '/dpd', icon: Upload, roles: ['user', 'team_manager', 'manager', 'general_manager', 'super_admin'] },
    { name: 'Delegasi', path: '/delegations', icon: Users, roles: ['general_manager', 'super_admin'] },
    { name: 'Pengaturan', path: '/settings', icon: Settings, roles: ['general_manager', 'super_admin'] },
    { name: 'Departemen', path: '/departments', icon: Building2, roles: ['super_admin'] },
    { name: 'Karyawan', path: '/employees', icon: Users, roles: ['super_admin'] },
    { name: 'Kategori Nota', path: '/nota-categories', icon: ReceiptText, roles: ['super_admin'] },
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
        ['Delegasi', 'Pengaturan', 'Departemen', 'Karyawan', 'Kategori Nota'].includes(item.name)
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
          
           <div className="flex items-center gap-3 relative">
             <div className="hidden sm:block text-right">
               <p className="text-sm font-medium text-gray-700">{user?.name}</p>
               <p className="text-xs text-gray-500 capitalize">
                 {user?.employee?.role?.name?.replace('_', ' ')}
               </p>
             </div>
              <div className="relative">
                <div className="flex items-center">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform"
                  >
                    <span className="text-white font-semibold text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </button>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="ml-1 p-1 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

               {profileDropdownOpen && (
                 <>
                   <div
                     className="fixed inset-0 z-40"
                     onClick={() => setProfileDropdownOpen(false)}
                   />
                   <div className="absolute right-0 z-50 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                     <button
                       onClick={() => {
                         setProfileDropdownOpen(false);
                         setNewName(user?.name || '');
                         setFormError('');
                         setFormSuccess('');
                         setEditNameModalOpen(true);
                       }}
                       className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                     >
                       <Edit3 className="w-4 h-4" />
                       Ganti Nama
                     </button>
                     <button
                       onClick={() => {
                         setProfileDropdownOpen(false);
                         setCurrentPassword('');
                         setNewPassword('');
                         setNewPasswordConfirm('');
                         setFormError('');
                         setFormSuccess('');
                         setEditPasswordModalOpen(true);
                       }}
                       className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                     >
                       <Lock className="w-4 h-4" />
                       Ganti Password
                     </button>
                     <hr className="my-1" />
                     <button
                       onClick={handleLogout}
                       className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                     >
                       <LogOut className="w-4 h-4" />
                       Keluar
                     </button>
                   </div>
                 </>
               )}
             </div>
           </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {editNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Ganti Nama</h2>
              <button
                onClick={() => { setEditNameModalOpen(false); setFormError(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700">{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Baru</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditNameModalOpen(false); setFormError(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Ganti Password</h2>
              <button
                onClick={() => { setEditPasswordModalOpen(false); setFormError(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700">{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                  minLength={8}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditPasswordModalOpen(false); setFormError(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}