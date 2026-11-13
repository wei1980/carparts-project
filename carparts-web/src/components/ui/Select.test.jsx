import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Select from './Select';

describe('Select 共用元件', () => {
  const options = [
    { value: 'a', label: 'BMW 3系' },
    { value: 'b', label: 'BMW 5系' },
  ];

  it('placeholder 未設定時不渲染 placeholder option', () => {
    render(<Select options={options} value="a" onChange={jest.fn()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('placeholder 設定時渲染', () => {
    render(<Select options={options} value="" onChange={jest.fn()} placeholder="請選擇" />);
    expect(screen.getByRole('option', { name: '請選擇' })).toBeInTheDocument();
  });

  it('渲染所有 options 並觸發 onChange', () => {
    const onChange = jest.fn();
    render(<Select options={options} value="a" onChange={onChange} placeholder="請選擇" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onChange).toHaveBeenCalled();
  });
});
