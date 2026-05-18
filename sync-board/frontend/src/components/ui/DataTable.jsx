import React from 'react';

export default function DataTable({ columns = [], rows = [], emptyState }) {
  return (
    <div className="table-wrap ui-table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key}>{column.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">{emptyState}</td>
            </tr>
          ) : rows.map((row, idx) => (
            <tr key={row.id || idx}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
