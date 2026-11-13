import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button 共用元件', () => {
  it('渲染 children', () => {
    render(<Button>加入購物車</Button>);
    expect(screen.getByRole('button', { name: '加入購物車' })).toBeInTheDocument();
  });

  it('點擊呼叫 onClick', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>確定</Button>);
    fireEvent.click(screen.getByRole('button', { name: '確定' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled 時不可點擊', () => {
    const onClick = jest.fn();
    render(<Button disabled onClick={onClick}>確定</Button>);
    const btn = screen.getByRole('button', { name: '確定' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading 時顯示 spinner 且 disabled', () => {
    render(<Button loading>處理中</Button>);
    const btn = screen.getByRole('button', { name: /處理中/ });
    expect(btn).toBeDisabled();
  });

  it('fullWidth 時加 w-full class', () => {
    render(<Button fullWidth>全寬</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });
});
