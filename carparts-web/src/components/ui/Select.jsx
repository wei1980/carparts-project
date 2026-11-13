// src/components/ui/Select.jsx — 共用下拉選單（Sprint 2 / design tokens）
// 規範：options（{value,label}[]）+ value/onChange；深色 surface token
import React from 'react';

export default function Select({ options = [], value, onChange, placeholder, className = '', ...rest }) {
  return (
    <select
      className={`h-11 px-4 bg-surface-700 border border-surface-600 rounded-xl text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${className}`}
      value={value}
      onChange={onChange}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
