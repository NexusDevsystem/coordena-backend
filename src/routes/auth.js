const Auth = (() => {
    const API = window.location.hostname.includes('localhost')
      ? 'http://localhost:10000/api/auth'
      : 'https://coordena-backend.onrender.com/api/auth'
  
    function saveToken(token)         { localStorage.setItem('token', token) }
    function getToken()               { return localStorage.getItem('token') }
    function logout()                { localStorage.removeItem('token'); window.location = 'login.html' }
    function getCurrentUser() { /* decodifica payload */ }
  
    async function register(data) {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error((await res.json()).message)
      const { token } = await res.json()
      saveToken(token)
      return token
    }
  
    async function login(email, password) {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      })
      if (!res.ok) throw new Error((await res.json()).message)
      const { token } = await res.json()
      saveToken(token)
      return token
    }
  
    return { register, login, logout, getToken, getCurrentUser }
  })()
  window.Auth = Auth
  