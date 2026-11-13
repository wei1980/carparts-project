import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Booking from './Booking';
import { vehicleAPI } from '../api';
import { consumerClient } from '../api/client';

const garage = {
  id: 1,
  garage_name: '測試車廠',
  garage_address: '台北市信義區測試路 1 號',
  garage_phone: null,
  review_count: 0,
  opening_hours: {
    mon: '09:00-18:00', tue: '09:00-18:00', wed: '09:00-18:00', thu: '09:00-18:00',
    fri: '09:00-18:00', sat: '09:00-18:00', sun: null,
  },
  labor_fees: [],
  garage_photos: [],
};

jest.mock('react-router-dom', () => ({
  useParams: () => ({ garageId: '1' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: { garage: null } }),
}));
jest.mock('../components/Navbar', () => () => null);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('../api', () => ({
  vehicleAPI: { getAll: jest.fn() },
}));
jest.mock('../api/client', () => ({
  consumerClient: { get: jest.fn(), post: jest.fn() },
}));

describe('Booking（S2 服務類型／里程／時段）', () => {
  beforeEach(() => {
    vehicleAPI.getAll.mockResolvedValue({
      data: [{ id: 'v1', make: 'Volkswagen', model: 'Golf GTI', licensePlate: 'ABC-1234' }],
    });
    consumerClient.get.mockImplementation((url) => {
      if (url === '/garages/1') return Promise.resolve({ data: garage });
      if (url === '/appointments/installable-items') return Promise.resolve({ data: [] });
      if (url === '/garages/1/availability') {
        return Promise.resolve({ data: { capacity: 2, booked: ['10:00', '11:00'], counts: { '10:00': 2, '11:00': 1 } } });
      }
      return Promise.reject(new Error('unexpected ' + url));
    });
    consumerClient.post.mockResolvedValue({ data: {} });
  });

  it('要求服務類型，並把里程／狀況整理進 note', async () => {
    const { container } = render(<Booking />);
    await waitFor(() => expect(screen.getByLabelText(/服務類型/)).toBeInTheDocument());
    await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeInTheDocument());

    const submit = screen.getByRole('button', { name: /確認預約/ });
    fireEvent.click(submit);
    expect(await screen.findByText('請選擇服務類型')).toBeInTheDocument();
    expect(consumerClient.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/服務類型/), { target: { value: '定期保養' } });
    fireEvent.change(screen.getByLabelText(/目前里程/), { target: { value: '42500' } });
    fireEvent.change(screen.getByLabelText(/狀況描述/), { target: { value: '冷氣不冷' } });
    fireEvent.change(screen.getByLabelText(/備註/), { target: { value: '下午取車' } });
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-12-31' } });

    fireEvent.click(await screen.findByRole('button', { name: '11:00' }));
    fireEvent.click(screen.getByRole('button', { name: /確認預約/ }));
    await waitFor(() => expect(consumerClient.post).toHaveBeenCalled());

    const payload = consumerClient.post.mock.calls[0][1];
    expect(payload.serviceType).toBe('定期保養');
    expect(payload.mileageKm).toBe(42500);
    expect(payload.note).toContain('【目前里程】42,500 km');
    expect(payload.note).toContain('【狀況】冷氣不冷');
    expect(payload.note).toContain('【備註】下午取車');
  });

  it('已有人預約的時段會標記為已額滿並停用', async () => {
    const { container } = render(<Booking />);
    await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeInTheDocument());

    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-12-31' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '10:00（已額滿）' })).toBeDisabled());
    expect(screen.getByRole('button', { name: '11:00' })).not.toBeDisabled();
    expect(screen.getByText('剩 1')).toBeInTheDocument();
    expect(screen.getByText('此車廠每個時段可同時接 2 台車。')).toBeInTheDocument();
    expect(screen.getByText('已額滿時段會劃線；「剩 N」表示該時段還能接幾台車。')).toBeInTheDocument();
  });
});
