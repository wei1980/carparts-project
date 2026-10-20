import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {ModificationEditor} from './ModificationEditor';
import {vehicleAPI} from '../api';
jest.mock('../api',()=>({vehicleAPI:{getModifications:jest.fn(),addModification:jest.fn(),deleteModification:jest.fn()}}));
jest.mock('../api/client',()=>({consumerClient:{get:jest.fn(),post:jest.fn(),patch:jest.fn(),delete:jest.fn()}}));
jest.mock('./ConfirmDialog',()=>({confirmDialog:jest.fn(async()=>true)}));
jest.mock('react-hot-toast',()=>({__esModule:true,default:{success:jest.fn(),error:jest.fn()}}));
jest.mock('react-router-dom',()=>({useNavigate:()=>jest.fn()}));
beforeEach(()=>{jest.clearAllMocks();vehicleAPI.getModifications.mockResolvedValue({data:[]});});
it('records installed caliper specifications, not construction history, and keeps saved ID',async()=>{
 vehicleAPI.addModification.mockImplementation(async(id,data)=>({data:{...data,id:'saved-mod'}}));
 render(<ModificationEditor vehicleId="vehicle-a"/>);
 fireEvent.click(await screen.findByRole('button',{name:/煞車系統/}));
 const caliperCard = (await screen.findByText('多活塞卡鉗套組', { selector: 'div' })).parentElement;
 fireEvent.click(within(caliperCard).getByRole('button',{name:/紀錄改裝/}));
 expect(screen.queryByText(/這裡記錄目前車上的改裝品，不是施工履歷/)).not.toBeInTheDocument();
 expect(screen.queryByText(/前後軸不同卡鉗請在備註分別記錄/)).not.toBeInTheDocument();
 for(const label of ['安裝日期','安裝里程 (km)','工資成本','保固期限','施工車廠 ID','前照片','後照片']) expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('品牌'),{target:{value:'AP Racing'}});
 fireEvent.change(screen.getByLabelText('型號'),{target:{value:'CP9660'}});
 fireEvent.change(screen.getByLabelText('安裝位置'),{target:{value:'front'}});
 fireEvent.change(screen.getByLabelText('來令片形狀碼／料號'),{target:{value:'supplier-reference'}});
 fireEvent.click(screen.getByRole('button',{name:'確認新增'}));
 await waitFor(()=>expect(vehicleAPI.addModification).toHaveBeenCalledWith('vehicle-a',{
 category:'brake',partType:'caliper',brand:'AP Racing',model:'CP9660',specJson:{axle:'front',shapeCode:'supplier-reference'},note:'',beforePhotoUrls:[]
 }));
 await screen.findByRole('button',{name:/刪除/});
 fireEvent.click(screen.getByRole('button',{name:/刪除/}));
 await waitFor(()=>expect(vehicleAPI.deleteModification).toHaveBeenCalledWith('vehicle-a','saved-mod'));
});
