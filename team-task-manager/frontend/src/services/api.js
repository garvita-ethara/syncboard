import { API_BASE } from '../constants';

export async function apiRequest(path, { token, method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (_networkError) {
    const error = new Error('Cannot connect to server. Ensure backend is running and frontend proxy is configured.');
    error.status = 0;
    throw error;
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.details = payload?.details;
    throw error;
  }
  return payload;
}
