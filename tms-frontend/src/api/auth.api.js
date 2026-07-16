import api from './axios';

export const adminLogin = (data) => api.post('/auth/admin/login', data);
export const coordinatorLogin = (data) => api.post('/auth/coordinator/login', data);
export const studentLogin = (data) => api.post('/auth/student/login', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const changePassword = (data) => api.post('/auth/change-password', data);
export const resetStudentPassword = (studentId) => api.post(`/auth/reset-password/${studentId}`);
export const skipChangePassword = () => api.post('/auth/skip-change-password');
