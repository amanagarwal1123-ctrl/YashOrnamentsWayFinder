import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
export const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('nav_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 responses (expired token)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/helpdesk'))) {
      localStorage.removeItem('nav_token');
      localStorage.removeItem('nav_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

// Location consent + updates
export const updateLocationConsent = (sessionId, granted) =>
  API.post(`/sessions/${sessionId}/location-consent`, { granted });

export const updateLocation = (sessionId, lat, lng, locationText = '') =>
  API.post(`/sessions/${sessionId}/location-update`, { lat, lng, location_text: locationText });

// Route selection with distance
export const selectRoute = (sessionId, routeId) =>
  API.post(`/sessions/${sessionId}/select-route`, { route_id: routeId });

// Session recovery
export const getRecoveryCandidates = (sessionId) =>
  API.get(`/sessions/${sessionId}/recovery-candidates`);

export const recoverSession = (sessionId, checkpointId) =>
  API.post(`/sessions/${sessionId}/recover`, { checkpoint_id: checkpointId });

// Assist events (WhatsApp/call)
export const logAssistEvent = (sessionId, eventType, eventData = {}) =>
  API.post(`/sessions/${sessionId}/assist-event`, { event_type: eventType, event_data: eventData });

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
export const getMe = () => API.get('/auth/me');

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
export const adminReorderCheckpoints = (order) => API.post('/admin/checkpoints/reorder', { order });
export const adminDuplicateCheckpoint = (cpId) => API.post(`/admin/checkpoints/${cpId}/duplicate`);
export const adminDuplicateRoute = (routeId) => API.post(`/admin/routes/${routeId}/duplicate`);
export const adminExportRoute = (routeId) => API.get(`/admin/routes/${routeId}/export`);
export const adminImportRoute = (data) => API.post('/admin/routes/import', data);
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
export const adminGetEnhancedStats = (businessId) => {
  let url = '/admin/stats/enhanced';
  if (businessId) url += `?business_id=${businessId}`;
  return API.get(url);
};
export const adminGetReportSessions = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, v); });
  return API.get(`/admin/reports/sessions?${q.toString()}`);
};
export const adminExportReport = (format = 'csv', params = {}) => {
  const q = new URLSearchParams({ format });
  Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, v); });
  return API.get(`/admin/reports/export?${q.toString()}`, { responseType: 'blob' });
};
export const adminGetUserPerformance = (userId) => API.get(`/admin/users/${userId}/performance`);

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
export const helpdeskGetLiveCustomers = () => API.get('/helpdesk/live-customers');
export const helpdeskGetRecentCompleted = () => API.get('/helpdesk/recent-completed');
export const helpdeskClaimSession = (sessionId) => API.post(`/helpdesk/sessions/${sessionId}/claim`);
export const helpdeskUnclaimSession = (sessionId) => API.post(`/helpdesk/sessions/${sessionId}/unclaim`);

// ---- LLM ----
export const llmSuggestCheckpoint = (text, type = 'checkpoint') => API.post('/llm/suggest-checkpoint', { text, type });

// SSE helper - passes JWT via query param since EventSource can't use headers
export const createHelpdeskSSE = () => {
  const token = localStorage.getItem('nav_token');
  const url = `${BACKEND_URL}/api/helpdesk/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  return new EventSource(url);
};

// ---- Media ----
export const uploadMedia = (formData) => API.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const uploadVisitingCard = (formData) => API.post('/public/upload-card', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const serveMediaUrl = (mediaId) => `${BACKEND_URL}/api/media/${mediaId}/serve`;
export const placeholderMediaUrl = (label) => `${BACKEND_URL}/api/media/placeholder/${encodeURIComponent(label)}`;
export const adminGetMedia = (params = {}) => {
  const q = new URLSearchParams();
  if (params.media_type) q.append('media_type', params.media_type);
  if (params.route_id) q.append('route_id', params.route_id);
  if (params.checkpoint_id) q.append('checkpoint_id', params.checkpoint_id);
  if (params.search) q.append('search', params.search);
  return API.get(`/admin/media?${q.toString()}`);
};
export const adminDeleteMedia = (mediaId) => API.delete(`/admin/media/${mediaId}`);

// ---- Branding ----
export const getBranding = () => API.get('/branding');
export const adminGetBranding = () => API.get('/admin/branding');
export const adminUpdateBranding = (data) => API.put('/admin/branding', data);

// ---- QR Generation ----
export const adminGenerateQR = (data) => API.post('/admin/qr/generate', data);
export const adminGetQRImageUrl = (qrCode) => `${BACKEND_URL}/api/admin/qr/${qrCode}/image`;

// ---- QR Scan (customer flow) ----
export const getQRInfo = (qrCode) => API.get(`/scan/${qrCode}/info`);
export const registerFromScan = (qrCode, data) => API.post(`/scan/${qrCode}/register`, data);

// ---- Schematic Map ----
export const getSchematicMap = () => API.get('/map/schematic');

// ---- End ----

