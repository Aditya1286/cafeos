const API_BASE_URL = '/api/v1';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('cafeos_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('cafeos_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('cafeos_token');
};

export const apiRequest = async (
  endpoint: string,
  method: string = 'GET',
  body?: any,
  customHeaders: Record<string, string> = {}
) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'An error occurred during request execution.');
  }

  return data;
};
