import React from 'react';
import {act,render,screen,waitFor,fireEvent} from '@testing-library/react';
import Shop from './Shop';
import { consumerClient } from '../api/client';
import {useCurrentVehicle} from '../context/CurrentVehicleContext';
jest.mock('../api/client', () => ({ consumerClient: { get: jest.fn() } }));
jest.mock('../context/CurrentVehicleContext',()=>({useCurrentVehicle:jest.fn()}));
jest.mock('../context/CartContext',()=>({useCart:()=>({addToCart:jest.fn()})}));
jest.mock('../components/Navbar',()=>()=>null);
jest.mock('react-router-dom',()=>({useNavigate:()=>jest.fn(),useSearchParams:()=>[new URLSearchParams()]}));
const reply = name => ({data:{parts:[{id:1,name,msrp_price:100,stock_qty:1}],pagination:{page:1,pages:1,total:1}}});
const vehicle=(id,variantId)=>useCurrentVehicle.mockReturnValue({currentVehicle:{id,variantId},loading:false,switching:false});
beforeEach(()=>{jest.clearAllMocks();window.scrollTo=jest.fn();vehicle('a',1);});
it.each(['hot','search'])('ignores a late old-vehicle %s response',async mode=>{
 let resolveOld;
 const pending=new Promise(resolve=>{resolveOld=resolve;});
 let calls=0;
 consumerClient.get.mockImplementation((url,config)=>{
  if(url.includes('categories'))return Promise.resolve({data:[]});
  if(url.includes('/parts/brands'))return Promise.resolve({data:[]});
  // 只計數商品目錄請求：頁面另會請求品牌清單，與本測試的競態無關
  if(!url.includes('/parts/recommended'))return Promise.resolve({data:[]});
  if(config.params.variantId===2)return Promise.resolve(reply('new vehicle product'));
  calls++;
  return mode==='search' && calls===1 ? Promise.resolve(reply('initial')) : pending;
 });
 const view=render(<Shop/>);
 if(mode==='search'){await screen.findByText('initial');fireEvent.click(screen.getByRole('button',{name:'搜尋'}));}
 await waitFor(()=>expect(calls).toBe(mode==='search'?2:1));
 vehicle('b',2);view.rerender(<Shop/>);
 await screen.findByText('new vehicle product');
 await act(async()=>resolveOld(reply('stale product')));
 expect(screen.queryByText('stale product')).not.toBeInTheDocument();
 expect(screen.getByText('new vehicle product')).toBeInTheDocument();
});
it('refreshes when variant changes on the same profile',async()=>{
 consumerClient.get.mockImplementation(async(url,config)=>url.includes('categories')?{data:[]}:reply(`variant ${config.params.variantId}`));
 const view=render(<Shop/>);await screen.findByText('variant 1');
 vehicle('a',2);view.rerender(<Shop/>);
 expect(await screen.findByText('variant 2')).toBeInTheDocument();
 expect(screen.queryByText('variant 1')).not.toBeInTheDocument();
});
