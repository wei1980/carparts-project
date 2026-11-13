import React from 'react';
import { render, screen } from '@testing-library/react';
import Table from './Table';

describe('Table 共用元件', () => {
  const columns = [
    { key: 'name', label: '零件名稱' },
    { key: 'qty', label: '數量', align: 'right' },
  ];
  const data = [{ id: '1', name: '機油過濾器', qty: 2 }];

  it('渲染表頭與資料列', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('零件名稱')).toBeInTheDocument();
    expect(screen.getByText('數量')).toBeInTheDocument();
    expect(screen.getByText('機油過濾器')).toBeInTheDocument();
  });
});
