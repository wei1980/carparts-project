// Regression: AdminParts must call /parts (not '' or '/admin/parts') via adminClient,
// composing to /api/admin/parts exactly once. Mock helper test; full-page coverage
// lives in tests/admin-parts-list.ui.cjs.
import { render, screen, waitFor } from '@testing-library/react';
import AdminParts from './AdminParts';
import { adminClient } from '../../api/client';

jest.mock('../../api/client', () => ({
  adminClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../components/ConfirmDialog', () => ({ confirmDialog: jest.fn(async () => true) }));

beforeEach(() => {
  jest.clearAllMocks();
  adminClient.get.mockImplementation(async url => {
    if (url.includes('/admin/')) throw new Error(`Duplicated admin prefix: ${url}`);
    if (url.startsWith('/parts')) {
      return { data: { data: [{ id: 1, sku: 'KONI-001', name: '避震器', brand: 'KONI', msrp_price: 12000, stock_qty: 5, is_active: true }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } } };
    }
    return { data: [] };
  });
});

it('loads parts with the exact /parts relative path', async () => {
  render(<AdminParts />);
  await screen.findByText('KONI-001');
  await waitFor(() => expect(adminClient.get).toHaveBeenCalledWith('/parts', expect.anything()));
  expect(adminClient.get.mock.calls.every(([u]) => !u.includes('/admin/'))).toBe(true);
});

it('renders zero rows as a genuine empty result, not a failure', async () => {
  adminClient.get.mockImplementation(async url => {
    if (url.startsWith('/parts')) return { data: { data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } };
    return { data: [] };
  });
  render(<AdminParts />);
  expect(await screen.findByText('沒有符合的商品')).toBeInTheDocument();
});
