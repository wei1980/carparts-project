// Regression: AdminCategories must call admin-relative paths (no /admin/ prefix) —
// adminClient baseURL already ends with /api/admin.
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminCategories from './AdminCategories';
import { adminClient } from '../../api/client';

jest.mock('../../api/client', () => ({
  adminClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../components/ConfirmDialog', () => ({ confirmDialog: jest.fn(async () => true) }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const tree = [{ id: 1, name: '煞車', subcategories: [{ id: 11, name: '來令片' }] }];
beforeEach(() => {
  jest.clearAllMocks();
  adminClient.get.mockImplementation(async url => {
    if (url.includes('/admin/')) throw new Error(`Duplicated admin prefix: ${url}`);
    if (url === '/categories/tree') return { data: tree };
    return { data: [] };
  });
  adminClient.post.mockResolvedValue({ data: {} });
  adminClient.put.mockResolvedValue({ data: {} });
  adminClient.delete.mockResolvedValue({ data: {} });
});

it('loads the tree via /categories/tree without a duplicated /admin prefix', async () => {
  render(<AdminCategories />);
  expect(await screen.findByText('煞車')).toBeInTheDocument();
  expect(adminClient.get).toHaveBeenCalledWith('/categories/tree');
  expect(adminClient.get.mock.calls.every(([u]) => !u.includes('/admin/'))).toBe(true);
});

it('adds a category via /categories and reloads the tree', async () => {
  render(<AdminCategories />);
  await screen.findByText('煞車');
  fireEvent.change(screen.getByPlaceholderText('輸入新主分類名稱'), { target: { value: '底盤' } });
  fireEvent.click(screen.getByRole('button', { name: '新增主分類' }));
  await waitFor(() => expect(adminClient.post).toHaveBeenCalledWith('/categories', { name: '底盤' }));
  expect(adminClient.get).toHaveBeenCalledWith('/categories/tree');
});

it('renames a category via /categories/:id', async () => {
  render(<AdminCategories />);
  await screen.findByText('煞車');
  fireEvent.click(screen.getByText('煞車'));
  const input = screen.getByDisplayValue('煞車');
  fireEvent.change(input, { target: { value: '煞車系統' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存' }));
  await waitFor(() => expect(adminClient.put).toHaveBeenCalledWith('/categories/1', { name: '煞車系統' }));
});
