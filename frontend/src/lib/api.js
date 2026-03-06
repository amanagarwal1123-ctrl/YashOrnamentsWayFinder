import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

// ---- Session / Customer ----
export const createSession = (qrCode, deviceInfo = '') =>
  API.post('/sessions/create', { qr_code: qrCode, device_info: deviceInfo });

export const getSession = (sessionId) =>
  API.get(`/sessions/${sessionId}`);

export const updateCustomerInfo = (sessionId, data) =>
  API.put(`/sessions/${sessionId}/customer-info`, data);

export const addSessionEvent = (sessionId, eventType, eventData = {}, checkpointId = '') =>
  API.post(`/sessions/${sessionId}/events`, { event_type: eventType, event_data: eventData, checkpoint_id: checkpointId });

export const getSessionEvents = (sessionId) =>
  API.get(`/sessions/${sessionId}/events`);

export const requestCallback = (sessionId, data) =>
  API.post(`/sessions/${sessionId}/callback`, data);

// ---- Routes ----
export const getRoutes = () => API.get('/routes');
export const getRoute = (routeId) => API.get(`/routes/${routeId}`);
export const getRouteCheckpoints = (routeId) => API.get(`/routes/${routeId}/checkpoints`);
export const getCheckpoint = (cpId) => API.get(`/checkpoints/${cpId}`);

// ---- Gold Rates ----
export const getGoldRates = () => API.get('/gold-rates');

// ---- Gallery ----
export const getGallery = () => API.get('/gallery');

// ---- Business ----
export const getBusinessBySlug = (slug) => API.get(`/businesses/${slug}`);

// ---- Where Am I ----
export const whereAmI = (data) => API.post('/where-am-i', data);

// ---- Auth ----
export const login = (username, otp) => API.post('/auth/login', { username, otp });
export const getMe = (username) => API.get(`/auth/me?username=${username}`);

// ---- Admin ----
export const adminGetSessions = (status, businessId) => {
  let url = `/admin/sessions?status=${status || 'active'}`;
  if (businessId) url += `&business_id=${businessId}`;
  return API.get(url);
};
export const adminGetLiveSessions = () => API.get('/admin/sessions/live');
export const adminGetSessionDetail = (sessionId) => API.get(`/admin/sessions/${sessionId}/detail`);
export const adminTerminateSession = (sessionId, reason) => API.post(`/admin/sessions/${sessionId}/terminate`, { reason });
export const adminGetStats = (businessId) => {
  let url = '/admin/stats';
  if (businessId) url += `?business_id=${businessId}`;
  return API.get(url);
};
export const adminGetRoutes = () => API.get('/admin/routes');
export const adminCreateRoute = (data) => API.post('/admin/routes', data);
export const adminUpdateRoute = (routeId, data) => API.put(`/admin/routes/${routeId}`, data);
export const adminDeleteRoute = (routeId) => API.delete(`/admin/routes/${routeId}`);
export const adminGetCheckpoints = (routeId) => API.get(`/admin/checkpoints?route_id=${routeId}`);
export const adminCreateCheckpoint = (data) => API.post('/admin/checkpoints', data);
export const adminUpdateCheckpoint = (cpId, data) => API.put(`/admin/checkpoints/${cpId}`, data);
export const adminDeleteCheckpoint = (cpId) => API.delete(`/admin/checkpoints/${cpId}`);
export const adminGetUsers = () => API.get('/admin/users');
export const adminCreateUser = (data) => API.post('/admin/users', data);
export const adminToggleUser = (userId) => API.put(`/admin/users/${userId}/toggle-active`);
export const adminGenerateOTP = (userId) => API.post('/admin/otp/generate', { user_id: userId });
export const adminUpdateGoldRates = (data) => API.post('/admin/gold-rates', data);
export const adminGetGallery = () => API.get('/admin/gallery');
export const adminCreateGalleryItem = (data) => API.post('/admin/gallery', data);
export const adminDeleteGalleryItem = (itemId) => API.delete(`/admin/gallery/${itemId}`);
export const adminGetQRSources = () => API.get('/admin/qr-sources');
export const adminCreateQRSource = (data) => API.post('/admin/qr-sources', data);
export const adminGetBusinesses = () => API.get('/admin/businesses');
export const adminGetAnalytics = (businessId, days) => {
  let url = `/admin/analytics?days=${days || 30}`;
  if (businessId) url += `&business_id=${businessId}`;
  return API.get(url);
};
export const adminGetAuditLogs = () => API.get('/admin/audit-logs');

// ---- Helpdesk ----
export const helpdeskGetCases = (status, businessId) => {
  let url = '/helpdesk/cases?';
  if (status) url += `status=${status}&`;
  if (businessId) url += `business_id=${businessId}`;
  return API.get(url);
};
export const helpdeskGetCaseDetail = (caseId) => API.get(`/helpdesk/cases/${caseId}`);
export const helpdeskCaseAction = (caseId, action, note) => API.post(`/helpdesk/cases/${caseId}/action`, { action, note });
export const helpdeskGetCallbacks = (status) => API.get(`/helpdesk/callbacks${status ? `?status=${status}` : ''}`);

// ---- LLM ----
export const llmSuggestCheckpoint = (text, type = 'checkpoint') => API.post('/llm/suggest-checkpoint', { text, type });

// SSE helper
export const createHelpdeskSSE = () => {
  const url = `${BACKEND_URL}/api/helpdesk/notifications/stream`;
  return new EventSource(url);
};
