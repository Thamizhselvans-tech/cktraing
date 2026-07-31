import api from './axios';

export const getDashboard = () => api.get('/analytics/dashboard');
export const getAttendanceTrend = (params) => api.get('/analytics/attendance-trend', { params });
export const getDepartmentPerformance = () => api.get('/analytics/department-performance');
export const getMarksAnalysis = () => api.get('/analytics/marks-analysis');
export const getFeedbackAnalysis = () => api.get('/analytics/feedback-analysis');

export const getAttendanceReport = (params) => api.get('/reports/attendance', { params });
export const getMarksReport = (params) => api.get('/reports/marks', { params });
export const getFeedbackReport = (params) => api.get('/reports/feedback', { params });
export const getDepartmentReport = () => api.get('/reports/department');

export const downloadAttendanceReport = (params) =>
  api.get('/reports/attendance/download', { params, responseType: 'blob' });
export const downloadMarksReport = (params) =>
  api.get('/reports/marks/download', { params, responseType: 'blob' });

export const sendAttendanceToPrincipal = (data) => api.post('/reports/send-principal', data);

export const getAuditLogs = (params) => api.get('/audit-logs', { params });
