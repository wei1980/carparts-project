import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Shop from './Shop';
import { CurrentVehicleProvider } from '../context/CurrentVehicleContext';
jest.mock('../context/AuthContext', () => ({useAuth:()=>({user:{id:'test-owner'}})}));
import { consumerClient } from '../api/client';
import { vehicleAPI } from '../api';

// 統一 API client：Bearer Token 現由 src/api/client.js 的 interceptor 自動注入
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../api', () => ({ vehicleAPI: {getAll:jest.fn()}, myCarAPI:{dashboard:jest.fn(async()=>({data:{vehicle:(await require('../api').vehicleAPI.getAll()).data[0]}}))}, partsAPI:{} }));
jest.mock('../context/CartContext', () => ({ useCart: () => ({ addToCart: jest.fn() }) }));
jest.mock('../components/Navbar', () => () => null);
jest.mock('../components/ConfirmDialog', () => ({ confirmDialog: jest.fn(async () => true) }));
jest.mock('../components/ErrorBoundary', () => ({ PartialErrorBoundary: ({ children }) => children }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams()] }));

// AI 無結果分支：登入使用者搜尋無結果並確認 AI 搜尋時，
// Authorization header 必須是「Bearer <token>」，不可送出損壞字串。
it('sends a well-formed Bearer Authorization header on AI fallback search', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(key => key === 'token' ? 'test-session-token' : null);
  // AI 無結果分支的確認對話框已 mock（見上方 confirmDialog mock）
  vehicleAPI.getAll.mockResolvedValue({
    data: [{ id: 'uuid-1', variantId: 42, make: 'Toyota', model: 'Test' }],
  });
  consumerClient.get.mockImplementation(async (url) =>
    url.includes('categories')
      ? { data: [] }
      : { data: { parts: [], pagination: null } }
  );
  consumerClient.post.mockResolvedValue({ data: { items_found: 0 } });

  render(<CurrentVehicleProvider><Shop /></CurrentVehicleProvider>);
  const input = await screen.findByPlaceholderText(/零件|搜尋|part/i);
  fireEvent.change(input, { target: { value: '不存在的零件' } });
  await waitFor(() => expect(consumerClient.get).toHaveBeenCalledWith('/parts/recommended', expect.anything()));
  fireEvent.click(await screen.findByRole('button', { name: '搜尋' }));

  await waitFor(() => expect(consumerClient.post).toHaveBeenCalled());
  const [url, formData, config] = consumerClient.post.mock.calls[0];
  expect(url).toBe('/ai/search-part');
  expect(formData.get('customerVehicleId')).toBe('uuid-1');
  // Authorization: Bearer <token> 由 client interceptor 統一注入（見 src/api/client.js）
  expect(config.headers['Content-Type']).toBe('multipart/form-data');
  await screen.findByRole('button', { name: '搜尋' });
  jest.restoreAllMocks();
  localStorage.clear();
});
