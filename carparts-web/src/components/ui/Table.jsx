// src/components/ui/Table.jsx — 共用資料表（Sprint 2 / design tokens）
// 規範：columns（[{key,label,align?}][]）+ data（物件陣列）；深色 surface token
import React from 'react';

export default function Table({ columns = [], data = [], rowKey = 'id', className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-700">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-left font-medium text-surface-100 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row[rowKey] ?? i} className="border-b border-surface-700/50 last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
