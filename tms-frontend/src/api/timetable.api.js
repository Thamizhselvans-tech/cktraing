import api from './axios';

export const getInternalTimetable = (params) => api.get('/timetable/internal', { params });
export const createInternalTimetable = (data) => api.post('/timetable/internal', data);
export const updateInternalTimetable = (id, data) => api.put(`/timetable/internal/${id}`, data);
export const deleteInternalTimetable = (id) => api.delete(`/timetable/internal/${id}`);

export const getExternalTimetable = (params) => api.get('/timetable/external', { params });
export const createExternalTimetable = (data) => api.post('/timetable/external', data);
export const updateExternalTimetable = (id, data) => api.put(`/timetable/external/${id}`, data);
export const deleteExternalTimetable = (id) => api.delete(`/timetable/external/${id}`);

export const getSchedules = (params) => api.get('/schedule', { params });
export const createSchedule = (data) => api.post('/schedule', data);
export const updateSchedule = (id, data) => api.put(`/schedule/${id}`, data);
export const deleteSchedule = (id) => api.delete(`/schedule/${id}`);
