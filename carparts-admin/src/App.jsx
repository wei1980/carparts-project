import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

// Lazy load components (前台頁面)
const Shop = lazy(() => import("./Shop.jsx"));
const Product = lazy(() => import("./Product.jsx"));

// Admin pages (後台頁面)
const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard.jsx"));
const AdminMakes = lazy(() => import("./admin/AdminMakes.jsx"));
const AdminVehicles = lazy(() => import("./admin/AdminVehicles.jsx"));
const AdminParts = lazy(() => import("./admin/AdminParts.jsx"));
const AdminPartEdit = lazy(() => import("./admin/AdminPartEdit.jsx"));
const AdminShopReview = lazy(() => import("./admin/AdminShopReview.jsx"));

// 錯誤邊界處理：防止單一頁面錯誤導致整個 App 崩潰
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("ErrorBoundary caught:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ maxWidth: 960, margin: "24px auto", padding: 16 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>前端錯誤</h1>
          <pre style={{ whiteSpace: "pre-wrap", color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 8 }}>
            {String(this.state.err?.message || this.state.err)}
          </pre>
          <p style={{ fontSize: 14, color: "#555" }}>
            請確認後端是否已啟動，以及 <code>/health</code> API 是否正常回應。
          </p>
          <Link to="/shop?page=1" style={{ color: "#2563eb" }} onClick={() => this.setState({ err: null })}>
            重試 / 回商品列表
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

// 頁面外框 (Navbar)
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/shop?page=1" className="font-bold text-xl text-blue-700 tracking-tight">
              AutoParts B2B
            </Link>
            <nav className="hidden md:flex text-sm font-medium text-gray-600 gap-6">
              <Link className="hover:text-blue-600 transition-colors" to="/shop?page=1">零件商城</Link>
              <Link className="hover:text-blue-600 transition-colors" to="/admin">管理後台</Link>
            </nav>
          </div>
          {/* 手機版選單可在此擴充 */}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="p-8 text-center text-gray-500">載入中...</div>}>
          <Shell>
            <Routes>
              {/* 首頁轉址到商店 */}
              <Route path="/" element={<Navigate to="/shop?page=1" replace />} />
              
              {/* 前台路由 */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/p/:sku" element={<Product />} />
              
              {/* 後台路由 (巢狀結構) */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="makes" element={<AdminMakes />} />
                <Route path="vehicles" element={<AdminVehicles />} />
                <Route path="parts" element={<AdminParts />} />
                <Route path="parts/:id" element={<AdminPartEdit />} />
                <Route path="shops/review" element={<AdminShopReview />} />
              </Route>

              {/* 404 處理 */}
              <Route path="*" element={<Navigate to="/shop?page=1" replace />} />
            </Routes>
          </Shell>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}