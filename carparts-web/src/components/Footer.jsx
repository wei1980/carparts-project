// src/components/Footer.jsx — 全站 Footer（Sprint 1 / P1-07）：公司資訊、客服、政策連結
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#26313d] bg-[#0e141b]">
      <div className="page-shell max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold mb-3">汽車零件與保養服務</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              專業汽車零件與到店保養服務，支援客戶與合作車廠使用，讓愛車持續安全駕駛。
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">客服與購物</h4>
            <ul className="text-sm text-slate-400 space-y-2">
              <li><a href="tel:+886988613188" className="hover:text-blue-400 transition">客服專線：0988-613-188</a></li>
              <li><a href="https://line.me/R/ti/p/%40bpd6939f" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">LINE：@bpd6939f</a></li>
              <li><a href="/wishlist" className="hover:text-blue-400 transition">我的願望清單</a></li>
              <li><a href="/appointments" className="hover:text-blue-400 transition">我的預約</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3">政策</h4>
            <ul className="text-sm text-slate-400 space-y-2">
              <li><a href="/terms" className="hover:text-blue-400 transition">服務條款</a></li>
              <li><a href="/privacy" className="hover:text-blue-400 transition">隱私權政策</a></li>
              <li><a href="/garages" className="hover:text-blue-400 transition">合作車廠</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-[#1e2a36] text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-2">
          <span>統一編號：—</span>
          <span>© {new Date().getFullYear()} Carparts Taiwan</span>
        </div>
      </div>
    </footer>
  );
}
