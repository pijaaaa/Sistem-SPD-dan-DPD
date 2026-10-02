import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { useAuth } from '../context/AuthContext';
import { MapPin, FileText, Calendar, Users, Check, ArrowLeft, Search, AlertCircle } from 'lucide-react';

export default function SpdCreate() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: allEmployees = [], isLoading: empLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await api.get('/api/master/employees')).data,
  });

  const { data: departments = [], isLoading: deptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/api/master/departments')).data,
  });

  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnDutyPopup, setShowOnDutyPopup] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/api/spd', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries(['spds']);
      navigate('/spd');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Gagal membuat SPD.');
      setTimeout(() => setError(''), 5000);
    },
  });

  const myEmployeeId = user?.employee?.id;

  useEffect(() => {
    if (startDate) {
      const e = document.getElementById('endDate')?.value;
      if (e && e < startDate) setEndDate('');
    }
  }, [startDate]);

  useEffect(() => {
    if (myEmployeeId) {
      const loggedInEmp = allEmployees.find(e => e.id === myEmployeeId);
      if (loggedInEmp) {
        setSelectedEmployees([myEmployeeId]);
        if (loggedInEmp.is_on_trip) {
          setShowOnDutyPopup(true);
        }
      }
    }
  }, [allEmployees, myEmployeeId]);

  const toggleEmployee = (empId) => {
    if (empId === myEmployeeId) return;
    setSelectedEmployees(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!myEmployeeId) {
      setError('User tidak memiliki employee data.');
      return;
    }
    const empData = selectedEmployees.map(id => ({
      employee_id: id,
      is_primary: id === myEmployeeId,
    }));

    const loggedInEmp = allEmployees.find(emp => emp.id === myEmployeeId);
    const mainDeptId = loggedInEmp?.department?.id || null;

    createMutation.mutate({
      destination,
      purpose,
      start_date: startDate,
      end_date: endDate,
      main_department_id: mainDeptId,
      employees: empData,
    });
  };

  if (empLoading || deptLoading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded-lg w-64 mx-auto"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (showOnDutyPopup) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buat Surat Perjalanan Dinas</h1>
            <p className="text-sm text-gray-600 mt-1">Lengkapi informasi perjalanan dinas Anda</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/spd')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Sedang Dalam Perjalanan</h2>
            <p className="text-gray-600 mb-6">
              Anda sedang dalam perjalanan dinas (on duty). Anda tidak dapat membuat SPD baru pada saat ini.
            </p>
            <Button onClick={() => navigate('/spd')} className="w-full">
              Kembali ke Daftar SPD
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Surat Perjalanan Dinas</h1>
          <p className="text-sm text-gray-600 mt-1">Lengkapi informasi perjalanan dinas Anda</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/spd')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-red-600 text-xs">✕</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Terjadi Kesalahan</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Informasi Perjalanan */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Informasi Perjalanan Dinas</h3>
                <p className="text-emerald-100 text-sm">Detail tujuan dan keperluan</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <FormField 
              label="Tujuan Perjalanan" 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
              placeholder="Contoh: Jakarta, Kantor Pusat"
              required 
            />
            <FormField 
              label="Keperluan" 
              as="textarea" 
              rows={4} 
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)} 
              placeholder="Jelaskan keperluan perjalanan dinas..."
              required 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <FormField 
                  label="Tanggal Mulai" 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  required 
                />
              </div>
              <div className="relative">
                <FormField 
                  label="Tanggal Selesai" 
                  type="date" 
                  id="endDate" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  min={startDate} 
                  required 
                />
              </div>
            </div>
            {startDate && endDate && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg">
                <Calendar className="w-4 h-4" />
                <span>Durasi: {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1} hari</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Peserta */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Pilih Peserta</h3>
                <p className="text-blue-100 text-sm">Anda sebagai pemohon utama + peserta lainnya</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Pemohon Utama:</p>
              <p className="text-sm text-blue-700 mt-1">
                <Check className="w-4 h-4 inline mr-1" />
                {user?.name} - {user?.employee?.role?.name}
              </p>
              {user?.employee?.employee_number && (
                <p className="text-sm text-blue-600 mt-1">
                  No. Pekerja: <span className="font-medium">{user?.employee?.employee_number}</span>
                </p>
              )}
            </div>

            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <input type="checkbox" className="rounded" disabled />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">No. Pekerja</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nama Karyawan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Posisi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Departemen</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(allEmployees.filter(emp => {
                      const searchFields = [emp.user?.name, emp.name, emp.position, emp.nip, emp.employee_number, emp.role?.name, emp.department?.name, emp.department?.code]
                        .filter(Boolean)
                        .map(f => String(f).toLowerCase());
                      return searchFields.some(f => f.includes(searchTerm));
                    })).map(emp => {
                      const isSelf = emp.id === myEmployeeId;
                      const isSelected = selectedEmployees.includes(emp.id);
                      const isOnTrip = emp.is_on_trip;
                        return (
                         <tr
                           key={emp.id}
                           className={`transition-colors ${isOnTrip ? 'bg-gray-50/50' : (isSelected ? 'bg-emerald-50/50 hover:bg-gray-50' : 'hover:bg-gray-50')}`}
                         >
                          <td className="px-4 py-3">
                             {isOnTrip ? (
                               <span className="text-gray-400">—</span>
                             ) : (
                               <input
                                 type="checkbox"
                                 checked={isSelected}
                                 onChange={() => toggleEmployee(emp.id)}
                                 disabled={isSelf}
                                 className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                               />
                             )}
                           </td>
                          <td className="px-4 py-3 text-gray-600">{emp.employee_number || '-'}</td>
                          <td className="px-4 py-3">
                             <span className={`font-medium ${isSelf ? 'text-emerald-700' : 'text-gray-900'}`}>
                               {emp.user?.name || emp.name}
                             </span>
                           </td>
                          <td className="px-4 py-3 text-gray-600">{emp.position || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                              {emp.department?.code}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isSelf && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                <Check className="w-3 h-3" />
                                Utama
                              </span>
                            )}
                              {isOnTrip && !isSelf && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                  On Duty
                                </span>
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <Users className="w-4 h-4 inline mr-1" />
                Total peserta terpilih:
              </p>
              <span className="text-lg font-bold text-emerald-700">{selectedEmployees.length}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/spd')}>
            Batal
          </Button>
          <Button type="submit" isLoading={createMutation.isPending} disabled={selectedEmployees.length === 0}>
            <FileText className="w-4 h-4 mr-2" />
            Buat SPD
          </Button>
        </div>
      </form>
    </div>
  );
}
