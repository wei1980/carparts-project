import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Profile from './Profile';
import { vehicleAPI } from '../api';
const mockNavigate = jest.fn();
const mockUpdateUser = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { name: '會員', address: '收件地址' }, updateUser: mockUpdateUser }) }));
jest.mock('../components/Navbar', () => () => null);
jest.mock('../api', () => ({ vehicleAPI: { getAll: jest.fn(async () => ({ data: [] })) } }));
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn(async () => ({ data: {} })), post: jest.fn(async () => ({ data: {} })) } }));
it('會員頁保留個人資料與 VIP/資產卡片，車輛管理只提供愛車頁入口', async () => {
  render(<Profile />);
  // 個人資料卡片
  expect(screen.getByText('會員')).toBeInTheDocument();
  expect(screen.getByText('收件地址')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /編輯個人／收件資料/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /編輯個人／收件資料/ }));
  expect(mockNavigate).toHaveBeenCalledWith('/settings');
  // VIP 升級進度卡（區塊 A 右側，填補留白）
  expect(screen.getByText('本年度累積消費')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /查看 VIP 完整權益/ })).toBeInTheDocument();
  // 資產橫條（區塊 B）
  expect(screen.getByText('🪙 紅利點數')).toBeInTheDocument();
  expect(screen.getByText('🎟️ 可用優惠券')).toBeInTheDocument();
  expect(screen.getByText('💰 本年消費總額')).toBeInTheDocument();
  // 設定與安全（區塊 C）
  expect(screen.getByText('📍 預設收件地址')).toBeInTheDocument();
  expect(screen.getByText('🔒 帳號安全與連動')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '修改密碼' })).toBeInTheDocument();
  expect(vehicleAPI.getAll).not.toHaveBeenCalled();
  expect(screen.queryByText('我的車型')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /新增車|刪除|確認更新/ })).not.toBeInTheDocument();
});
