import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import AdminBank from './AdminBank';
import {adminClient} from '../../api/client';
jest.mock('../../api/client',()=>({adminClient:{get:jest.fn(),post:jest.fn()}}));
it('uses admin-relative routes and requires explicit bank transaction/history confirmation',async()=>{
 const fingerprint='a'.repeat(64);
 adminClient.get.mockResolvedValue({data:{transactions:[{row:2,date:'2026-09-17',amount:1000,memo:'fixture',fingerprint,claimed:false,ambiguous:false}],pending_orders:[]}});
 adminClient.post.mockResolvedValue({data:{summary:{matched:0,manual_review:1,unmatched_transactions:1,total_transactions:1},matched:[],manual_review:[{order_id:1,order_number:'fixture',stage:'full',expected_amount:1000,reason:'review'}],unmatched_transactions:[]}});
 render(<AdminBank/>);
 // 伺服器端分頁：端點需帶 page / pageSize / q（q 為選填，故只斷言前兩者）
 await waitFor(()=>expect(adminClient.get).toHaveBeenCalledWith('/bank/transactions', {
   params: expect.objectContaining({ page: expect.any(Number), pageSize: expect.any(Number) }),
 }));
 fireEvent.click(await screen.findByRole('button',{name:/執行.*比對/}));
 const confirm=await screen.findByRole('button',{name:'手動確認'});
 expect(confirm).toBeDisabled();
 // 銀行交易選擇器為多選（分次匯款），aria-label 為「銀行交易（可多選，分次匯款）」
 const listbox=screen.getByRole('listbox',{name:/銀行交易/});
 expect(listbox).toHaveAttribute('multiple');
 // 多選框無法用 target.selectedOptions 模擬，直接設定 option 的 selected
 const option=[...listbox.options].find(o=>o.value===fingerprint);
 option.selected=true;
 fireEvent.change(listbox);
 fireEvent.click(screen.getByRole('checkbox',{name:/歷史/}));
 await waitFor(()=>expect(confirm).not.toBeDisabled());
 fireEvent.click(confirm);
 // manual-confirm 送交易指紋陣列（分次匯款可多筆）
 await waitFor(()=>expect(adminClient.post).toHaveBeenCalledWith('/orders/1/manual-confirm',{stage:'full',transactionFingerprints:[fingerprint],historyReviewed:true}));
});
