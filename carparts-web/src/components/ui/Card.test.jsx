import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card 共用元件', () => {
  it('渲染 title + children', () => {
    render(
      <Card title="我的愛車">
        <p>內容區塊</p>
      </Card>
    );
    expect(screen.getByText('我的愛車')).toBeInTheDocument();
    expect(screen.getByText('內容區塊')).toBeInTheDocument();
  });

  it('有 actions 時渲染', () => {
    render(
      <Card title="我的愛車" actions={<button>＋</button>}>
        <p>內容</p>
      </Card>
    );
    expect(screen.getByText('＋')).toBeInTheDocument();
  });
});
