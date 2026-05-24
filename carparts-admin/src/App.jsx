import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

// Public pages
const Shop = lazy(() => import("./Shop.jsx"));
const Product = lazy(() => import("./Product.jsx"));
const Checkout = lazy(() => import("./Checkout.jsx"));

// Admin pages
const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard.jsx"));
const AdminParts = lazy(() => import("./admin/AdminParts.jsx"));
const AdminPartEdit = lazy(() => import("./admin/AdminPartEdit.jsx"));
const AdminCompatibility = lazy(() => import("./admin/AdminCompatibility.jsx")); // ✅ Added

// Placeholder pages
const AdminMakes = lazy(() => import("./admin/AdminDashboard.jsx")); 
const AdminVehicles = lazy(() => import("./admin/AdminDashboard.jsx")); 
const AdminBrands = lazy(() => import("./admin/AdminDashboard.jsx")); 
const AdminUsers = lazy(() => import("./admin/AdminDashboard.jsx")); 
const AdminShopReview = lazy(() => import("./admin/AdminShopReview.jsx")); 
const AdminCategories = lazy(() => import("./admin/AdminDashboard.jsx"));

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("ErrorBoundary caught:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 20, color: "red" }}>
          <h2>前端發生錯誤</h2>
          <pre>{String(this.state.err)}</pre>
          <button onClick={() => window.location.href='/'}>回首頁</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="p-10 text-center">載入中...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/shop" replace />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/p/:sku" element={<Product />} />
            <Route path="/checkout" element={<Checkout />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="parts" element={<AdminParts />} />
              <Route path="parts/new" element={<AdminPartEdit />} />
              <Route path="parts/:id" element={<AdminPartEdit />} />
              
              {/* ✅ New Route */}
              <Route path="compatibility" element={<AdminCompatibility />} />

              <Route path="makes" element={<AdminMakes />} />
              <Route path="vehicles" element={<AdminVehicles />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="brands" element={<AdminBrands />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="shops/review" element={<AdminShopReview />} />
            </Route>

            <Route path="*" element={<Navigate to="/shop" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}