// src/pages/admin/AdminUsers.jsx
import { useEffect, useState } from 'react';
import { adminClient } from '../../api/client';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ConfirmDialog';

const statusMap = {
  PENDING_PAYMENT: '待付款',
  PAYMENT_REVIEW: '待查核',
  PAID: '已付款',
  SHIPPED: '已出貨',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', lineId: '', address: '', password: '' });

  const [viewingVehicles, setViewingVehicles] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ make: '', model: '', generation: '', year: '', engine: '', licensePlate: '', vin: '' });

  const [viewingOrders, setViewingOrders] = useState(null);
  const [orders, setOrders] = useState([]);
  // 載入失敗必須顯示（原本只 console.warn → 使用者看到「沒有會員資料」＝誤導）
  const [loadError, setLoadError] = useState('');

  useEffect(() => { loadUsers(); }, [filter]);

  const loadUsers = () => {
    setLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    setLoadError('');
    adminClient.get(`/users${params}`)
      .then(res => setUsers(res.data))
      .catch(err => {
        console.warn('載入失敗:', err?.message || err);
        setLoadError(err?.response?.data?.error || err?.friendlyMessage || '載入會員資料失敗，請稍後再試');
        setUsers([]);
      })
      .finally(() => setLoading(false));
  };

  const approve = async (id) => {
    await adminClient.patch(`/users/${id}`, { is_approved: true, is_active: true });
    loadUsers();
  };

  const blockUser = async (id, name) => {
    if (!(await confirmDialog({ message: `確定要封鎖「${name || '未命名'}」嗎？封鎖後將無法登入。` }))) return;
    try {
      await adminClient.patch(`/users/${id}`, { 
        is_approved: false, 
        is_active: false 
      });
      toast.success('已封鎖');
      loadUsers();
    } catch (err) {
      toast.error('操作失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const unblockUser = async (id, name) => {
    if (!(await confirmDialog({ message: `確定要解封「${name || '未命名'}」嗎？` }))) return;
    try {
      await adminClient.patch(`/users/${id}`, { 
        is_approved: true, 
        is_active: true 
      });
      toast.success('已解封');
      loadUsers();
    } catch (err) {
      toast.error('操作失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const startEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      lineId: user.lineId || '',
      address: user.address || '',
      password: '',
    });
  };

  const saveEdit = async () => {
    try {
      await adminClient.patch(`/users/${editingUser}`, editForm);
      toast.success('會員資料已更新');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      toast.error('更新失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const viewVehicles = async (userId) => {
    setViewingVehicles(userId);
    setViewingOrders(null);
    const { data } = await adminClient.get(`/users/${userId}/vehicles`);
    setVehicles(data);
  };

  const startEditVehicle = (v) => {
    setEditingVehicle(v.id);
    setVehicleForm({
      make: v.make || '', model: v.model || '', generation: v.generation || '',
      year: v.year || '', engine: v.engine || '', licensePlate: v.licensePlate || '', vin: v.vin || '',
    });
  };

  const saveVehicle = async () => {
    try {
      await adminClient.patch(`/vehicles/${editingVehicle}`, vehicleForm);
      toast.success('車輛資料已更新');
      setEditingVehicle(null);
      viewVehicles(viewingVehicles);
    } catch (err) {
      toast.error('更新失敗：' + (err.response?.data?.error || err.message));
    }
  };

  const viewOrders = async (userId) => {
    setViewingOrders(userId);
    setViewingVehicles(null);
    const { data } = await adminClient.get(`/users/${userId}/orders`);
    setOrders(data);
  };

  const filters = [
    { key: 'pending', label: '待審核' },
    { key: 'approved', label: '已通過' },
    { key: 'blocked', label: '已封鎖' },
    { key: 'all', label: '全部' },
  ];

  if (loading) return <div className="p-8 text-surface-400">載入中...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">👤 會員管理</h1>

      <div className="flex gap-4 mb-6">
        {filters.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`px-4 py-2 rounded ${filter === s.key ? 'bg-blue-600' : 'bg-surface-700'} text-white`}>
            {s.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div role="alert" className="mb-4 p-4 rounded-lg border border-red-800 bg-red-950/40 flex items-center gap-3">
          <span className="text-red-300 text-sm">{loadError}</span>
          <button
            onClick={() => loadUsers()}
            className="ml-auto bg-red-700 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded"
          >重新載入</button>
        </div>
      ) : null}

      {users.length === 0 ? (
        <p className="text-surface-400">沒有會員資料</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map(user => (
            <div key={user.id} className="bg-surface-800 p-6 rounded-xl">
              {editingUser === user.id ? (
                <div className="space-y-3">
                  <h3 className="font-bold text-white">編輯會員</h3>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">姓名</label>
                    <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">手機</label>
                    <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">LINE ID</label>
                    <input value={editForm.lineId} onChange={e => setEditForm({ ...editForm, lineId: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">收件地址</label>
                    <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full p-2 rounded bg-surface-700 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-1">新密碼（留空不修改）</label>
                    <input value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} type="password" className="w-full p-2 rounded bg-surface-700 text-white" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="bg-green-600 px-3 py-1 rounded text-white text-sm">儲存</button>
                    <button onClick={() => setEditingUser(null)} className="bg-surface-600 px-3 py-1 rounded text-white text-sm">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-white">
                    {user.name || '未命名'}
                    {!user.is_active ? (
                      <span className="ml-2 text-xs bg-red-600 px-2 py-1 rounded">已封鎖</span>
                    ) : !user.is_approved ? (
                      <span className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded">待審核</span>
                    ) : (
                      <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded">已通過</span>
                    )}
                  </h3>
                  <p className="text-surface-400 mt-1">📱 {user.phone}</p>
                  <p className="text-surface-500">💬 LINE: {user.lineId || '未綁定'}</p>
                  <p className="text-surface-500 text-sm">📍 {user.address || '無地址'}</p>
                  <div className="flex gap-4 mt-3 text-sm text-surface-400">
                    <span>🚗 {user._count?.vehicles || 0} 輛車</span>
                    <span>📦 {user._count?.orders || 0} 筆訂單</span>
                  </div>
                  <p className="text-surface-500 text-xs mt-2">註冊：{new Date(user.createdAt).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {!user.is_approved && user.is_active && (
                      <button onClick={() => approve(user.id)} className="bg-green-600 px-3 py-1 rounded text-white text-sm">通過</button>
                    )}
                    <button onClick={() => startEdit(user)} className="bg-blue-600 px-3 py-1 rounded text-white text-sm">編輯</button>
                    <button onClick={() => viewVehicles(user.id)} className="bg-yellow-600 px-3 py-1 rounded text-white text-sm">車輛</button>
                    <button onClick={() => viewOrders(user.id)} className="bg-purple-600 px-3 py-1 rounded text-white text-sm">訂單</button>
                    {user.is_active ? (
                      <button onClick={() => blockUser(user.id, user.name)} className="bg-red-600 px-3 py-1 rounded text-white text-sm">封鎖</button>
                    ) : (
                      <button onClick={() => unblockUser(user.id, user.name)} className="bg-green-600 px-3 py-1 rounded text-white text-sm">解封</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 車輛列表彈窗 */}
      {viewingVehicles && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-800 p-6 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">🚗 客戶車輛</h2>
              <button onClick={() => { setViewingVehicles(null); setEditingVehicle(null); }} className="text-surface-400 hover:text-white text-xl">✕</button>
            </div>
            {vehicles.length === 0 ? (
              <p className="text-surface-400">尚無車輛</p>
            ) : (
              <div className="space-y-4">
                {vehicles.map(v => (
                  <div key={v.id} className="bg-surface-700 p-4 rounded">
                    {editingVehicle === v.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={vehicleForm.make} onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })} placeholder="品牌" className="p-2 rounded bg-surface-600 text-white" />
                          <input value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="車系" className="p-2 rounded bg-surface-600 text-white" />
                          <input value={vehicleForm.generation} onChange={e => setVehicleForm({ ...vehicleForm, generation: e.target.value })} placeholder="世代" className="p-2 rounded bg-surface-600 text-white" />
                          <input value={vehicleForm.year} onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })} placeholder="年份" className="p-2 rounded bg-surface-600 text-white" />
                          <input value={vehicleForm.engine} onChange={e => setVehicleForm({ ...vehicleForm, engine: e.target.value })} placeholder="引擎" className="p-2 rounded bg-surface-600 text-white" />
                          <input value={vehicleForm.licensePlate} onChange={e => setVehicleForm({ ...vehicleForm, licensePlate: e.target.value })} placeholder="車牌" className="p-2 rounded bg-surface-600 text-white" />
                          <input value={vehicleForm.vin} onChange={e => setVehicleForm({ ...vehicleForm, vin: e.target.value })} placeholder="VIN" className="p-2 rounded bg-surface-600 text-white col-span-2" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveVehicle} className="bg-green-600 px-3 py-1 rounded text-white text-sm">儲存</button>
                          <button onClick={() => setEditingVehicle(null)} className="bg-surface-600 px-3 py-1 rounded text-white text-sm">取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">{v.make} {v.model} {v.generation}</p>
                          <p className="text-surface-400 text-sm">{v.year} | {v.engine} | {v.licensePlate || '無車牌'}</p>
                          <p className="text-surface-500 text-xs">VIN: {v.vin || '無'}</p>
                        </div>
                        <button onClick={() => startEditVehicle(v)} className="bg-blue-600 px-3 py-1 rounded text-white text-sm">編輯</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 訂單列表彈窗 */}
      {viewingOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-800 p-6 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">📦 客戶訂單</h2>
              <button onClick={() => setViewingOrders(null)} className="text-surface-400 hover:text-white text-xl">✕</button>
            </div>
            {orders.length === 0 ? (
              <p className="text-surface-400">尚無訂單</p>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-surface-700 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white font-mono">{order.order_number}</p>
                        <p className="text-green-400 font-bold mt-1">NT$ {Number(order.total_amount).toLocaleString()}</p>
                        <p className="text-surface-400 text-sm mt-1">{statusMap[order.status] || order.status}</p>
                        <p className="text-surface-500 text-xs">地址：{order.shipping_address || '無'}</p>
                        <p className="text-surface-500 text-xs">日期：{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`text-sm font-bold ${
                        order.status === 'COMPLETED' ? 'text-green-400' :
                        order.status === 'CANCELLED' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {statusMap[order.status] || order.status}
                      </span>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 border-t border-surface-600 pt-3">
                        <p className="text-sm text-surface-400 mb-2">訂單明細：</p>
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm text-surface-300 py-1">
                            <span>{item.name_snapshot} x {item.qty}</span>
                            <span>NT$ {Number(item.price_snapshot).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}