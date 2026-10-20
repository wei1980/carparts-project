import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Shop from './Shop';
import { CurrentVehicleProvider } from '../context/CurrentVehicleContext';
jest.mock('../context/AuthContext', () => ({useAuth:()=>({user:{id:'test-owner'}})}));
import { consumerClient } from '../api/client';
import { vehicleAPI } from '../api';
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn() } }));
beforeEach(() => { window.scrollTo = jest.fn(); });
jest.mock('../api', () => ({ vehicleAPI: {getAll:jest.fn()}, myCarAPI:{dashboard:jest.fn(async()=>({data:{vehicle:(await require('../api').vehicleAPI.getAll()).data[0]}}))}, partsAPI:{} }));
jest.mock('../context/CartContext', () => ({useCart:()=>({addToCart:jest.fn()})}));
jest.mock('../components/Navbar',()=>()=>null);
jest.mock('../components/ErrorBoundary',()=>({PartialErrorBoundary:({children})=>children}));
jest.mock('react-router-dom',()=>({useNavigate:()=>jest.fn(),useSearchParams:()=>[new URLSearchParams()]}));
it('keeps profile UUID for selection but sends integer variantId for hot and search', async()=>{
 vehicleAPI.getAll.mockResolvedValue({data:[{id:'f7a5d404-2222-4444-8888-123456789abc',variantId:321,make:'Toyota',model:'Test'}]});
 consumerClient.get.mockImplementation(async url => ({data:url.includes('categories')?[]:{parts:[{id:1,name:'fixture',msrp_price:100,stock_qty:1}],pagination:{page:1,pages:1,total:1}}}));
 render(<CurrentVehicleProvider><Shop /></CurrentVehicleProvider>);
 await waitFor(()=>expect(consumerClient.get).toHaveBeenCalledWith('/parts/recommended',expect.objectContaining({params:expect.objectContaining({variantId:321,page:1})})));
 fireEvent.click(await screen.findByRole('button',{name:'搜尋'}));
 await waitFor(()=>expect(consumerClient.get.mock.calls.filter(([url])=>url==='/parts/recommended')).toHaveLength(2));
 const params=consumerClient.get.mock.calls.filter(([url])=>url==='/parts/recommended')[1][1].params;
 expect(params.variantId).toBe(321);
 expect(params.vehicleId).toBeUndefined();
 expect(params.page).toBe(1);
});
it('uses the API pages field to navigate catalogue pages without losing variant', async()=>{
 vehicleAPI.getAll.mockResolvedValue({data:[{id:'profile-uuid',variantId:321,make:'Toyota',model:'Test'}]});
 consumerClient.get.mockImplementation(async (url,config) => ({data:url.includes('categories')?[]:{parts:[{id:1,name:'fixture',msrp_price:100,stock_qty:1}],pagination:{page:config.params.page,pages:2,total:13}}}));
 render(<CurrentVehicleProvider><Shop /></CurrentVehicleProvider>);
 const next = await screen.findByRole('button',{name:'下一頁 →'});
 fireEvent.click(next);
 await waitFor(()=>expect(consumerClient.get).toHaveBeenCalledWith('/parts/recommended',expect.objectContaining({params:expect.objectContaining({variantId:321,page:2})})));
 // 分頁列已改為頁碼按鈕（第 1 / 2 頁）＋總件數；第 2 頁按鈕為目前頁
 expect(await screen.findByRole('button',{name:'2'})).toHaveClass('font-bold');
 expect(screen.getByText(/共 13 件/)).toBeInTheDocument();
});
