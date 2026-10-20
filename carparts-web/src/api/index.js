import { consumerClient as api } from './client';

// 會員
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// 車輛
export const vehicleAPI = {
  create: (data) => api.post('/vehicles', data),
  getAll: () => api.get('/vehicles'),
  getById: (id) => api.get(`/vehicles/${id}`),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  updateMods: (id, mods) => api.patch(`/vehicles/${id}/modifications`, { modifications: mods }),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getModifications: (id) => api.get(`/vehicles/${id}/modifications`),
  addModification: (id, data) => api.post(`/vehicles/${id}/modifications`, data),
  deleteModification: (id, modId) => api.delete(`/vehicles/${id}/modifications/${modId}`),
  getModificationParts: (id, params) => api.get(`/vehicles/${id}/modification-parts`, { params }),
};

// 零件推薦
export const partsAPI = {
  recommended: (params) => api.get('/consumer/parts/recommended', { params }),
  recommendedPublic: (params) => api.get('/parts/recommended', { params }),
  getCompatibility: (partId) => api.get(`/parts/${partId}/compatibility`),
};

export const createOrder = (data) => api.post('/consumer/orders', data);
export const getOrders = () => api.get('/consumer/orders');

// 我的愛車
export const myCarAPI = {
  dashboard: () => api.get('/my-car/dashboard'),
  updateMileage: (vehicleId, data) => api.patch(`/my-car/vehicles/${vehicleId}/mileage`, data),
  setCurrentVehicle: (vehicleId) => api.patch('/my-car/current-vehicle', { vehicleId }),
  syncFromGarage: (vehicleId, data) => api.post(`/vehicles/${vehicleId}/sync-from-garage`, data),
};

export const wishlistAPI = {
  list: () => api.get('/wishlist'),
  add: (data) => api.post('/wishlist', data),
  update: (id, data) => api.patch(`/wishlist/${id}`, data),
  remove: (id) => api.delete(`/wishlist/${id}`),
};

export default api;
