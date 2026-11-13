import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge 共用元件', () => {
  it('預設 tone=blue 渲染 children', () => {
    render(<Badge>現貨</Badge>);
    expect(screen.getByText('現貨')).toBeInTheDocument();
  });

  it('自訂 tone 渲染', () => {
    render(<Badge tone="green">在庫</Badge>);
    expect(screen.getByText('在庫')).toBeInTheDocument();
  });
});
