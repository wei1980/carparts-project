// src/pages/Terms.jsx — 服務條款頁（Sprint 1 / P1-07：Footer／信任頁）
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Navbar />
      <main className="page-shell max-w-3xl py-10">
        <h1 className="text-3xl font-black tracking-tight mb-2">服務條款</h1>
        <p className="text-sm text-slate-500 mb-8">最後更新：2026-10-24</p>
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">一、服務說明</h2>
            <p>本服務提供汽車零件販售、保養預約與到店安裝服務，介於車主、合作車廠與平台間。</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">二、訂單與付款</h2>
            <p>現貨商品依平台庫存與代購規則定價；代購訂金以訂單金額 50% 收取，尾款於代購到貨後通知補付。</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">三、退款與退換</h2>
            <p>依車主與車廠之約定處理；退換貨流程請以訂單狀態與車廠回覆為準。</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">四、責任限制</h2>
            <p>平台依授權車廠提供之零件與安裝資訊，車主應依實際駕駛環境審慎使用。</p>
          </section>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-10 px-6 py-3 font-bold">← 返回</button>
      </main>
    </div>
  );
}
