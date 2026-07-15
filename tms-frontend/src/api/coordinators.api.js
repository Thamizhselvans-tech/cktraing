import api from './axios';

export const getCoordinators = (params) => api.get('/coordinators', { params });
export const getCoordinator = (id) => api.get(`/coordinators/${id}`);
export const createCoordinator = (data) => api.post('/coordinators', data);
export const updateCoordinator = (id, data) => api.put(`/coordinators/${id}`, data);
export const deleteCoordinator = (id) => api.delete(`/coordinators/${id}`);
