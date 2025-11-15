// src/App.jsx
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import React from "react";

const Shop = lazy(() => import("./Shop.jsx"));
const Product = lazy(() => import("./Product.jsx"));

// Admin pages
const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard.jsx"));
const AdminMakes = lazy(() => import("./admin/AdminMakes.jsx"));
const AdminVehicles = lazy(() => import("./admin/AdminVehicles.jsx"));
const AdminParts = lazy(() => import("./admin/AdminParts.jsx"));
const AdminPartEdit = lazy(() => import("./admin/AdminPartEdit.jsx"));

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
            請確認 <code>http://localhost:3000/health</code> 回 JSON，並檢查 proxy 是否把 API 轉到 3000。
          </p>
          <Link to="/shop?page=1" style={{ color: "#2563eb" }}>回商品列表</Link>
        </div>
      );
    }
    return this.props.children;
  }
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/shop?page=1" className="font-semibold text-lg">汽車零件商店</Link>
          <nav className="text-sm text-gray-600 flex gap-4">
            <Link className="hover:underline" to="/shop?page=1">前台</Link>
            <Link className="hover:underline" to="/admin">後台</Link>
          </nav>
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
        <Suspense fallback={<div style={{ padding: 24 }}>載入中…</div>}>
          <Shell>
            <Routes>
              <Route path="/" element={<Navigate to="/shop?page=1" replace />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/p/:sku" element={<Product />} />

              {/* Admin nested */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="makes" element={<AdminMakes />} />
                <Route path="vehicles" element={<AdminVehicles />} />
                <Route path="parts" element={<AdminParts />} />
                <Route path="parts/:id" element={<AdminPartEdit />} />
              </Route>

              <Route path="*" element={<Navigate to="/shop?page=1" replace />} />
            </Routes>
          </Shell>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
