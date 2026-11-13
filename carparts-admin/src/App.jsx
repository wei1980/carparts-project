// C:\carparts\carparts-admin\src\App.jsx
// RETIRED: 此專案已退役。請改 carparts-web。見 C:\carparts\該改哪邊.md
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ==================== Public Pages ====================
const Shop = lazy(() => import("./Shop.jsx"));
const Product = lazy(() => import("./Product.jsx"));
const Checkout = lazy(() => import("./Checkout.jsx"));

// ==================== Admin Pages (原有) ====================
const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard.jsx"));
const AdminParts = lazy(() => import("./admin/AdminParts.jsx"));
const AdminPartEdit = lazy(() => import("./admin/AdminPartEdit.jsx"));
const AdminCompatibility = lazy(() => import("./admin/AdminCompatibility.jsx"));
const AdminMakes = lazy(() => import("./admin/AdminMakes.jsx"));
const AdminVehicles = lazy(() => import("./admin/AdminVehicles.jsx"));
const AdminBrands = lazy(() => import("./admin/AdminBrands.jsx"));
const AdminUsers = lazy(() => import("./admin/AdminUsers.jsx"));
const AdminShopReview = lazy(() => import("./admin/AdminShopReview.jsx"));
const AdminCategories = lazy(() => import("./admin/AdminCategories.jsx"));

// ==================== 🆕 後台管理頁面 ====================
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminAppointments = lazy(() => import("./pages/admin/AdminAppointments.jsx"));
const AdminGarageSettings = lazy(() => import("./pages/admin/AdminGarageSettings.jsx"));

// ==================== Error Boundary ====================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("ErrorBoundary caught:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 20, color: "red" }}>
          <h2>前端發生錯誤</h2>
          <pre>{String(this.state.err)}</pre>
          <button onClick={() => (window.location.href = "/")}>回首頁</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== 🆕 後台驗證 wrapper ====================
function AdminRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

// ==================== App ====================
export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="p-10 text-center">載入中...</div>}>
          <Routes>
            {/* ========== Public Routes ========== */}
            <Route path="/" element={<Navigate to="/shop" replace />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/p/:sku" element={<Product />} />
            <Route path="/checkout" element={<Checkout />} />

            {/* ========== 🆕 後台獨立登入 ========== */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* ========== 🆕 後台管理功能（需驗證） ========== */}
            <Route
              path="/admin/appointments"
              element={
                <AdminRoute>
                  <AdminAppointments />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/garages"
              element={
                <AdminRoute>
                  <AdminGarageSettings />
                </AdminRoute>
              }
            />

            {/* ========== 原有 Admin Routes（B2B 後台） ========== */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="parts" element={<AdminParts />} />
              <Route path="parts/new" element={<AdminPartEdit />} />
              <Route path="parts/:id" element={<AdminPartEdit />} />
              <Route path="compatibility" element={<AdminCompatibility />} />
              <Route path="makes" element={<AdminMakes />} />
              <Route path="vehicles" element={<AdminVehicles />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="brands" element={<AdminBrands />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="shops/review" element={<AdminShopReview />} />
            </Route>

            {/* ========== Fallback ========== */}
            <Route path="*" element={<Navigate to="/shop" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}