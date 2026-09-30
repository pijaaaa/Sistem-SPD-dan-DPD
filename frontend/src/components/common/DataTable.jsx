import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { SkeletonTable } from './Loading';

export const DataTable = ({ columns, data, isLoading, onEdit, onDelete, actionsSlot }) => {
  if (isLoading) return <SkeletonTable rows={5} cols={columns.length + (onEdit || onDelete || actionsSlot ? 1 : 0)} />;
  
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
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-emerald-50 to-teal-50">
            <tr>
              {(onEdit || onDelete || actionsSlot) && (
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Aksi
                </th>
              )}
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-emerald-50/30 transition-colors">
                {(onEdit || onDelete || actionsSlot) && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex justify-start gap-2">
                      {actionsSlot && actionsSlot(row)}
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(row)} 
                          className="flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-md border transition-all min-w-[65px] text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-[9px] font-semibold leading-tight text-center">Edit</span>
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(row)} 
                          className="flex flex-col items-center justify-center gap-1 px-2.5 py-2 rounded-md border transition-all min-w-[65px] text-red-600 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[9px] font-semibold leading-tight text-center">Hapus</span>
                        </button>
                      )}
                    </div>
                  </td>
                )}
                {columns.map((col, j) => (
                  <td key={j} className="px-6 py-4 text-sm text-gray-900">
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