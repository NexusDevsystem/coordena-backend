// backend/src/middleware/authorize.js

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
