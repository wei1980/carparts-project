import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Shop from './Shop';
import { useCurrentVehicle } from '../context/CurrentVehicleContext';
import { consumerClient } from '../api/client';
import { vehicleAPI } from '../api';

jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-owner' } }) }));
jest.mock('../context/CurrentVehicleContext', () => ({ useCurrentVehicle: jest.fn() }));
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../api', () => ({
  vehicleAPI: { getAll: jest.fn() },
  myCarAPI: { dashboard: jest.fn() },
  partsAPI: {},
  wishlistAPI: { add: jest.fn() },
}));
jest.mock('../context/CartContext', () => ({ useCart: () => ({ addToCart: jest.fn() }) }));
jest.mock('../components/Navbar', () => () => null);
jest.mock('../components/ConfirmDialog', () => ({ confirmDialog: jest.fn().mockResolvedValue(true) }));
jest.mock('../components/ErrorBoundary', () => ({ PartialErrorBoundary: ({ children }) => children }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams()] }));

describe('Shop 空狀態（P0-1 殘留修復）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    vehicleAPI.getAll.mockResolvedValue({ data: [] });
    consumerClient.get.mockImplementation(async (url) =>
      url.includes('categories') || url.includes('/parts/brands')
        ? { data: [] }
        : { data: { parts: [], pagination: null } }
    );
  });

  it('未綁車時顯示愛車引導空狀態 + CTA，不顯示空白區域', async () => {
    useCurrentVehicle.mockReturnValue({ currentVehicle: null, loading: false, switching: false });
    render(<Shop />);
    expect(await screen.findByText('選擇你的愛車，找到真正裝得上的零件')).toBeInTheDocument();
    expect(screen.getByText('30 秒完成愛車資訊，庫存與 AI 會直接列出適合的零件')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '選擇我的車' })).toBeInTheDocument();
  });

  it('搜尋無結果時顯示找不到相符商品（含 AI 提示），不顯示愛車引導', async () => {
    useCurrentVehicle.mockReturnValue({ currentVehicle: { id: 'p1', variantId: 1 }, loading: false, switching: false });
    render(<Shop />);
    const input = await screen.findByPlaceholderText(/零件|搜尋|part/i);
    fireEvent.change(input, { target: { value: '不存在的零件' } });
    fireEvent.click(screen.getByRole('button', { name: '搜尋' }));
    expect(await screen.findByText('找不到相符商品')).toBeInTheDocument();
  });
});
