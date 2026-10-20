import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminGarageSettings from './AdminGarageSettings';
import { adminClient } from '../../api/client';
jest.mock('../../api/client', () => ({ adminClient: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock('../../components/ConfirmDialog', () => ({ confirmDialog: jest.fn(async () => true) }));
const garage = { id: 7, company_name: '測試車廠', is_garage: true, is_approved: false, is_active: true };
beforeEach(() => {
 jest.clearAllMocks();
 adminClient.get.mockImplementation(async url => {
  if (url !== '/garages') throw new Error('Duplicated admin prefix');
  return { data: [garage] };
 });
 adminClient.patch.mockResolvedValue({ data: garage });
 adminClient.delete.mockResolvedValue({ data: { success: true } });
});
it('loads and mutates garages using admin-relative URLs', async () => {
 render(<AdminGarageSettings />);
 await screen.findByText('測試車廠');
 fireEvent.click(screen.getByRole('button', { name: '審核通過' }));
 await waitFor(() => expect(adminClient.patch).toHaveBeenCalledWith('/garages/7', { is_approved: true, is_garage: true }));
 fireEvent.click(screen.getByRole('button', { name: '編輯' }));
 fireEvent.click(screen.getByRole('button', { name: '儲存' }));
 await waitFor(() => expect(adminClient.patch).toHaveBeenCalledWith('/garages/7', expect.objectContaining({ company_name: '測試車廠' })));
 fireEvent.click(await screen.findByRole('button', { name: '刪除' }));
 await waitFor(() => expect(adminClient.delete).toHaveBeenCalledWith('/garages/7'));
});

it('distinguishes failed loading from an empty list and retries', async () => {
 adminClient.get.mockRejectedValueOnce(new Error('offline'));
 render(<AdminGarageSettings />);
 expect(await screen.findByRole('alert')).toHaveTextContent('車廠資料載入失敗');
 expect(screen.queryByText('目前沒有車廠資料')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: '重試' }));
 await screen.findByText('測試車廠');
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('shows a genuine empty result', async () => {
 adminClient.get.mockResolvedValue({ data: [] });
 render(<AdminGarageSettings />);
 expect(await screen.findByText('目前沒有車廠資料')).toBeInTheDocument();
});
