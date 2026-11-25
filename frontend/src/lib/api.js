const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('us_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const response = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
