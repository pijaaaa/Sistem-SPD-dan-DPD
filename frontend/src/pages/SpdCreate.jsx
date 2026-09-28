import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { useAuth } from '../context/AuthContext';

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
    const mainDeptId = loggedInEmp?.department?.id || '';

    createMutation.mutate({
      destination,
      purpose,
      start_date: startDate,
      end_date: endDate,
      employees: empData,
    });
  };

  if (empLoading || deptLoading) return <div className="py-8 text-center">Memuat data...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Buat SPD Baru</h1>
        <Button variant="secondary" onClick={() => navigate('/spd')}>Batal</Button>
      </div>

      {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-semibold">Informasi Perjalanan Dinas</h3>
          <FormField label="Tujuan" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          <FormField label="Keperluan" as="textarea" rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tanggal Mulai" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <FormField label="Tanggal Selesai" type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} required />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-semibold">Peserta (pemohon utama: Anda)</h3>
          <div className="border rounded max-h-72 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="px-3 py-2">Pilih</th><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Dept</th><th className="px-3 py-2">UTAMA</th></tr>
              </thead>
              <tbody>
                {allEmployees.map(emp => {
                  const isSelf = emp.id === myEmployeeId;
                  return (
                    <tr key={emp.id} className="border-t">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                          disabled={isSelf}
                        />
                      </td>
                      <td className="px-3 py-2">{emp.user?.name || emp.name}</td>
                      <td className="px-3 py-2">{emp.role?.name}</td>
                      <td className="px-3 py-2">{emp.department?.code}</td>
                      <td className="px-3 py-2">
                        {isSelf && <span className="text-xs text-blue-600 font-bold">UTAMA ✓</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">Terpilih: {selectedEmployees.length} karyawan (termasuk Anda sebagai pemohon utama)</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/spd')}>Batal</Button>
          <Button type="submit" isLoading={createMutation.isPending}>Buat SPD</Button>
        </div>
      </form>
    </div>
  );
}
