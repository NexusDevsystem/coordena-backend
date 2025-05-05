// assets/js/auth.js
const Auth = (() => {
    const API = window.location.hostname.includes('localhost')
      ? 'http://localhost:10000/api/auth'
      : 'https://coordena-backend.onrender.com/api/auth';
  
    function saveToken(token) {
      localStorage.setItem('token', token);
    }
  
    function getToken() {
      return localStorage.getItem('token');
    }
  
    function logout() {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  
    function getCurrentUser() {
      const token = getToken();
      if (!token) return null;
      try {
        const [, payload] = token.split('.');
        const decoded = JSON.parse(atob(payload));
        // Se existir exp e estiver expirado, desloga
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          logout();
          return null;
        }
        return decoded;
      } catch (err) {
        console.error('Erro ao decodificar token:', err);
        return null;
      }
    }
  
    async function register(data) {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Erro no cadastro');
      saveToken(body.token);
      return body.token;
    }
  
    async function login(email, password) {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Erro no login');
      saveToken(body.token);
      return body.token;
    }
  
    return { register, login, logout, getToken, getCurrentUser };
  })();
  
  window.Auth = Auth;
  