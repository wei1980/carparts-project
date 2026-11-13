import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Dialog from './Dialog';

describe('Dialog 共用元件', () => {
  it('open=false 時不渲染', () => {
    const { container } = render(
      <Dialog open={false} onClose={jest.fn()} title="刪除確認">
        <p>內容</p>
      </Dialog>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('open=true 時渲染 title 與 children', () => {
    render(
      <Dialog open onClose={jest.fn()} title="刪除確認">
        <p>確定刪除？</p>
      </Dialog>
    );
    expect(screen.getByText('刪除確認')).toBeInTheDocument();
    expect(screen.getByText('確定刪除？')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('點擊關閉按鈕呼叫 onClose', () => {
    const onClose = jest.fn();
    render(
      <Dialog open onClose={onClose} title="刪除確認">
        <p>內容</p>
      </Dialog>
    );
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
