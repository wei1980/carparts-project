import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import MyCar from './MyCar';
import { myCarAPI, vehicleAPI } from '../api';
const mockVehicle = { id: 'v1', make: 'BMW', model: '320i', year: 2020, vin: 'original', licensePlate: 'ABC', variantId: 1 };
const mockLocation = { state: null };
const mockRefresh = jest.fn(async () => {});
jest.mock('../context/CurrentVehicleContext', () => ({ useCurrentVehicle: () => ({ vehicles: [mockVehicle], currentVehicle: mockVehicle, switching: false, refreshVehicles: mockRefresh }) }));
jest.mock('../components/Navbar', () => () => null);
jest.mock('../components/ModificationEditor', () => ({ ModificationEditor: () => <div>改裝編輯器</div> }));
jest.mock('../components/ConfirmDialog', () => ({ confirmDialog: jest.fn(async () => true) }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useLocation: () => mockLocation, useSearchParams: () => [new URLSearchParams()] }));
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn(async () => ({ data: [] })), post: jest.fn(async () => ({ data: {} })), patch: jest.fn(async () => ({ data: {} })), delete: jest.fn(async () => ({ data: {} })) }, garageClient: { get: jest.fn(async () => ({ data: [] })) } }));
jest.mock('../api', () => ({ myCarAPI: { dashboard: jest.fn() }, vehicleAPI: { create: jest.fn(), update: jest.fn(), delete: jest.fn() } }));
beforeEach(() => {
 jest.clearAllMocks();
 mockLocation.state = null;
 myCarAPI.dashboard.mockResolvedValue({ data: { vehicle: mockVehicle, history: [], reminders: [], suggestions: [] } });
 vehicleAPI.update.mockResolvedValue({ data: mockVehicle });
 vehicleAPI.create.mockResolvedValue({ data: mockVehicle });
});
it('愛車首頁摘要與三分頁，編輯表單按需展開、刪除收進管理選單', async () => {
 render(<MyCar />);
 await screen.findByRole('tab', { name: '車輛資料', selected: true });
 expect(screen.queryByRole('heading', { name: '新增車輛' })).not.toBeInTheDocument();
 // 刪除為直接操作按鈕（已從管理 dropdown 改為直達）
 expect(screen.getByRole('button', { name: /刪除/ })).toBeVisible();

 fireEvent.click(within(screen.getByRole('heading', { name: '我的車輛列表' }).closest('div')).getByRole('button', { name: '編輯' }));
 expect(screen.getByLabelText('VIN')).toHaveValue('original');
 fireEvent.change(screen.getByLabelText('VIN'), { target: { value: 'updated' } });
 fireEvent.click(screen.getByRole('button', { name: '更新車輛' }));
 await waitFor(() => expect(vehicleAPI.update).toHaveBeenCalledWith('v1', expect.objectContaining({ vin: 'updated' })));
 await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
 fireEvent.click(screen.getByRole('tab', { name: '目前改裝品' }));
 expect(screen.getByText('改裝編輯器')).toBeInTheDocument();
 expect(screen.queryByLabelText('VIN')).not.toBeInTheDocument();
 expect(screen.queryByText('🔔 保養提醒')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('tab', { name: '保養紀錄' }));
 expect(screen.getByText('🔔 保養提醒')).toBeInTheDocument();
 expect(screen.queryByText('改裝編輯器')).not.toBeInTheDocument();
});
it('沒有車輛也能在愛車頁新增，不跳往其他編輯頁', async () => {
 myCarAPI.dashboard.mockResolvedValue({ data: { vehicle: null, history: [], reminders: [], suggestions: [] } });
 render(<MyCar />);
 fireEvent.click(await screen.findByRole('button', { name: /新增車輛/ }));
 expect(screen.getByRole('heading', { name: '新增車輛' })).toBeInTheDocument();
 expect(screen.getByLabelText('年份 *')).toBeInTheDocument();
});

it('既有新增入口會直接展開愛車新增表單', async () => {
 mockLocation.state = { openVehicleManager: true };
 render(<MyCar />);
 expect(await screen.findByRole('heading', { name: '新增車輛' })).toBeInTheDocument();
});
