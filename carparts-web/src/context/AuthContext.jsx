// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { consumerClient as api, AUTH_EXPIRED_EVENT } from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.warn('解析使用者資料失敗，已清除無效的登入資訊');
      }
    }
    setLoading(false);
  }, []);

  // 🔒 憑證失效（401）：client.js 已清掉 localStorage，這裡同步 React state，
  //    否則 PrivateRoute 仍會放行，使用者停在空白頁面而不被導向登入頁。
  useEffect(() => {
    const onExpired = (e) => {
      if (e.detail?.tokenStorageKey && e.detail.tokenStorageKey !== 'token') return;
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = async (phone, password) => {
    const { data } = await api.post('/auth/login', { phone, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // 新增 updateUser 函數 - 同時更新 state 和 localStorage
  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);