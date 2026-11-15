// "C:\carparts\carparts-web\src\App.jsx"
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AUTH_EXPIRED_EVENT } from './api/client';
import { CartProvider } from './context/CartContext';
import { CurrentVehicleProvider } from './context/CurrentVehicleContext';
import ErrorBoundary, { PartialErrorBoundary } from './components/ErrorBoundary';
import FloatingFeedbackWidget from './components/FloatingFeedbackWidget';
import { ConfirmDialogHost } from './components/ConfirmDialog';
import Footer from './components/Footer';

// 🆕 路由級 code-splitting：所有頁面改為 lazy 載入
import Login from './pages/Login'; // Login 為首屏入口，保留同步載入
const Garage = lazy(() => import('./pages/Garage'));
const Shop = lazy(() => import('./pages/Shop'));
const BrandDetail = lazy(() => import('./pages/BrandDetail')); // 🆕 品牌介紹頁（Phase 1）
const VehicleDetail = lazy(() => import('./pages/VehicleDetail')); // 🆕 車系/世代介紹頁（Phase 2）
const SeriesDetail = lazy(() => import('./pages/SeriesDetail')); // 🆕 系列/情境內容頁（Phase 3）
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const GarageList = lazy(() => import('./pages/GarageList'));
const GarageProfile = lazy(() => import('./pages/GarageProfile'));
const Booking = lazy(() => import('./pages/Booking'));
const MyAppointments = lazy(() => import('./pages/MyAppointments'));
const ServiceRecords = lazy(() => import('./pages/ServiceRecords'));
const MyCar = lazy(() => import('./pages/MyCar'));          // 🆕 我的愛車
const Wishlist = lazy(() => import('./pages/Wishlist'));    // 🆕 願望清單
const PartDetail = lazy(() => import('./pages/PartDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

// 後台管理頁面
const AdminLayout = lazy(() => import('./pages/admin/Layout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAppointments = lazy(() => import('./pages/admin/AdminAppointments'));
const AdminGarageSettings = lazy(() => import('./pages/admin/AdminGarageSettings'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminVehicleApproval = lazy(() => import('./pages/admin/AdminVehicleApproval'));
const AdminVariantRequests = lazy(() => import('./pages/admin/AdminVariantRequests'));
const AdminAiDrafts = lazy(() => import('./pages/admin/AdminAiDrafts'));
const AdminParts = lazy(() => import('./pages/admin/AdminParts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminBank = lazy(() => import('./pages/admin/AdminBank'));
const AdminProcurement = lazy(() => import('./pages/admin/AdminProcurement')); // 🆕 進貨成本管理
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

// 車廠後台頁面
const GarageLogin = lazy(() => import('./pages/garage/GarageLogin'));
const GarageDashboard = lazy(() => import('./pages/garage/GarageDashboard'));
const GarageWorkOrders = lazy(() => import('./pages/garage/GarageWorkOrders'));
const GarageSettings = lazy(() => import('./pages/garage/GarageSettings'));
const GarageReports = lazy(() => import('./pages/garage/GarageReports'));
const GarageCalendar = lazy(() => import('./pages/garage/GarageCalendar'));
const GarageCustomers = lazy(() => import('./pages/garage/GarageCustomers'));
const GarageAppointmentDetail = lazy(() => import('./pages/garage/GarageAppointmentDetail'));

// 🆕 404 頁面
const NotFound = lazy(() => import('./pages/NotFound'));

// Suspense 載入中畫面
function PageLoading() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-3 border-[3px] border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">載入中…</p>
      </div>
    </div>
  );
}

// 前台驗證（車主）
// 登入後回到原本要去的頁面，而不是一律回首頁。
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

// 🆕 Redirect /garage/new to /my-car with vehicle manager open
function GarageNewRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/my-car', { replace: true, state: { openVehicleManager: true } });
  }, [navigate]);
  return <div className="min-h-screen bg-surface-900 text-white flex items-center justify-center text-xl">導向至我的愛車…</div>;
}

// 後台驗證（管理員）
// 🔒 監聽憑證失效事件：401 時 client.js 只清 localStorage，這裡必須重新 render
//    才能讀到「token 已不存在」並導向登入頁，否則會停在無資料的後台頁。
function useTokenGuard(storageKey) {
  const [token, setToken] = useState(() => localStorage.getItem(storageKey));
  useEffect(() => {
    const sync = () => setToken(localStorage.getItem(storageKey));
    window.addEventListener('storage', sync);
    window.addEventListener(AUTH_EXPIRED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AUTH_EXPIRED_EVENT, sync);
    };
  }, [storageKey]);
  return token;
}

function AdminRoute({ children }) {
  const token = useTokenGuard('adminToken');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

// 車廠驗證
function GarageRoute({ children }) {
  const token = useTokenGuard('garageToken');
  if (!token) return <Navigate to="/garage/login" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CurrentVehicleProvider>
        <CartProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                {/* ========== 前台路由 ========== */}
                {/* 本站採註冊制：首頁／商城需登入；登入後由 PrivateRoute 帶回原頁 */}
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<PrivateRoute><PartialErrorBoundary><Shop /></PartialErrorBoundary></PrivateRoute>} />
                <Route path="/garage/new" element={<PrivateRoute><GarageNewRedirect /></PrivateRoute>} />
                <Route path="/garage/:id" element={<PrivateRoute><Garage /></PrivateRoute>} />
                <Route path="/shop" element={<PrivateRoute><PartialErrorBoundary><Shop /></PartialErrorBoundary></PrivateRoute>} />
                <Route path="/part/:id" element={<PartialErrorBoundary><PartDetail /></PartialErrorBoundary>} />
                <Route path="/brands/:brand" element={<PartialErrorBoundary><BrandDetail /></PartialErrorBoundary>} />
                <Route path="/vehicles/:variantId" element={<PartialErrorBoundary><VehicleDetail /></PartialErrorBoundary>} />
                <Route path="/series/:slug" element={<PartialErrorBoundary><SeriesDetail /></PartialErrorBoundary>} />
                <Route path="/cart" element={<PrivateRoute><PartialErrorBoundary><Cart /></PartialErrorBoundary></PrivateRoute>} />
                <Route path="/checkout" element={<PrivateRoute><PartialErrorBoundary><Checkout /></PartialErrorBoundary></PrivateRoute>} />
                <Route path="/orders" element={<PrivateRoute><PartialErrorBoundary><Orders /></PartialErrorBoundary></PrivateRoute>} />
                <Route path="/garages" element={<GarageList />} />
                <Route path="/garages/:id" element={<PartialErrorBoundary><GarageProfile /></PartialErrorBoundary>} />
                <Route path="/garages/:garageId/book" element={<PrivateRoute><Booking /></PrivateRoute>} />
                <Route path="/appointments" element={<PrivateRoute><MyAppointments /></PrivateRoute>} />
                <Route path="/service-records" element={<PrivateRoute><ServiceRecords /></PrivateRoute>} />
                <Route path="/my-car" element={<PrivateRoute><MyCar /></PrivateRoute>} />
                <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />

                {/* ========== 車廠後台路由 ========== */}
                <Route path="/garage/login" element={<GarageLogin />} />
                <Route path="/garage/dashboard" element={<GarageRoute><GarageDashboard /></GarageRoute>} />
                <Route path="/garage/calendar" element={<GarageRoute><GarageCalendar /></GarageRoute>} />
                <Route path="/garage/customers" element={<GarageRoute><GarageCustomers /></GarageRoute>} />
                <Route path="/garage/appointments/:id" element={<GarageRoute><GarageAppointmentDetail /></GarageRoute>} />
                <Route path="/garage/work-orders" element={<GarageRoute><GarageWorkOrders /></GarageRoute>} />
                <Route path="/garage/settings" element={<GarageRoute><GarageSettings /></GarageRoute>} />
                <Route path="/garage/reports" element={<GarageRoute><GarageReports /></GarageRoute>} />

                {/* ========== 管理員後台路由 ========== */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="appointments" element={<AdminAppointments />} />
                  <Route path="garages" element={<AdminGarageSettings />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="bank" element={<AdminBank />} />
                  <Route path="procurement" element={<AdminProcurement />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="vehicle-approval" element={<AdminVehicleApproval />} />
                  <Route path="variant-requests" element={<AdminVariantRequests />} />
                  <Route path="ai-drafts" element={<AdminAiDrafts />} />
                  <Route path="parts" element={<AdminParts />} />   {/* ✅ 商品管理已移入巢狀路由 */}
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="categories" element={<AdminCategories />} />
                </Route>

                {/* ========== 404 ========== */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* 全站常駐：右下角客服與意見回報懸浮按鈕 */}
              <FloatingFeedbackWidget />
          <ConfirmDialogHost />
              {/* 全站常駐：Footer（公司資訊／客服／政策） */}
              <Footer />
            </Suspense>
          </BrowserRouter>
        </CartProvider>
        </CurrentVehicleProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
