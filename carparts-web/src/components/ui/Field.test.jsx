import React from 'react';
import { render, screen } from '@testing-library/react';
import Field from './Field';

describe('Field 共用元件', () => {
  it('渲染 label 與 hint', () => {
    render(
      <Field label="車牌號" htmlFor="plate" hint="選填">
        <input id="plate" />
      </Field>
    );
    expect(screen.getByLabelText(/車牌號/)).toBeInTheDocument();
    expect(screen.getByText('選填')).toBeInTheDocument();
  });

  it('error 優先顯示', () => {
    render(
      <Field label="車牌號" htmlFor="plate" error="車牌格式錯誤">
        <input id="plate" />
      </Field>
    );
    expect(screen.getByText('車牌格式錯誤')).toBeInTheDocument();
  });
});
