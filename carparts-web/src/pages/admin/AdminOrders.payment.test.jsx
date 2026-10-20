import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminOrders from './AdminOrders';
import { adminClient } from '../../api/client';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../../api/client', () => ({ adminClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
it('order payment action opens bank review instead of confirming without a transfer', async () => {
 adminClient.get.mockResolvedValue({data: [{id:1, order_number:'TEST-ORDER', status:'PENDING_PAYMENT', orderType:'INSTOCK', total_amount:1000, created_at:'2026-09-17'}]});
 render(<AdminOrders />);
 await waitFor(() => expect(adminClient.get).toHaveBeenCalledWith('/orders'));
 fireEvent.click(await screen.findByRole('button', {name:/確認收款|前往銀行对帳|前往銀行對帳/}));
 expect(mockNavigate).toHaveBeenCalledWith('/admin/bank');
 expect(adminClient.post).not.toHaveBeenCalled();
});
