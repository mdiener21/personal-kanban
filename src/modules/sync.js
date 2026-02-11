const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let authToken = localStorage.getItem('kanbanAuthToken');

export function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('kanbanAuthToken', token);
  } else {
    localStorage.removeItem('kanbanAuthToken');
  }
}

export function getToken() {
  return authToken;
}

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    setToken(null);
    window.dispatchEvent(new CustomEvent('auth-changed'));
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function loginWithProvider(provider) {
  window.location.href = `${API_URL}/auth/${provider}/login`;
}

export async function getUserInfo() {
  if (!authToken) return null;
  try {
    return await apiFetch('/auth/me');
  } catch (err) {
    console.error('Failed to get user info', err);
    return null;
  }
}

export async function syncData(payload) {
  return await apiFetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchBoards() {
  return await apiFetch('/api/boards');
}

export async function fetchFullBoard(boardId) {
  return await apiFetch(`/api/boards/${boardId}`);
}
