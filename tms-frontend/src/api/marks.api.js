import api from './axios';

export const getAllMarks = (params) => api.get('/marks', { params });
export const getStudentMarks = (studentId) => api.get(`/marks/student/${studentId}`);
export const getDepartmentMarks = (deptId, params) => api.get(`/marks/department/${deptId}`, { params });
export const createOrUpdateMarks = (data) => api.post('/marks', data);
export const verifyMarks = (id) => api.post(`/marks/${id}/verify`);
export const unlockMarks = (id) => api.post(`/marks/${id}/unlock`);
