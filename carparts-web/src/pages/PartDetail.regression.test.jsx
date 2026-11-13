import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PartDetail from './PartDetail';
import { CurrentVehicleProvider } from '../context/CurrentVehicleContext';
jest.mock('../context/AuthContext', () => ({useAuth:()=>({user:{id:'test-owner'}})}));
import { partsAPI, wishlistAPI } from '../api';
import { useCart } from '../context/CartContext';
import { TERMS } from '../constants/terms';
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn() }, garageClient: { get: jest.fn() } }));
jest.mock('../api', () => ({ partsAPI: { getCompatibility: jest.fn() }, vehicleAPI: {getAll:jest.fn(async()=>({data:[{id:'a',variantId:1}]}))}, myCarAPI:{dashboard:jest.fn(async()=>({data:{vehicle:{id:'a'}}}))}, wishlistAPI: { add: jest.fn() } }));
jest.mock('../context/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../components/Navbar', () => () => null);
const add = jest.fn();
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
 const location = {state: {part: {id:1, name:'測試零件', brand:'TEST', msrp_price:100, stock_qty:100, description:''}}};
 return { useParams: () => ({id:'1'}), useNavigate: () => mockNavigate, useLocation: () => location, useSearchParams: () => [new URLSearchParams()] };
});
beforeEach(() => { localStorage.clear(); add.mockClear(); useCart.mockReturnValue({addToCart:add}); partsAPI.getCompatibility.mockResolvedValue({data:{status:'NEEDS_REVIEW'}}); wishlistAPI.add.mockResolvedValue({ data: {} }); });
it.each(['NEEDS_VEHICLE','NEEDS_REVIEW','CONFIRMED'])('empty description makes no unsupported claims: %s', async status => {
 partsAPI.getCompatibility.mockResolvedValue({data:{status}});
 render(<CurrentVehicleProvider><PartDetail /></CurrentVehicleProvider>);
 await waitFor(() => expect(partsAPI.getCompatibility).toHaveBeenCalled());
 expect(screen.queryByText(/此商品適用於您選擇的車輛|通過原廠規格測試/)).not.toBeInTheDocument();
});
it.each(['-1','100','1.5','0',''])('rejects invalid quantity %s', async value => {
 render(<CurrentVehicleProvider><PartDetail /></CurrentVehicleProvider>);
 const input = await screen.findByRole('spinbutton');
 fireEvent.change(input, {target:{value}});
 fireEvent.click(screen.getByRole('button', {name:TERMS.ACTIONS.ADD_TO_CART}));
 expect(add).not.toHaveBeenCalled();
 expect(screen.queryByText(TERMS.ACTIONS.ADDED_TO_CART)).not.toBeInTheDocument();
 expect(input).toHaveAttribute('aria-invalid','true');
});
it('adds exactly the requested valid quantity', async () => {
 render(<CurrentVehicleProvider><PartDetail /></CurrentVehicleProvider>);
 fireEvent.change(await screen.findByRole('spinbutton'), {target:{value:'2'}});
 fireEvent.click(screen.getByRole('button', {name:TERMS.ACTIONS.ADD_TO_CART}));
 expect(add).toHaveBeenCalledTimes(2);
});
it('PDP wishlist add calls wishlist API', async () => {
 render(<CurrentVehicleProvider><PartDetail /></CurrentVehicleProvider>);
 const wishBtn = await screen.findByRole('button', { name: '加入願望清單' });
 fireEvent.click(wishBtn);
 await waitFor(() => expect(wishlistAPI.add).toHaveBeenCalledWith({ partId: '1' }));
});
it('PDP install CTA navigates to booking', async () => {
 render(<CurrentVehicleProvider><PartDetail /></CurrentVehicleProvider>);
 fireEvent.click(screen.getByRole('button', { name: '預約安裝' }));
 expect(mockNavigate).toHaveBeenCalledWith('/booking');
});
