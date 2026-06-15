import api from './axios.js';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/* Auth */
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  demo: () => api.post('/auth/demo'),
  me: () => api.get('/auth/me'),
};

/* Customers */
export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
  filterMeta: () => api.get('/customers/meta/filters'),
};

/* Orders */
export const orderApi = {
  list: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  remove: (id) => api.delete(`/orders/${id}`),
  summary: () => api.get('/orders/meta/summary'),
};

/* Segments */
export const segmentApi = {
  list: () => api.get('/segments'),
  getById: (id) => api.get(`/segments/${id}`),
  preview: (ruleGroup) => api.post('/segments/preview', { ruleGroup }),
  create: (data) => api.post('/segments', data),
  update: (id, data) => api.put(`/segments/${id}`, data),
  remove: (id) => api.delete(`/segments/${id}`),
  customers: (id, params) => api.get(`/segments/${id}/customers`, { params }),
};

/* Campaigns */
export const campaignApi = {
  list: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  remove: (id) => api.delete(`/campaigns/${id}`),
  launch: (id) => api.post(`/campaigns/${id}/launch`),
  pause: (id) => api.post(`/campaigns/${id}/pause`),
  communications: (id, params) => api.get(`/campaigns/${id}/communications`, { params }),
};

/* Analytics */
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  recentCampaigns: () => api.get('/analytics/recent-campaigns'),
  recentActivity: () => api.get('/analytics/recent-activity'),
  audienceGrowth: (days) => api.get('/analytics/audience-growth', { params: { days } }),
  deliveryTrend: (days) => api.get('/analytics/delivery-trend', { params: { days } }),
  channelPerformance: () => api.get('/analytics/channel-performance'),
  insights: () => api.get('/analytics/insights'),
};

/* AI */
export const aiApi = {
  audienceFromText: (query) => api.post('/ai/audience', { query }),
  generateMessage: (data) => api.post('/ai/message', data),
  campaignGenerator: (prompt) => api.post('/ai/campaign-generator', { prompt }),
  optimize: (campaignId) => api.get(`/ai/optimize/${campaignId}`),
  agent: (goal) => api.post('/ai/agent', { goal }),
  listConversations: () => api.get('/ai/chat/conversations'),
  getConversation: (id) => api.get(`/ai/chat/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/ai/chat/conversations/${id}`),
  chatSync: (message, conversationId) => api.post('/ai/chat/sync', { message, conversationId }),
};
