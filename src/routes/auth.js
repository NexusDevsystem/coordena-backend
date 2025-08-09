// assets/js/auth.js

// Base da API — igual à que funcionava antes
// (já aponta direto para /api/auth e o login usa `${API}/login`)
const Auth = (() => {
  const API = window.location.hostname.includes('localhost')
    ? 'http://localhost:10000/api/auth'
    : 'https://coordena-backend.onrender.com/api/auth';

  // ---- Persistência de sessão (localStorage) ----
  function saveTokenForRole(role, token) {
    localStorage.setItem(`${role}_token`, token);
    localStorage.setItem('current_role', role);
  }
  function getToken(role = localStorage.getItem('current_role') || 'user') {
    return localStorage.getItem(`${role}_token`);
  }
  function clearTokens() {
    ['admin','user','aluno','professor'].forEach(r =>
      localStorage.removeItem(`${r}_token`)
    );
    localStorage.removeItem('current_role');
  }

  // ---- Login (email institucional) ----
  async function login(email, password) {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    // Se der 404 aqui, é porque mudaram a rota no backend.
    if (res.status === 404) {
      throw new Error('Endpoint de login não encontrado (404). Verifique a URL da API.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Falha no login');
    }

    const role = (data.user && data.user.role) || 'user';
    const token = data.token;
    if (!token) throw new Error('Token não retornado pelo servidor.');

    saveTokenForRole(role, token);

    // Redireciona conforme a role
    if (role === 'admin') {
      window.location.href = '/pages/admin.html';
    } else {
      window.location.href = '/index.html';
    }
  }

  // ---- Logout ----
  function logout() {
    clearTokens();
    window.location.href = '/login.html';
  }

  // ---- Helper para requests autenticadas (usa token salvo) ----
  async function authFetch(path, options = {}, role = (localStorage.getItem('current_role') || 'user')) {
    const token = getToken(role);
    if (!token) {
      // sem token: manda pro login
      window.location.href = '/login.html';
      throw new Error('Sessão expirada.');
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };
    const base = API.replace(/\/auth$/,''); // vira .../api
    const res = await fetch(`${base}${path}`, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      // token inválido/expirado
      clearTokens();
      alert('Sem permissão ou token inválido. Faça login novamente.');
      window.location.href = '/login.html';
      throw new Error('unauthorized');
    }
    return res;
  }

  return { API, login, logout, getToken, authFetch };
})();

// Disponibiliza globalmente
window.Auth = Auth;
