// "C:\carparts\carparts-web\src\pages\admin\AdminLogin.jsx"
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [phone, setPhone] = useState('');    // 🆕 改成 phone
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/auth/admin/login', { phone, password });
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      navigate('/admin/appointments');
    } catch (err) {
      toast.error(err.response?.data?.error || '登入失敗，請確認手機號碼或密碼');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl w-96">
        <h1 className="text-2xl font-bold text-white mb-6">🔧 車大師後台</h1>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="手機號碼"
          className="w-full p-3 mb-4 rounded bg-gray-700 text-white"
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="密碼"
          className="w-full p-3 mb-6 rounded bg-gray-700 text-white"
        />
        <button type="submit" className="w-full bg-blue-600 p-3 rounded font-bold text-white">
          登入後台
        </button>
      </form>
    </div>
  );
}