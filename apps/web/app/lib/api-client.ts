import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      // Redirect to login or handle unauth
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export async function apiGet<T>(url: string, params?: any): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params });
  return data;
}

export async function apiPost<T>(url: string, payload: any): Promise<T> {
  const { data } = await apiClient.post<T>(url, payload);
  return data;
}

export async function apiPut<T>(url: string, payload: any): Promise<T> {
  const { data } = await apiClient.put<T>(url, payload);
  return data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<T>(url);
  return data;
}
