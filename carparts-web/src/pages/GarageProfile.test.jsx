import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GarageProfile from './GarageProfile';
import { consumerClient } from '../api/client';

jest.mock('../components/Navbar', () => () => null);
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn() } }));

const garage = {
  id: 1,
  garage_name: '測試車廠',
  garage_phone: '02-1234-5678',
  garage_address: '台北市信義區測試路 1 號',
  rating: 4.5,
  review_count: 2,
  shop_type: '保養廠',
  opening_hours: { mon: '09:00-18:00', tue: '09:00-18:00', wed: null },
  labor_fees: [{ id: 1, name: '更換機油', price: 1200, note: '含機油芯' }],
  garage_photos: [{ url: '/media/garage_photos/test.jpg' }],
};

const reviews = {
  average: 4.5,
  count: 2,
  reviews: [
    {
      id: 10,
      rating: 5,
      comment: '施工細心，價格透明。',
      created_at: '2026-10-01T10:00:00.000Z',
      user: { name: '王小明' },
      appointment: { service_type: 'MAINTENANCE', vehicle: { make: 'Volkswagen', model: 'Golf GTI' } },
    },
  ],
};

describe('GarageProfile', () => {
  beforeEach(() => {
    consumerClient.get.mockImplementation((url) => {
      if (url.startsWith('/garages/')) return Promise.resolve({ data: garage });
      if (url.startsWith('/reviews/garage/')) return Promise.resolve({ data: reviews });
      return Promise.reject(new Error('unexpected ' + url));
    });
  });

  it('顯示車廠資訊、工資表、營業時間與評價', async () => {
    render(
      <MemoryRouter initialEntries={['/garages/1']}>
        <Routes>
          <Route path="/garages/:id" element={<GarageProfile />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: '測試車廠' })).toBeInTheDocument());

    expect(screen.getByText('台北市信義區測試路 1 號')).toBeInTheDocument();
    expect(screen.getByText('02-1234-5678')).toBeInTheDocument();
    expect(screen.getByText('更換機油')).toBeInTheDocument();
    expect(screen.getByText('NT$ 1,200')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('王**')).toBeInTheDocument();
    expect(screen.getByText('施工細心，價格透明。')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /立即預約保養/ }).length).toBeGreaterThan(0);
  });

  it('沒有評價與工資表時顯示清楚的空狀態', async () => {
    consumerClient.get.mockImplementation((url) => {
      if (url.startsWith('/garages/')) {
        return Promise.resolve({
          data: { ...garage, garage_photos: [], labor_fees: [], opening_hours: null, garage_phone: null, garage_address: null },
        });
      }
      return Promise.resolve({ data: { average: null, count: 0, reviews: [] } });
    });

    render(
      <MemoryRouter initialEntries={['/garages/1']}>
        <Routes>
          <Route path="/garages/:id" element={<GarageProfile />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: '測試車廠' })).toBeInTheDocument());
    expect(screen.getByText('尚無評價')).toBeInTheDocument();
    expect(screen.getByText('地址待補')).toBeInTheDocument();
    expect(screen.getByText('電話待補')).toBeInTheDocument();
    expect(screen.getByText('車廠尚未提供工資表，預約後由車廠報價。')).toBeInTheDocument();
  });
});
