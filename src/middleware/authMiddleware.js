// backend/src/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Verifica se o header Authorization contém um token válido.
 * Se válido, busca o usuário no banco (sem a senha) e anexa em req.user.
 * Caso contrário, retorna erro 401.
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', expired: true });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Token inválido', invalid: true });
      }
      return res.status(403).json({ error: 'Erro na verificação do token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Garante que o usuário (já autenticado em req.user) tenha role "admin".
 * Retorna 401 se não houver req.user ou 403 se não for admin.
 */
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permissão negada. Somente admin.' });
  }
  return next();
};
