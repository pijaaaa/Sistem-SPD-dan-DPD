import React from 'react';

export const DataTable = ({ columns, data, isLoading, onEdit, onDelete, actionsSlot }) => {
  if (isLoading) return <div className="py-8 text-center text-gray-500">Memuat data...</div>;
  if (!data || data.length === 0) return <div className="py-8 text-center text-gray-500">Tidak ada data.</div>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete || actionsSlot) && (
              <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50">
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
                      <button onClick={() => onEdit(row)} className="text-blue-600 hover:text-blue-900">Edit</button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(row)} className="text-red-600 hover:text-red-900">Hapus</button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};