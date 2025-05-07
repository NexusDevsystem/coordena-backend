const API_URL = 'https://coordena-backend.onrender.com/api/auth';

async function login(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',   // ← ESSENCIAL
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Credenciais inválidas');
  }

  localStorage.setItem('token', data.token);
  return data;
}

async function register({ name, email, password, role }) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password, role })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao registrar');
  }

  localStorage.setItem('token', data.token);
  return data;
}

export const Auth = { login, register };
