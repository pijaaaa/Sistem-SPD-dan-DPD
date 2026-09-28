import React from 'react';
import { Loader2 } from 'lucide-react';

export const DataTable = ({ columns, data, isLoading, onEdit, onDelete, actionsSlot }) => {
  if (isLoading) return (
    <div className="py-12 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
      <p className="text-gray-500">Memuat data...</p>
    </div>
  );
  
  if (!data || data.length === 0) return (
    <div className="py-12 text-center bg-white rounded-lg border border-gray-200">
      <p className="text-gray-500">Tidak ada data.</p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete || actionsSlot) && (
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-gray-50 transition-colors">
                {columns.map((col, j) => (
                  <td key={j} className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
                {(onEdit || onDelete || actionsSlot) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {actionsSlot && actionsSlot(row)}
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(row)} 
                          className="px-3 py-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(row)} 
                          className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};