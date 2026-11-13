import React from 'react';
import { render, screen } from '@testing-library/react';
import VehicleDetail from './VehicleDetail';
import { consumerClient } from '../api/client';
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn() } }));
jest.mock('../components/Navbar', () => () => null);
jest.mock('../context/CartContext', () => ({ useCart: () => ({ addToCart: jest.fn() }) }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useParams: () => ({ variantId: '321' }), useSearchParams: () => [new URLSearchParams()] }));
jest.mock('../components/ErrorBoundary', () => ({ PartialErrorBoundary: ({ children }) => children }));

it('renders applicable parts for the vehicle', async () => {
  consumerClient.get.mockImplementation(async (url) => {
    if (url === '/parts/recommended') return {
      data: {
        parts: [{
          id: 7, name: 'Air Filter', brand: 'BMW', msrp_price: 100, stock_qty: 2,
          is_official: true, image_url: '', is_universal: false, distributor_stock_qty: 0,
          isModificationMatch: false, created_at: new Date().toISOString(),
        }],
        pagination: { page: 1, pages: 1, total: 1 },
      },
    };
    return { data: {} };
  });
  render(<VehicleDetail />);
  expect(await screen.findByText('Air Filter')).toBeInTheDocument();
  expect(consumerClient.get).toHaveBeenCalledWith('/parts/recommended', expect.objectContaining({
    params: expect.objectContaining({ variantId: '321', sort: 'hot' }),
  }));
});

it('shows ErrorState when applicable parts fail to load', async () => {
  consumerClient.get.mockRejectedValue(new Error('boom'));
  render(<VehicleDetail />);
  expect(await screen.findByText('此車款適配零件載入失敗')).toBeInTheDocument();
});
