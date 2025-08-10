// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;

/**
 * Middleware de autorização por função
 * @param  {...string} allowedRoles - lista de roles permitidos (ex: 'professor', 'admin')
 */
export default function authorize(...allowedRoles) {
  return (req, res, next) => {
    // O middleware 'protect' deve ter preenchido req.user com { id, role }
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado: permissão insuficiente' });
    }

    next();
  };
}
