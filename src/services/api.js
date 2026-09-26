import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api' });
api.interceptors.request.use((config) => { const token = localStorage.getItem('med2sync_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((response) => response, (error) => Promise.reject({ message: error.response?.data?.message || 'We could not complete that request. Please try again.', status: error.response?.status }));
export default api;
