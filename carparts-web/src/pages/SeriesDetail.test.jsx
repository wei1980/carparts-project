import React from 'react';
import { render, screen } from '@testing-library/react';
import SeriesDetail from './SeriesDetail';
import { consumerClient } from '../api/client';
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn() } }));
jest.mock('../components/Navbar', () => () => null);
jest.mock('../context/CartContext', () => ({ useCart: () => ({ addToCart: jest.fn() }) }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useParams: () => ({ slug: 'funk' }) }));
jest.mock('../components/ErrorBoundary', () => ({ PartialErrorBoundary: ({ children }) => children }));

it('renders series intro and hot parts', async () => {
  consumerClient.get.mockImplementation(async (url) => {
    if (url === '/parts/recommended') return {
      data: {
        parts: [{
          id: 9, name: 'Turbo Heat Blanket', brand: 'FUNK', msrp_price: 100, stock_qty: 2,
          is_official: false, image_url: '', is_universal: false, distributor_stock_qty: 0,
          isModificationMatch: false, created_at: new Date().toISOString(),
        }],
        pagination: { page: 1, pages: 1, total: 1 },
      },
    };
    return { data: {} };
  });
  render(<SeriesDetail />);
  expect(await screen.findByText('FUNK 渦輪隔熱毯')).toBeInTheDocument();
  expect(consumerClient.get).toHaveBeenCalledWith('/parts/recommended', expect.objectContaining({
    params: expect.objectContaining({ brand: 'FUNK', sort: 'hot' }),
  }));
});

it('shows ErrorState when series parts fail to load', async () => {
  consumerClient.get.mockRejectedValue(new Error('boom'));
  render(<SeriesDetail />);
  expect(await screen.findByText('系列零件載入失敗')).toBeInTheDocument();
});
