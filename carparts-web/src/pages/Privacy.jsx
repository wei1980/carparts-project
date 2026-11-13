// src/pages/Privacy.jsx — 隱私權政策頁（Sprint 1 / P1-07：Footer／信任頁）
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <Navbar />
      <main className="page-shell max-w-3xl py-10">
        <h1 className="text-3xl font-black tracking-tight mb-2">隱私權政策</h1>
        <p className="text-sm text-slate-500 mb-8">最後更新：2026-10-24</p>
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">一、資料蒐集</h2>
            <p>我們蒐集車輛資訊、聯絡資訊、保養紀錄與訂單需求，用於提供與優化服務。</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">二、使用與分享</h2>
            <p>車輛與里程等資料僅提供授權車廠與平台內必要流程使用；未經同意不販售。</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">三、使用者權益</h2>
            <p>您可請求查閱、更正或刪除個人資料；流程請以客服聯繫為準。</p>
          </section>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-10 px-6 py-3 font-bold">← 返回</button>
      </main>
    </div>
  );
}
