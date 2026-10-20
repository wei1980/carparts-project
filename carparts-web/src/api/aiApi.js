// AI 智慧找零件 API — 統一使用 consumerClient（JWT 注入、CSRF、X-Request-Id、401 處理）
import { consumerClient as api } from './client';

// AI 智慧找零件 API
export const aiApi = {
  // 搜尋零件 (文字或圖片)
  searchPart: (data, options = {}) => {
    const formData = new FormData();
    if (data.query) formData.append('query', data.query);
    if (data.customerVehicleId) formData.append('customerVehicleId', data.customerVehicleId);
    if (data.image) formData.append('image', data.image);
    
    return api.post('/ai/search-part', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...options
    });
  },
  
  // 取得草稿列表
  getDrafts: (status = 'pending') => api.get('/ai/drafts', { params: { status } }),
  
  // 取得單一草稿詳情
  getDraft: (id) => api.get(`/ai/drafts/${id}`),
  
  // 更新草稿
  updateDraft: (id, data) => api.patch(`/ai/drafts/${id}`, data),
  
  // 審核通過草稿
  approveDraft: (id) => api.post(`/ai/drafts/${id}/approve`),
  
  // 拒絕草稿
  rejectDraft: (id) => api.post(`/ai/drafts/${id}/reject`),
  
  // 辨識零件圖片
  recognizePart: (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/ai/recognize-part', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 辨識行照
  recognizeRegistration: (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post('/ai/recognize-registration', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 文字搜尋並自動上架
  searchAndImport: (query, vehicleId) => api.post('/ai/search-and-import', { query, vehicleId }),
};

export default aiApi;