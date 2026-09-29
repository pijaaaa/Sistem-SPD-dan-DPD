import React from 'react';
import { Loader2 } from 'lucide-react';

export const DataTable = ({ columns, data, isLoading, onEdit, onDelete, actionsSlot }) => {
  if (isLoading) return (
    <div className="py-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
      <p className="text-gray-500">Memuat data...</p>
    </div>
  );
  
  if (!data || data.length === 0) return (
    <div className="py-12 text-center bg-white rounded-lg border border-gray-200">
      <div className="mb-2">
        <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-gray-500 font-medium">Tidak ada data</p>
      <p className="text-gray-400 text-sm mt-1">Mulai buat data baru untuk menampilkannya di sini</p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {(onEdit || onDelete || actionsSlot) && (
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Aksi
                </th>
              )}
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-gray-50/50 transition-colors">
                {(onEdit || onDelete || actionsSlot) && (
                  <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <div className="flex justify-start gap-2 flex-wrap">
                      {actionsSlot && actionsSlot(row)}
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(row)} 
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors font-medium text-xs"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(row)} 
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-xs"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                )}
                {columns.map((col, j) => (
                  <td key={j} className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};