import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import "./index.css";

import Shop from "./Shop.jsx";
import Product from "./Product.jsx";
import Checkout from "./Checkout.jsx";

import AdminLayout from "./AdminLayout.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import AdminParts from "./AdminParts.jsx";
import AdminPartEdit from "./AdminPartEdit.jsx";
import AdminCategories from "./AdminCategories.jsx";
import AdminMakes from "./AdminMakes.jsx";
import AdminVehicles from "./AdminVehicles.jsx";
import AdminBrands from "./AdminBrands.jsx"; // ✅ 新增
import AdminUsers from "./AdminUsers.jsx";   // ✅ 新增

import CartDrawer, { getCartCount } from "./CartDrawer.jsx";

function Layout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => getCartCount());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "cart.v1") setCartCount(getCartCount());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <>
      <nav
        style={{
          padding: "10px 14px",
          background: "#eee",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link to="/shop">商店</Link>
        {import.meta.env.DEV && (
          <>
            <Link to="/admin">後台</Link>
            <Link to="/admin/brands">商品品牌</Link>
            <Link to="/admin/vehicles">車型</Link>
            <Link to="/admin/makes">汽車廠牌</Link>
          </>
        )}
        <div style={{ marginLeft: "auto" }} />
        <button
          onClick={() => setDrawerOpen(true)}
          title="開啟購物車"
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: 999,
            padding: "6px 12px",
          }}
        >
          🛒 購物車 {cartCount ? `(${cartCount})` : ""}
        </button>
      </nav>

      {children}

      <CartDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setCartCount(getCartCount());
        }}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* 前台 */}
          <Route path="/" element={<Navigate to="/shop" replace />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/p/:sku" element={<Product by="sku" />} />
          <Route path="/pid/:id" element={<Product by="id" />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* 後台 */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="parts" element={<AdminParts />} />
            <Route path="parts/new" element={<AdminPartEdit mode="create" />} />
            <Route path="parts/:id" element={<AdminPartEdit mode="edit" />} />
            <Route path="makes" element={<AdminMakes />} />
            <Route path="vehicles" element={<AdminVehicles />} />
            <Route path="brands" element={<AdminBrands />} />  {/* ✅ 新增 */}
            <Route path="users" element={<AdminUsers />} />    {/* ✅ 新增 */}
          </Route>

          <Route path="*" element={<Navigate to="/shop" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  </React.StrictMode>
);
