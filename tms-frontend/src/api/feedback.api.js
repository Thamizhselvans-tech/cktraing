import api from './axios';

export const getAllFeedback = (params) => api.get('/feedback', { params });
export const getMyFeedback = () => api.get('/feedback/my');
export const submitFeedback = (data) => api.post('/feedback', data);
export const editFeedback = (id, data) => api.put(`/feedback/${id}`, data);
export const deleteFeedback = (id) => api.delete(`/feedback/${id}`);
export const reviewFeedback = (id) => api.put(`/feedback/${id}/review`);
