import api from './axios';

export const getAttendance = (params) => api.get('/attendance', { params });
export const getStudentAttendance = (studentId, params) => api.get(`/attendance/student/${studentId}`, { params });
export const getDepartmentAttendance = (deptId, params) => api.get(`/attendance/department/${deptId}`, { params });
export const markAttendance = (data) => api.post('/attendance', data);
export const bulkMarkAttendance = (data) => api.post('/attendance/bulk', data);
export const unlockAttendance = (id) => api.post(`/attendance/${id}/unlock`);
