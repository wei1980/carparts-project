// src/utils/auth.js — 認證 helper
// 取得目前登入 JWT token（localStorage）
export const getToken = () => localStorage.getItem('token');
