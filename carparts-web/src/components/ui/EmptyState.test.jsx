import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState 共用元件', () => {
  it('渲染 icon + title + description', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">🔧</span>}
        title="尚無預約記錄"
        description="預約保養或到店安裝，這裡會顯示車廠與時間"
      />
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    expect(screen.getByText('尚無預約記錄')).toBeInTheDocument();
    expect(screen.getByText(/預約保養或到店安裝/)).toBeInTheDocument();
  });

  it('只給 primaryAction 時渲染主 CTA', () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        icon={<span>🛒</span>}
        title="購物車是空的"
        primaryAction={{ label: '去逛商城', onClick }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '去逛商城' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('primaryAction 與 secondaryAction 並列渲染', () => {
    render(
      <EmptyState
        icon={<span>💔</span>}
        title="願望清單是空的"
        primaryAction={{ label: '去逛逛零件商城', onClick: jest.fn() }}
        secondaryAction={{ label: '回到我的愛車', onClick: jest.fn() }}
      />
    );
    expect(screen.getByRole('button', { name: '去逛逛零件商城' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '回到我的愛車' })).toBeInTheDocument();
  });
});
