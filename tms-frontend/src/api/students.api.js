import api from './axios';

export const getStudents = (params) => api.get('/students', { params });
export const getStudent = (id) => api.get(`/students/${id}`);
export const getStudentsByDept = (deptId, params) => api.get(`/students/department/${deptId}`, { params });
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const uploadStudentsExcel = (formData) =>
  api.post('/students/upload-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
