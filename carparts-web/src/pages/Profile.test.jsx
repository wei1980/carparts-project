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

it('會員頁保留個人資料與常用入口，不再顯示模擬 VIP／點數／優惠券', async () => {
  render(<Profile />);
  // 個人資料卡片
  expect(screen.getByText('會員')).toBeInTheDocument();
  expect(screen.getByText('收件地址')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /編輯個人／收件資料/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /編輯個人／收件資料/ }));
  expect(mockNavigate).toHaveBeenCalledWith('/settings');

  // 會員權益卡：只說「規劃中」，不得出現任何模擬數字或假綁定
  expect(screen.getByText('會員權益')).toBeInTheDocument();
  expect(screen.getByText(/紅利點數、會員等級與優惠券正在規劃中/)).toBeInTheDocument();
  expect(screen.queryByText('本年度累積消費')).not.toBeInTheDocument();
  expect(screen.queryByText('🪙 紅利點數')).not.toBeInTheDocument();
  expect(screen.queryByText('🎟️ 可用優惠券')).not.toBeInTheDocument();
  expect(screen.queryByText(/Google/)).not.toBeInTheDocument();

  // 常用入口（真實頁面）
  expect(screen.getAllByRole('button', { name: /我的訂單/ }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /我的預約/ }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /願望清單/ }).length).toBeGreaterThan(0);

  // 設定與安全
  expect(screen.getByText('📍 預設收件地址')).toBeInTheDocument();
  expect(screen.getByText('🔒 帳號安全與連動')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '修改密碼' })).toBeInTheDocument();
  expect(vehicleAPI.getAll).not.toHaveBeenCalled();
  expect(screen.queryByText('我的車型')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /新增車|刪除|確認更新/ })).not.toBeInTheDocument();
});
