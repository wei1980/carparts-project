import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GarageList from './GarageList';
import { consumerClient, garageClient } from '../api/client';

jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn() }, garageClient: { get: jest.fn() } }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('../components/Navbar', () => () => null);

it('車主車廠清單使用 consumerClient，不重複 /api 前綴', async () => {
  consumerClient.get.mockImplementation(async url => {
    if (url === '/auth/profile') return { data: { address: '' } };
    if (url === '/garages') return { data: { 台北市: [{ id: 1, garage_name: '測試車廠', rating: 5, review_count: 0 }] } };
    throw new Error(`Unexpected URL: ${url}`);
  });
  garageClient.get.mockRejectedValue(new Error('Wrong identity client'));
  render(<GarageList />);
  await waitFor(() => expect(consumerClient.get).toHaveBeenCalledWith('/auth/profile'));
  expect(await screen.findByText('測試車廠')).toBeInTheDocument();
  expect(consumerClient.get).toHaveBeenCalledWith('/garages', { params: { groupBy: 'city', sortBy: 'distance' } });
  expect(garageClient.get).not.toHaveBeenCalled();
});
