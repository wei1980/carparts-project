import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CurrentVehiclePicker, { DESKTOP_VEHICLE_SELECT_LABEL, MOBILE_VEHICLE_SELECT_LABEL } from './CurrentVehiclePicker';
import { vehicleLabel } from '../context/CurrentVehicleContext';
const mockUseCurrentVehicle = jest.fn();
jest.mock('../context/CurrentVehicleContext', () => ({
 useCurrentVehicle: () => mockUseCurrentVehicle(),
 vehicleLabel: (v) => [v?.make, v?.model, v?.year].filter(Boolean).join(' ') || '尚未選擇車輛',
}));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
beforeEach(() => mockUseCurrentVehicle.mockReturnValue({ vehicles: [], currentVehicle: null, loading: false, switching: false, error: '', refreshVehicles: jest.fn(), selectVehicle: jest.fn() }));

it('目前車輛選單加寬以顯示完整車型，截斷時以原生選單展示全文', () => {
 mockUseCurrentVehicle.mockReturnValue({
  vehicles: [{ id: 'v1', make: 'Mercedes-Benz', model: 'C300 AMG Line', year: 2021, licensePlate: 'ABC-1234' }],
  currentVehicle: { id: 'v1', make: 'Mercedes-Benz', model: 'C300 AMG Line', year: 2021, licensePlate: 'ABC-1234' },
  loading: false, switching: false, error: '', refreshVehicles: jest.fn(), selectVehicle: jest.fn(),
 });
 render(<CurrentVehiclePicker />);
 const select = screen.getByRole('combobox', { name: DESKTOP_VEHICLE_SELECT_LABEL });
 expect(select.className).toContain('max-w-full');
 expect(screen.queryByTestId('vehicle-full-label')).not.toBeInTheDocument();
 // vehicleLabel 為 make/model/year（不含車牌）——與 CurrentVehicleContext 的實作一致
 expect(screen.getAllByText('Mercedes-Benz C300 AMG Line 2021')).toHaveLength(1);
 expect(select).toHaveAttribute('title', 'Mercedes-Benz C300 AMG Line 2021');
 expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Mercedes-Benz C300 AMG Line 2021');
 render(<CurrentVehiclePicker mobile />);
 const mobileSelect = screen.getByRole('combobox', { name: MOBILE_VEHICLE_SELECT_LABEL });
 expect(mobileSelect.className).toContain('max-w-full');
});
