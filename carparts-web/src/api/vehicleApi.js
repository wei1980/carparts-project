import { consumerClient as api } from './client';

// 車型篩選 API
export const vehicleApi = {
  getMakes: (year) => api.get('/vehicles/makes', { params: { year } }),
  getModels: (make, year) => api.get('/vehicles/models', { params: { make, year } }),
  getYears: (make) => api.get('/vehicles/years', { params: { make } }),
  getEngines: (make, model, year) => api.get('/vehicles/engines', { params: { make, model, year } }),
  getVariants: (make, model, year) => api.get('/vehicles/variants', { params: { make, model, year } }),
  getBrands: () => api.get('/vehicles/brands'),
};

export const vehicleManagementApi = {
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

export const partsApi = {
  recommended: (params) => api.get('/consumer/parts/recommended', { params }),
  getById: (id) => api.get(`/parts/${id}`),
  search: (params) => api.get('/parts/recommended', { params }),
  getCompatibility: (id) => api.get(`/parts/${id}/compatibility`),
};

export const orderApi = {
  create: (data) => api.post('/consumer/orders', data),
  getAll: () => api.get('/consumer/orders'),
  getById: (id) => api.get(`/consumer/orders/${id}`),
};

export const myCarApi = {
  dashboard: () => api.get('/my-car/dashboard'),
  setCurrentVehicle: (vehicleId) => api.patch('/my-car/current-vehicle', { vehicleId }),
};

export const wishlistApi = {
  list: () => api.get('/wishlist'),
  add: (data) => api.post('/wishlist', data),
  update: (id, data) => api.patch(`/wishlist/${id}`, data),
  remove: (id) => api.delete(`/wishlist/${id}`),
};

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  sendCode: (data) => api.post('/auth/send-code', data),
  verifyCode: (data) => api.post('/auth/verify-code', data),
};

export default api;
