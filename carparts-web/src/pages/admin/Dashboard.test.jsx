import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard';
import { adminClient } from '../../api/client';
jest.mock('../../api/client', () => ({ adminClient: { get: jest.fn() } }));
jest.mock('./DashboardCharts', () => () => <div>charts</div>);
jest.mock('../../components/ErrorBoundary', () => ({ PartialErrorBoundary: ({ children }) => <>{children}</> }));
const stats = { overview: { totalUsers: 12, newUsersThisMonth: 1, totalOrders: 2, ordersThisMonth: 1, pendingAppointments: 0, todayAppointments: 0, totalGarages: 2 }, recentOrders: [], monthlySales: [], topParts: [] };
const insights = { best_sellers: [], turnover: [], overdue_preorders: [], summary: { overdue_count: 0 } };
beforeEach(() => jest.clearAllMocks());
it('uses admin-relative paths and renders the returned dashboard', async () => {
 adminClient.get.mockImplementation(async url => {
  if (url === '/stats/dashboard') return { data: stats };
  if (url === '/dashboard-insights?days=30') return { data: insights };
  throw new Error('Wrong admin URL');
 });
 render(<Dashboard />);
 expect(await screen.findByText('總會員')).toBeInTheDocument();
 expect(screen.getByText('12')).toBeInTheDocument();
 expect(adminClient.get).toHaveBeenCalledWith('/stats/dashboard');
 expect(adminClient.get).toHaveBeenCalledWith('/dashboard-insights?days=30');
});

it('keeps core stats visible when optional insights fail and allows retry', async () => {
 adminClient.get.mockImplementation(async url => {
  if (url === '/stats/dashboard') return { data: stats };
  throw new Error('insights unavailable');
 });
 render(<Dashboard />);
 expect(await screen.findByText('總會員')).toBeInTheDocument();
 expect(screen.getByRole('alert')).toHaveTextContent('營運洞察暫時無法載入');
 expect(screen.getByRole('button', { name: '重新載入' })).toBeInTheDocument();
});

it('a failed core request can recover using retry', async () => {
 adminClient.get.mockRejectedValue(new Error('offline'));
 render(<Dashboard />);
 expect(await screen.findByRole('alert')).toHaveTextContent('無法載入數據');
 adminClient.get.mockImplementation(async url => ({ data: url === '/stats/dashboard' ? stats : insights }));
 fireEvent.click(screen.getByRole('button', { name: '重新載入' }));
 expect(await screen.findByText('總會員')).toBeInTheDocument();
});
it('expired authentication shows a login action instead of empty statistics', async () => {
 adminClient.get.mockRejectedValue({ response: { status: 401 } });
 render(<Dashboard />);
 expect(await screen.findByRole('alert')).toHaveTextContent('管理員登入已失效或權限不足');
 expect(screen.getByRole('link', { name: '管理員登入' })).toHaveAttribute('href', '/admin/login');
 expect(screen.queryByText('總會員')).not.toBeInTheDocument();
});
